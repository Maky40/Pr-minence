import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Match, PlayerMatch


# States en mémoire (pour la logique en temps réel)
game_states = {}
# Tâches asynchrones de partie
game_tasks = {}
# Tâches de décompte
countdown_tasks = {}

class PongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Connexion d'un joueur"""
        if "player" not in self.scope:
            await self.close()
            return

        self.player = self.scope["player"]
        self.match_id = self.scope["url_route"]["kwargs"].get("match_id")
        self.room_group_name = f"pong_{self.match_id}" if self.match_id else None


        # --- NOUVEAU : Vérification du match (s'il y a un match_id) ---
        if self.match_id:
            # Vérifie en base si ce match existe réellement
            match_exists = await self.match_exists_in_db(self.match_id)
            if not match_exists:
                # Si le match n'existe pas => on ferme immédiatement
                await self.close()
                return
            
            # On rejoint un match existant
            # Vérifie si le match est déjà complet (2 joueurs)
            if await self.is_match_ready(self.match_id):
                # Si le match a déjà 2 joueurs, on empêche un 3ᵉ joueur d'entrer
                await self.close()
                return

            # Assigne la raquette au second joueur
            self.paddle = await self.assign_player_side(self.match_id, self.player)
            if not self.paddle:
                # Problème lors de l'assignation (match complet ?)
                await self.close()
                return

        else:
            # Aucune match_id => on crée un nouveau match
            self.match_id = await self.create_match(self.player)
            self.paddle = "left"
            self.room_group_name = f"pong_{self.match_id}"

        # Rejoint le groupe
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        # Accepte la connexion WebSocket
        await self.accept()

        # Message de confirmation au client
        await self.send(text_data=json.dumps({
            "message": "Connexion WebSocket établie",
            "match_id": self.match_id,
            "paddle": self.paddle
        }))

        # Si on a 2 joueurs => on démarre la partie
        if await self.is_match_ready(self.match_id):
            await self.start_game()

    async def disconnect(self, close_code):
        """Déconnexion d'un joueur"""
        if self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    #
    # --- Méthodes DB utilitaires ---
    #
    @database_sync_to_async
    def match_exists_in_db(self, match_id):
        """Retourne True si le match existe en base, False sinon."""
        return Match.objects.filter(id=match_id).exists()

    @database_sync_to_async
    def create_match(self, player):
        """Crée un match + un PlayerMatch (side='L') pour le premier joueur."""
        match = Match.objects.create()
        PlayerMatch.objects.create(
            player=player,
            match=match,
            score=0,
            is_winner=False,
            player_side='L'
        )
        return match.id

    @database_sync_to_async
    def assign_player_side(self, match_id, player):
        """Assigne la raquette 'L' ou 'R' selon le nombre de joueurs déjà présents."""
        print(f"[DEBUG] Tentative d'assignation pour player={player.username} dans match_id={match_id}")
        
        existing_pm = PlayerMatch.objects.filter(match_id=match_id)
        print(f"[DEBUG] Joueurs existants dans le match: {existing_pm.count()}")
        
        # Vérifier si le joueur est déjà dans le match
        if existing_pm.filter(player=player).exists():
            print(f"[DEBUG] ⚠️ {player.username} est déjà dans le match!")
            return None
        
        if existing_pm.count() == 0:
            print(f"[DEBUG] Premier joueur: {player.username} -> LEFT")
            PlayerMatch.objects.create(
                player=player,
                match_id=match_id,
                score=0,
                is_winner=False,
                player_side='L'
            )
            return "left"
        elif existing_pm.count() == 1:
            existing_player = existing_pm.first().player
            print(f"[DEBUG] Deuxième joueur: {player.username} -> RIGHT (vs {existing_player.username})")
            PlayerMatch.objects.create(
                player=player,
                match_id=match_id,
                score=0,
                is_winner=False,
                player_side='R'
            )
            return "right"
        
        print(f"[DEBUG] ❌ Match complet, impossible d'ajouter {player.username}")
        return None

    @database_sync_to_async
    def is_match_ready(self, match_id):
        """Retourne True si 2 joueurs sont dans le match."""
        return PlayerMatch.objects.filter(match_id=match_id).count() == 2

    #
    # --- start_game ---
    #
    async def start_game(self):
        # Notifie le front
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "game_start",
                "message": "La partie va commencer dans 5 secondes..."
            }
        )

        # Réinitialise l'état de jeu pour ce match (s'il existait déjà)
        if self.match_id in game_states:
            del game_states[self.match_id]

        await self.init_game_state()
        await self.start_game_loop()

        # On récupère les pseudos (left/right)
        left_username, right_username = await self.get_left_right_usernames(self.match_id)
        # On diffuse ces infos à tout le monde
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "players_info",
                "left_username": left_username,
                "right_username": right_username
            }
        )

        # Décompte asynchrone de 5s
        countdown_task = asyncio.create_task(self.do_countdown(self.match_id))
        countdown_tasks[self.match_id] = countdown_task

    async def game_start(self, event):
        """Reçu par le front => message 'La partie va commencer'."""
        await self.send(text_data=json.dumps({
            "type": "game_start",
            "message": event["message"]
        }))

    @database_sync_to_async
    def get_left_right_usernames(self, match_id):
        """Retourne (left_username, right_username) via PlayerMatch."""
        pm_left = PlayerMatch.objects.get(match_id=match_id, player_side='L')
        pm_right = PlayerMatch.objects.get(match_id=match_id, player_side='R')
        return pm_left.player.username, pm_right.player.username

    async def players_info(self, event):
        """Reçu par le front => contient left_username / right_username."""
        await self.send(text_data=json.dumps({
            "type": "players_info",
            "left_username": event["left_username"],
            "right_username": event["right_username"]
        }))

    async def init_game_state(self):
        """Initialise l'état de la partie (position balle, raquettes, etc.)."""
        game_states[self.match_id] = {
            "width": 800,
            "height": 600,
            "ball_x": 400,
            "ball_y": 300,
            "ball_vx": 5,
            "ball_vy": 5,
            "paddle_left_y": 250,
            "paddle_right_y": 250,
            "paddle_speed_left": 0,
            "paddle_speed_right": 0,
            "paddle_width": 10,
            "paddle_height": 100,
            "score_left": 0,
            "score_right": 0,
            "running": False,

            # Pour alterner l'engagement de la balle après chaque but
            "next_engagement_left": True
        }

    async def start_game_loop(self):
        """Crée la tâche asynchrone qui gère la boucle de jeu."""
        task = asyncio.create_task(self.game_loop(self.match_id))
        game_tasks[self.match_id] = task

    async def do_countdown(self, match_id):
        """Compte à rebours 5s avant de passer running=True."""
        await asyncio.sleep(5)
        state = game_states.get(match_id)
        if state:
            state["running"] = True

    #
    # --- Boucle de jeu ---
    #
    async def game_loop(self, match_id):
        """Boucle principale qui met à jour la position de la balle et des raquettes."""
        while True:
            state = game_states.get(match_id)
            if not state:
                # Si pour une raison X l'état n'existe plus, on arrête
                break

            if not state["running"]:
                # En attente de la fin du compte à rebours
                await asyncio.sleep(0.1)
                continue

            # Met à jour positions
            await self.update_positions(state)
            await self.check_collisions_and_score(state)
            # Broadcast aux joueurs
            await self.broadcast_game_state(state)

            # 60 FPS => 1/60 s
            await asyncio.sleep(1/60)

    async def update_positions(self, state):
        """Met à jour la position des raquettes et de la balle."""
        state["paddle_left_y"] += state["paddle_speed_left"]
        state["paddle_right_y"] += state["paddle_speed_right"]

        # Limites raquettes
        if state["paddle_left_y"] < 0:
            state["paddle_left_y"] = 0
        if state["paddle_left_y"] > state["height"] - state["paddle_height"]:
            state["paddle_left_y"] = state["height"] - state["paddle_height"]
        if state["paddle_right_y"] < 0:
            state["paddle_right_y"] = 0
        if state["paddle_right_y"] > state["height"] - state["paddle_height"]:
            state["paddle_right_y"] = state["height"] - state["paddle_height"]

        # Balle
        state["ball_x"] += state["ball_vx"]
        state["ball_y"] += state["ball_vy"]

    async def check_collisions_and_score(self, state):
        """Gère les collisions de balle avec les bords/raquettes et incrémente le score."""
        bx = state["ball_x"]
        by = state["ball_y"]
        vx = state["ball_vx"]
        vy = state["ball_vy"]
        w = state["width"]
        h = state["height"]

        ball_size = 15
        paddle_left_x = 50
        paddle_right_x = w - 50 - state["paddle_width"]

        # Collision haut/bas
        if by <= 0 or by >= h - ball_size:
            state["ball_vy"] = -vy

        # Collision raquette gauche ?
        if bx <= paddle_left_x + state["paddle_width"]:
            if (by >= state["paddle_left_y"] and
                by <= state["paddle_left_y"] + state["paddle_height"]):
                # Inverse vx (rebond)
                new_vx = -vx * 1.1
                new_vy = vy * 1.1
                state["ball_vx"] = new_vx
                state["ball_vy"] = new_vy
            else:
                # But pour la droite
                state["score_right"] += 1
                await self.reset_ball(state)

        # Collision raquette droite ?
        elif bx + ball_size >= paddle_right_x:
            if (by >= state["paddle_right_y"] and
                by <= state["paddle_right_y"] + state["paddle_height"]):
                new_vx = -vx * 1.1
                new_vy = vy * 1.1
                state["ball_vx"] = new_vx
                state["ball_vy"] = new_vy
            else:
                # But pour la gauche
                state["score_left"] += 1
                await self.reset_ball(state)

        # Fin de partie ?
        if state["score_left"] >= 10 or state["score_right"] >= 10:
            state["running"] = False
            await self.end_game(self.match_id, state)

    async def reset_ball(self, state):
        """Replace la balle au centre, altère la direction selon next_engagement_left."""
        import random

        # Centre
        state["ball_x"] = state["width"] // 2
        state["ball_y"] = state["height"] // 2

        # Direction Y aléatoire
        dir_y = 1 if random.random() > 0.5 else -1
        state["ball_vy"] = 5 * dir_y

        # Engagement alterné
        if state["next_engagement_left"]:
            # Balle part vers la droite
            state["ball_vx"] = 5
        else:
            # Balle part vers la gauche
            state["ball_vx"] = -5

        # Inverse le prochain engagement
        state["next_engagement_left"] = not state["next_engagement_left"]

    async def broadcast_game_state(self, state):
        """Envoie l'état de la partie (balle, raquettes, scores) à tous les clients."""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "update_game_state",
                "state": {
                    "ball_x": state["ball_x"],
                    "ball_y": state["ball_y"],
                    "paddle_left_y": state["paddle_left_y"],
                    "paddle_right_y": state["paddle_right_y"],
                    "score_left": state["score_left"],
                    "score_right": state["score_right"],
                }
            }
        )

    async def update_game_state(self, event):
        """Reçoit les messages 'update_game_state' et les envoie au client WebSocket."""
        await self.send(text_data=json.dumps({
            "type": "game_state",
            "ball_x": event["state"]["ball_x"],
            "ball_y": event["state"]["ball_y"],
            "paddle_left_y": event["state"]["paddle_left_y"],
            "paddle_right_y": event["state"]["paddle_right_y"],
            "score_left": event["state"]["score_left"],
            "score_right": event["state"]["score_right"],
        }))

    #
    # --- Fin de partie ---
    #
    async def end_game(self, match_id, state):
        """Marque la partie terminée + met à jour la base (vainqueur, etc.)."""
        await self.update_database_winner(match_id, state)
        await self.channel_layer.group_send(
            f"pong_{match_id}",
            {
                "type": "game_over",
                "score_left": state["score_left"],
                "score_right": state["score_right"]
            }
        )

    @database_sync_to_async
    def update_database_winner(self, match_id, state):
        """Match -> 'PLY'. Met à jour score + is_winner. Incrémente wins/losses."""
        match = Match.objects.get(id=match_id)
        match.state = 'PLY'
        match.save()

        pm_left = PlayerMatch.objects.get(match=match, player_side='L')
        pm_right = PlayerMatch.objects.get(match=match, player_side='R')

        pm_left.score = state["score_left"]
        pm_right.score = state["score_right"]

        if state["score_left"] > state["score_right"]:
            pm_left.is_winner = True
            pm_left.player.wins += 1
            pm_right.player.losses += 1
            pm_left.player.save()
            pm_right.player.save()
        elif state["score_right"] > state["score_left"]:
            pm_right.is_winner = True
            pm_right.player.wins += 1
            pm_left.player.losses += 1
            pm_right.player.save()
            pm_left.player.save()

        pm_left.save()
        pm_right.save()

    async def game_over(self, event):
        """Envoie le message 'game_over' avec score final."""
        await self.send(text_data=json.dumps({
            "type": "game_over",
            "score_left": event["score_left"],
            "score_right": event["score_right"]
        }))

    #
    # --- Réception des messages côté client (WS) ---
    #
    async def receive(self, text_data):
        data = json.loads(text_data)
        action_type = data.get("type")

        if action_type == "move":
            direction = data.get("direction")
            state = game_states.get(self.match_id)
            if not state:
                return

            # Pour se déplacer rapidement
            if self.paddle == "left":
                if direction == "up":
                    state["paddle_speed_left"] = -10
                elif direction == "down":
                    state["paddle_speed_left"] = 10
                else:
                    state["paddle_speed_left"] = 0
            else:
                if direction == "up":
                    state["paddle_speed_right"] = -10
                elif direction == "down":
                    state["paddle_speed_right"] = 10
                else:
                    state["paddle_speed_right"] = 0








