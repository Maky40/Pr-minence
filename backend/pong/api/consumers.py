import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Match, PlayerMatch

game_states = {}
game_tasks = {}
countdown_tasks = {}  # match_id -> asyncio.Task pour le compte à rebours

class PongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Connexion d'un joueur au WebSocket"""
        if "player" not in self.scope:
            await self.close()
            return

        self.player = self.scope["player"]
        self.match_id = self.scope["url_route"]["kwargs"].get("match_id")
        self.room_group_name = None

        # Vérification match_id
        if self.match_id:
            if await self.is_match_ready(self.match_id):
                # match déjà complet => refuse
                await self.close()
                return
            self.paddle = await self.assign_player_side(self.match_id, self.player)
            if not self.paddle:
                await self.close()
                return
        else:
            self.match_id = await self.create_match(self.player)
            self.paddle = "left"

        self.room_group_name = f"pong_{self.match_id}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        await self.send(text_data=json.dumps({
            "message": "Connexion WebSocket établie",
            "match_id": self.match_id,
            "paddle": self.paddle
        }))

        # Si on a 2 joueurs => démarrer
        if await self.is_match_ready(self.match_id):
            await self.start_game()

    async def disconnect(self, close_code):
        if self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    #
    # --- Méthodes DB ---
    #
    @database_sync_to_async
    def create_match(self, player):
        match = Match.objects.create()
        PlayerMatch.objects.create(player=player, match=match, score=0, is_winner=False)
        return match.id

    @database_sync_to_async
    def assign_player_side(self, match_id, player):
        existing_players = PlayerMatch.objects.filter(match_id=match_id)
        if existing_players.count() == 0:
            return "left"
        elif existing_players.count() == 1:
            PlayerMatch.objects.create(
                player=player,
                match_id=match_id,
                score=0,
                is_winner=False
            )
            return "right"
        return None

    @database_sync_to_async
    def is_match_ready(self, match_id):
        return PlayerMatch.objects.filter(match_id=match_id).count() == 2

    #
    # --- Lancement de la partie ---
    #
    async def start_game(self):
        # On envoie "game_start" (le front peut déclencher son timer local)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "game_start",
                "message": "La partie va commencer dans 5 secondes..."
            }
        )

        # Réinitialise l'état s'il y en avait un
        if self.match_id in game_states:
            del game_states[self.match_id]

        await self.init_game_state()  # running=False
        await self.start_game_loop()

        # Créer la task asynchrone qui fait un compte à rebours 5s côté serveur
        countdown_task = asyncio.create_task(self.do_countdown(self.match_id))
        countdown_tasks[self.match_id] = countdown_task

    async def game_start(self, event):
        """Reçu par le front : 'La partie va commencer dans 5s...' """
        await self.send(text_data=json.dumps({
            "type": "game_start",
            "message": event["message"]
        }))

    async def init_game_state(self):
        """running=False => le jeu est figé tant qu'on n'a pas fini le countdown"""
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
            "running": False
        }

    async def start_game_loop(self):
        task = asyncio.create_task(self.game_loop(self.match_id))
        game_tasks[self.match_id] = task

    async def do_countdown(self, match_id):
        """Attend 5s puis met running=True, sans bloquer le connect"""
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
                break  # plus d'état => on arrête

            if not state["running"]:
                # En "pause" => attend un peu
                await asyncio.sleep(0.1)
                continue

            # Physique
            await self.update_positions(state)
            await self.check_collisions_and_score(state)
            await self.broadcast_game_state(state)
            await asyncio.sleep(1/60)

    async def update_positions(self, state):
        state["paddle_left_y"] += state["paddle_speed_left"]
        state["paddle_right_y"] += state["paddle_speed_right"]
        # Limites
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
        bx = state["ball_x"]
        by = state["ball_y"]
        vx = state["ball_vx"]
        vy = state["ball_vy"]
        w = state["width"]
        h = state["height"]

        ball_size = 15
        paddle_left_x = 50
        paddle_right_x = w - 50 - state["paddle_width"]

        # Haut / bas
        if by <= 0 or by >= h - ball_size:
            state["ball_vy"] = -vy

        # Raquette gauche
        if bx <= paddle_left_x + state["paddle_width"]:
            if (by >= state["paddle_left_y"] and
                by <= state["paddle_left_y"] + state["paddle_height"]):
                state["ball_vx"] = -vx
            else:
                # But pour la droite
                state["score_right"] += 1
                await self.reset_ball(state)

        # Raquette droite
        elif bx + ball_size >= paddle_right_x:
            if (by >= state["paddle_right_y"] and
                by <= state["paddle_right_y"] + state["paddle_height"]):
                state["ball_vx"] = -vx
            else:
                # But pour la gauche
                state["score_left"] += 1
                await self.reset_ball(state)

    async def reset_ball(self, state):
        import random
        state["ball_x"] = state["width"] // 2
        state["ball_y"] = state["height"] // 2
        dir_x = 1 if random.random() > 0.5 else -1
        dir_y = 1 if random.random() > 0.5 else -1
        state["ball_vx"] = 5 * dir_x
        state["ball_vy"] = 5 * dir_y

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
    # --- Réception client ---
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
                    state["paddle_speed_left"] = -5
                elif direction == "down":
                    state["paddle_speed_left"] = 5
                else:
                    state["paddle_speed_left"] = 0
            else:
                if direction == "up":
                    state["paddle_speed_right"] = -5
                elif direction == "down":
                    state["paddle_speed_right"] = 5
                else:
                    state["paddle_speed_right"] = 0





