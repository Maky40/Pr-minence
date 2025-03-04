from django.core.management.base import BaseCommand
import random
from api.models import Player
from django.db import transaction

class Command(BaseCommand):
    help = 'Génère des joueurs fictifs pour le développement'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=10, help='Nombre de joueurs à créer')
        parser.add_argument('--admin', action='store_true', help='Créer un compte administrateur')

    def handle(self, *args, **options):
        count = options['count']
        self.stdout.write(self.style.SUCCESS(f'Génération de {count} joueurs...'))
        
        # Liste de prénoms
        first_names = [
            "Jean", "Marie", "Pierre", "Sophie", "Thomas",
            "Emma", "Lucas", "Lea", "Hugo", "Chloe"
        ]

        # Liste de noms de famille
        last_names = [
            "Martin", "Bernard", "Dubois", "Thomas", "Robert",
            "Richard", "Petit", "Durand", "Leroy", "Moreau"
        ]

        # Liste de suffixes pour les noms d'utilisateur
        username_suffixes = [
            "Pro", "42", "Player", "Master", "Champion",
            "Star", "Winner", "Gamer", "Expert", "Elite"
        ]

        # Liste d'avatars (URLs d'exemple)
        avatars = [
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Aiden",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Maria",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Jessica",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Riley",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Felix",
        ]

        players_created = []
        
        # Créer joueurs avec transaction pour s'assurer que tout est bien enregistré
        with transaction.atomic():
            for i in range(count):
                # Générer des données aléatoires
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
                
                # Créer le joueur
                try:
                    # Vérifier si l'utilisateur existe déjà
                    if Player.objects.filter(username=username).exists():
                        self.stdout.write(self.style.WARNING(f"Un utilisateur avec le nom {username} existe déjà. Génération d'un nouveau."))
                        continue
                    
                    if Player.objects.filter(email=email).exists():
                        self.stdout.write(self.style.WARNING(f"Un utilisateur avec l'email {email} existe déjà. Génération d'un nouveau."))
                        continue
                    
                    # Créer le joueur directement avec Player.objects.create
                    player = Player.objects.create(
                        email=email,
                        username=username,
                        first_name=first_name,
                        last_name=last_name,
                        avatar=avatar,
                        wins=wins,
                        losses=losses,
                        champions=champions,
                        status='ON',  # Définir comme ONLINE par défaut
                        is_active=True  # Assurer que le compte est actif
                    )
                    
                    # Définir le mot de passe
                    player.set_password(plain_password)
                    player.save(update_fields=['password'])
                    
                    players_created.append({
                        'email': email,
                        'username': username,
                        'password': plain_password
                    })
                    
                    self.stdout.write(self.style.SUCCESS(f"✅ Joueur créé: {username} / {email} / Mot de passe: {plain_password}"))
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"❌ Erreur lors de la création du joueur {username}: {e}"))
            
            # Créer un admin si demandé
            if options['admin']:
                admin_email = "admin@pong42.com"
                admin_username = "admin42"
                admin_password = admin_email
                
                try:
                    if Player.objects.filter(username=admin_username).exists():
                        self.stdout.write(self.style.WARNING(f"Un administrateur {admin_username} existe déjà."))
                    else:
                        admin = Player.objects.create(
                            email=admin_email,
                            username=admin_username,
                            first_name="Admin",
                            last_name="Pong42",
                            status='ON',
                            is_active=True
                        )
                        admin.set_password(admin_password)
                        admin.save(update_fields=['password'])
                        
                        self.stdout.write(self.style.SUCCESS(
                            f"✅ Administrateur créé: {admin_username} / {admin_email} / Mot de passe: {admin_password}"
                        ))
                        
                        players_created.append({
                            'email': admin_email,
                            'username': admin_username,
                            'password': admin_password,
                            'is_admin': True
                        })
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"❌ Erreur lors de la création de l'administrateur: {e}"))
        
        # Afficher le récapitulatif des joueurs créés
        self.stdout.write(self.style.SUCCESS("\nRécapitulatif des joueurs créés:"))
        for idx, player in enumerate(players_created, 1):
            is_admin = player.get('is_admin', False)
            role = "(Admin)" if is_admin else ""
            self.stdout.write(f"{idx}. {player['username']} {role} - Email: {player['email']} - Mot de passe: {player['password']}")
        
        self.stdout.write(self.style.SUCCESS(f"\nTerminé! {len(players_created)} joueurs créés avec succès."))
        
        # Information importante sur l'authentification
        self.stdout.write(self.style.WARNING(
            "\nNOTE: Pour éviter les problèmes d'authentification, le mot de passe de chaque utilisateur a été défini égal à son email."
            "\nUtilisez ces informations pour vous connecter manuellement."
            "\nL'authentification automatique n'est pas disponible car votre modèle Player n'a pas de gestionnaire personnalisé avec get_by_natural_key()."
        ))