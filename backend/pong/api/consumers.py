import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Match, PlayerMatch, Player

# States en mémoire (pour la logique en temps réel)
game_states = {}
# Tâches asynchrones de partie
game_tasks = {}
# Tâches de décompte
countdown_tasks = {}

class PongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Connexion d'un joueur."""
        if "player" not in self.scope:
            await self.close()
            return

        self.player = self.scope["player"]
        self.match_id = self.scope["url_route"]["kwargs"].get("match_id")
        self.room_group_name = None

        # Vérifier si le joueur est déjà "INGAME" ou a un match 'UPL'
        if await self.is_player_in_game_or_has_active_match(self.player):
            # Si c'est le cas, on refuse la connexion
            await self.close()
            return

        if self.match_id:
            # --- CAS 1 : un match_id est fourni ---
            # Vérifie en base si ce match existe réellement
            match_exists = await self.match_exists_in_db(self.match_id)
            if not match_exists:
                await self.close()
                return
            
            # On rejoint un match existant
            if await self.is_match_ready(self.match_id):
                # Si déjà 2 joueurs, on empêche un 3ᵉ
                await self.close()
                return

            self.paddle = await self.assign_player_side(self.match_id, self.player)
            if not self.paddle:
                await self.close()
                return

        else:
            # --- CAS 2 : aucun match_id => on crée un nouveau match ---
            # Vérifier si le joueur est déjà dans un tournoi en cours (PN ou BG)
            if await self.is_player_in_active_tournament(self.player):
                # Il ne peut pas créer de match individuel s'il est dans un tournoi actif
                await self.close()
                return

            self.match_id = await self.create_match(self.player)
            self.paddle = "left"

        # Nom du "groupe" Channels
        self.room_group_name = f"pong_{self.match_id}"

        # Rejoindre le groupe
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        # Accepter la connexion WebSocket
        await self.accept()

        # Message de confirmation
        await self.send(text_data=json.dumps({
            "message": "Connexion WebSocket établie",
            "match_id": self.match_id,
            "paddle": self.paddle
        }))

        # Si on a 2 joueurs => démarrer la partie
        if await self.is_match_ready(self.match_id):
            await self.start_game()

    async def disconnect(self, close_code):
        """Déconnexion d'un joueur."""
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
        return Match.objects.filter(id=match_id).exists()

    @database_sync_to_async
    def create_match(self, player):
        """Crée un match + PlayerMatch (side='L') pour le premier joueur."""
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
        existing_pm = PlayerMatch.objects.filter(match_id=match_id)
        # Vérifier si le joueur est déjà dans le match
        if existing_pm.filter(player=player).exists():
            return None
        
        if existing_pm.count() == 0:
            PlayerMatch.objects.create(
                player=player,
                match_id=match_id,
                score=0,
                is_winner=False,
                player_side='L'
            )
            return "left"
        elif existing_pm.count() == 1:
            PlayerMatch.objects.create(
                player=player,
                match_id=match_id,
                score=0,
                is_winner=False,
                player_side='R'
            )
            return "right"
        return None

    @database_sync_to_async
    def is_match_ready(self, match_id):
        """Retourne True si 2 joueurs sont dans le match."""
        return PlayerMatch.objects.filter(match_id=match_id).count() == 2

    @database_sync_to_async
    def is_player_in_game_or_has_active_match(self, player):
        """Vérifie si le joueur a un match UPL ou status='IG'."""
        if player.status == 'IG':
            return True
        active_match_exists = PlayerMatch.objects.filter(
            player=player,
            match__state='UPL'
        ).exists()
        return active_match_exists

    @database_sync_to_async
    def is_player_in_active_tournament(self, player):
        """Vérifie si le joueur est dans un tournoi en statut PN ou BG."""
        from .models import PlayerTournament, Tournament
        return PlayerTournament.objects.filter(
            player=player,
            tournament__status__in=['PN', 'BG']
        ).exists()

    @database_sync_to_async
    def set_player_in_game(self, player):
        player.status = 'IG'
        player.save()

    @database_sync_to_async
    def set_player_online(self, player):
        player.status = 'ON'
        player.save()

    #
    # --- start_game ---
    #
    async def start_game(self):
        pm_left = await self.get_player_match(self.match_id, 'L')
        pm_right = await self.get_player_match(self.match_id, 'R')
        await self.set_player_in_game(pm_left.player)
        await self.set_player_in_game(pm_right.player)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "game_start",
                "message": "La partie va commencer dans 5 secondes..."
            }
        )

        if self.match_id in game_states:
            del game_states[self.match_id]

        await self.init_game_state()
        await self.start_game_loop()

        left_username, right_username = await self.get_left_right_usernames(self.match_id)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "players_info",
                "left_username": left_username,
                "right_username": right_username
            }
        )

        countdown_task = asyncio.create_task(self.do_countdown(self.match_id))
        countdown_tasks[self.match_id] = countdown_task

    @database_sync_to_async
    def get_player_match(self, match_id, side):
        return PlayerMatch.objects.get(match_id=match_id, player_side=side)

    async def game_start(self, event):
        await self.send(text_data=json.dumps({
            "type": "game_start",
            "message": event["message"]
        }))

    @database_sync_to_async
    def get_left_right_usernames(self, match_id):
        pm_left = PlayerMatch.objects.get(match_id=match_id, player_side='L')
        pm_right = PlayerMatch.objects.get(match_id=match_id, player_side='R')
        return pm_left.player.username, pm_right.player.username

    async def players_info(self, event):
        await self.send(text_data=json.dumps({
            "type": "players_info",
            "left_username": event["left_username"],
            "right_username": event["right_username"]
        }))

    async def init_game_state(self):
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
            "next_engagement_left": True
        }

    async def start_game_loop(self):
        task = asyncio.create_task(self.game_loop(self.match_id))
        game_tasks[self.match_id] = task

    async def do_countdown(self, match_id):
        await asyncio.sleep(5)
        state = game_states.get(match_id)
        if state:
            state["running"] = True

    #
    # --- Boucle de jeu ---
    #
    async def game_loop(self, match_id):
        while True:
            state = game_states.get(match_id)
            if not state:
                break

            if not state["running"]:
                await asyncio.sleep(0.1)
                continue

            await self.update_positions(state)
            await self.check_collisions_and_score(state)
            await self.broadcast_game_state(state)
            await asyncio.sleep(1/60)

    async def update_positions(self, state):
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

        state["ball_x"] += state["ball_vx"]
        state["ball_y"] += state["ball_vy"]

    async def check_collisions_and_score(self, state):
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
            if state["paddle_left_y"] <= by <= state["paddle_left_y"] + state["paddle_height"]:
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
            if state["paddle_right_y"] <= by <= state["paddle_right_y"] + state["paddle_height"]:
                new_vx = -vx * 1.1
                new_vy = vy * 1.1
                state["ball_vx"] = new_vx
                state["ball_vy"] = new_vy
            else:
                state["score_left"] += 1
                await self.reset_ball(state)

        # Fin de partie ?
        if state["score_left"] >= 10 or state["score_right"] >= 10:
            state["running"] = False
            await self.end_game(self.match_id, state)

    async def reset_ball(self, state):
        import random
        state["ball_x"] = state["width"] // 2
        state["ball_y"] = state["height"] // 2
        dir_y = 1 if random.random() > 0.5 else -1
        state["ball_vy"] = 5 * dir_y

        if state["next_engagement_left"]:
            state["ball_vx"] = 5
        else:
            state["ball_vx"] = -5

        state["next_engagement_left"] = not state["next_engagement_left"]

    async def broadcast_game_state(self, state):
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
        await self.update_database_winner(match_id, state)

        pm_left = await self.get_player_match(match_id, 'L')
        pm_right = await self.get_player_match(match_id, 'R')
        await self.set_player_online(pm_left.player)
        await self.set_player_online(pm_right.player)

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







