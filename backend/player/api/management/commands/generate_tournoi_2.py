from django.core.management.base import BaseCommand
import random
from api.models import Player, Tournament, PlayerTournament, Match, PlayerMatch
from django.db import transaction

class Command(BaseCommand):
    help = 'Crée un tournoi et y assigne des joueurs (minimum 8 requis) avec option pour démarrer directement en finale ou demi-finale'

    def add_arguments(self, parser):
        parser.add_argument('--players', type=int, default=8, help='Nombre de joueurs à créer et ajouter (minimum 8)')
        parser.add_argument('--name', type=str, help='Nom du tournoi')
        parser.add_argument('--use-existing', action='store_true', help='Utiliser des joueurs existants si possible')
        parser.add_argument('--start-stage', type=str, choices=['final', 'semi'], 
                          help='Démarrer directement en finale (final) ou demi-finale (semi)')

    def handle(self, *args, **options):
        # Nombre de joueurs à créer (minimum 8)
        player_count = max(8, options['players'])
        # Nom du tournoi
        tournament_name = options['name'] or f"Tournoi {random.randint(1000, 9999)}"
        # Utiliser des joueurs existants si demandé
        use_existing = options.get('use_existing', False)
        # Stage de départ
        start_stage = options.get('start_stage')
        
        self.stdout.write(self.style.SUCCESS(f'Création du tournoi "{tournament_name}" avec {player_count} joueurs...'))
        
        players_to_assign = []
        
        with transaction.atomic():
            # 1. Vérifier s'il y a des joueurs existants à utiliser
            existing_players = []
            if use_existing:
                existing_players = list(Player.objects.all()[:player_count])
                self.stdout.write(self.style.SUCCESS(f'Utilisation de {len(existing_players)} joueurs existants'))
            
            # 2. Déterminer combien de joueurs restent à créer
            players_to_create = player_count - len(existing_players)
            
            # 3. Créer les joueurs manquants si nécessaire
            if players_to_create > 0:
                self.stdout.write(self.style.SUCCESS(f'Création de {players_to_create} nouveaux joueurs...'))
                
                # Liste de prénoms
                first_names = [
                    "Jean", "Marie", "Pierre", "Sophie", "Thomas", "Emma", 
                    "Lucas", "Lea", "Hugo", "Chloe", "Paul", "Julia", 
                    "Antoine", "Laura", "Gabriel", "Camille"
                ]
                
                # Liste de noms de famille
                last_names = [
                    "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", 
                    "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent", 
                    "Lefebvre", "Michel", "Garcia", "David"
                ]
                
                # Liste de suffixes pour les noms d'utilisateur
                username_suffixes = [
                    "Pro", "42", "Player", "Master", "Champion", "Star", 
                    "Winner", "Gamer", "Expert", "Elite", "Legend", "Pro42"
                ]
                
                # Liste d'avatars (URLs d'exemple)
                avatars = [
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Aiden",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Maria",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Jessica",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Riley",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Felix",
                ]
                
                # Créer les joueurs
                for i in range(players_to_create):
                    first_name = random.choice(first_names)
                    last_name = random.choice(last_names)
                    username = f"{first_name.lower()}{random.choice(username_suffixes)}{random.randint(1, 99)}"
                    email = f"{username}@example.com"
                    
                    # Mot de passe (le même que l'email pour simplifier)
                    plain_password = email
                    
                    # Attributs aléatoires
                    wins = random.randint(0, 50)
                    losses = random.randint(0, 30)
                    champions = random.randint(0, 5)
                    
                    # Avatar
                    avatar_template = random.choice(avatars)
                    avatar = avatar_template.format(username)
                    
                    try:
                        # Vérifier si l'utilisateur existe déjà
                        if Player.objects.filter(username=username).exists():
                            self.stdout.write(self.style.WARNING(f"Un utilisateur avec le nom {username} existe déjà. Génération d'un nouveau."))
                            continue
                        
                        if Player.objects.filter(email=email).exists():
                            self.stdout.write(self.style.WARNING(f"Un utilisateur avec l'email {email} existe déjà. Génération d'un nouveau."))
                            continue
                        
                        # Créer le joueur
                        player = Player.objects.create(
                            email=email,
                            username=username,
                            first_name=first_name,
                            last_name=last_name,
                            avatar=avatar,
                            wins=wins,
                            losses=losses,
                            champions=champions,
                            status='ON',
                            is_active=True
                        )
                        
                        # Définir le mot de passe
                        player.set_password(plain_password)
                        player.save(update_fields=['password'])
                        
                        self.stdout.write(self.style.SUCCESS(f"✅ Joueur créé: {username} / {email}"))
                        
                        # Ajouter le joueur à la liste des joueurs à assigner
                        existing_players.append(player)
                        
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"❌ Erreur lors de la création du joueur {username}: {e}"))
            
            # 4. Créer le tournoi
            try:
                # Choisir un créateur parmi les joueurs
                creator = random.choice(existing_players)
                
                # Créer le tournoi
                tournament = Tournament.objects.create(
                    name=tournament_name,
                    status='BG' if start_stage else 'PN'  # En attente ou déjà commencé
                )
                
                if start_stage:
                    tournament.current_round = 'FN' if start_stage == 'final' else 'HF'
                    tournament.save()
                
                self.stdout.write(self.style.SUCCESS(f"✅ Tournoi '{tournament_name}' créé avec succès (ID: {tournament.id})"))
                
                # 5. Assigner les joueurs au tournoi
                creator_assigned = False
                for player in existing_players:
                    is_creator = player == creator and not creator_assigned
                    if is_creator:
                        creator_assigned = True
                    
                    PlayerTournament.objects.create(
                        player=player,
                        tournament=tournament,
                        creator=is_creator
                    )
                    
                    role = "créateur" if is_creator else "participant"
                    self.stdout.write(self.style.SUCCESS(f"✅ {player.username} assigné au tournoi en tant que {role}"))
                
                # 6. Si start_stage est spécifié, créer les matches correspondants
                if start_stage:
                    if start_stage == 'final':
                        self.create_final_matches(tournament, existing_players)
                    elif start_stage == 'semi':
                        self.create_semi_final_matches(tournament, existing_players)
                
                # Afficher le récapitulatif
                self.stdout.write(self.style.SUCCESS("\nRécapitulatif du tournoi:"))
                self.stdout.write(f"Nom: {tournament.name}")
                self.stdout.write(f"ID: {tournament.id}")
                self.stdout.write(f"Statut: {tournament.get_status_display()}")
                if start_stage:
                    self.stdout.write(f"Phase actuelle: {tournament.get_current_round_display()}")
                self.stdout.write(f"Créateur: {creator.username} (ID: {creator.id})")
                self.stdout.write(f"Nombre de joueurs: {len(existing_players)}")
                
                if not start_stage:
                    self.stdout.write(self.style.SUCCESS("\nPour démarrer le tournoi, utilisez:"))
                    self.stdout.write(f"python manage.py start_tournament {tournament.id}")
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Erreur lors de la création du tournoi: {e}"))

    def create_final_matches(self, tournament, players):
        """Crée directement les matches pour la finale"""
        if len(players) < 2:
            self.stdout.write(self.style.ERROR("Pas assez de joueurs pour créer une finale"))
            return
        
        # Sélectionner 2 joueurs aléatoires pour la finale
        finalists = random.sample(players, 2)
        
        # Créer le match de finale
        final_match = Match.objects.create(
            tournament=tournament,
            state='UPL',
            round='FN'
        )
        
        # Assigner les joueurs au match
        for i, player in enumerate(finalists):
            PlayerMatch.objects.create(
                player=player,
                match=final_match,
                player_side='L' if i == 0 else 'R'
            )
        
        self.stdout.write(self.style.SUCCESS(f"✅ Finale créée entre {finalists[0].username} et {finalists[1].username}"))

    def create_semi_final_matches(self, tournament, players):
        """Crée directement les matches pour les demi-finales"""
        if len(players) < 4:
            self.stdout.write(self.style.ERROR("Pas assez de joueurs pour créer des demi-finales"))
            return
        
        # Sélectionner 4 joueurs aléatoires pour les demi-finales
        semi_finalists = random.sample(players, 4)
        
        # Créer les deux matches de demi-finale
        for i in range(2):
            start = i * 2
            end = start + 2
            match_players = semi_finalists[start:end]
            
            semi_match = Match.objects.create(
                tournament=tournament,
                state='UPL',
                round='HF'
            )
            
            for j, player in enumerate(match_players):
                PlayerMatch.objects.create(
                    player=player,
                    match=semi_match,
                    player_side='L' if j == 0 else 'R'
                )
            
            self.stdout.write(self.style.SUCCESS(
                f"✅ Demi-finale {i+1} créée entre {match_players[0].username} et {match_players[1].username}"
            ))