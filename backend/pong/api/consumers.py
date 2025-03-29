import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Match, PlayerMatch

# États de jeu et connexions en mémoire
game_states = {}
game_tasks = {}
countdown_tasks = {}
connected_users = {}        # match_id -> int
connected_players = {}      # player_id -> PongConsumer instance

class PongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("\n[DEBUG] Nouvelle tentative de connexion WebSocket")

        if "player" not in self.scope:
            print("[DEBUG] Connexion refusée : pas de joueur dans scope.")
            await self.close()
            return

        self.player = self.scope["player"]
        print(f"[DEBUG] Joueur connecté: {self.player.username}")

        # 🔁 Ferme ancienne connexion si déjà connecté
        if self.player.id in connected_players:
            old_consumer = connected_players[self.player.id]
            if old_consumer != self:
                print(f"[DEBUG] Fermeture de l'ancienne connexion pour {self.player.username}")
                await old_consumer.close(code=4000)

        connected_players[self.player.id] = self
        print(f"[DEBUG] Nouvelle connexion enregistrée pour {self.player.username}")

        self.match_id = self.scope["url_route"]["kwargs"].get("match_id")
        self.room_group_name = f"pong_{self.match_id}" if self.match_id else None
        print(f"[DEBUG] match_id={self.match_id}, group={self.room_group_name}")

        if self.match_id:
            match_exists = await self.match_exists_in_db(self.match_id)
            if not match_exists:
                await self.accept()
                await self.send(text_data=json.dumps({"error": f"Match {self.match_id} inexistant"}))
                await self.close()
                print("[DEBUG] Connexion refusée : match inexistant")
                return

            match_state = await self.get_match_state(self.match_id)
            if match_state == "PLY":
                await self.accept()
                await self.send(text_data=json.dumps({"error": "Ce match est déjà terminé."}))
                await self.close()
                print(f"[DEBUG] Refus de connexion : match {self.match_id} déjà joué.")
                return

            connected_users[self.match_id] = connected_users.get(self.match_id, 0) + 1
            print(f"[DEBUG] connected_users[{self.match_id}] = {connected_users[self.match_id]}")

            self.paddle = await self.assign_player_side(self.match_id, self.player)
            if not self.paddle:
                await self.accept()
                await self.send(text_data=json.dumps({"error": "Impossible d'assigner un côté"}))
                await self.close()
                return
        else:
            self.match_id = await self.create_match(self.player)
            self.paddle = "left"
            self.room_group_name = f"pong_{self.match_id}"
            connected_users[self.match_id] = 1
            print(f"[DEBUG] Match créé : match_id={self.match_id}")

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        print("[DEBUG] WebSocket acceptée (joueur intégré au match)")

        await self.send(text_data=json.dumps({
            "message": "Connexion WebSocket établie",
            "match_id": self.match_id,
            "paddle": self.paddle
        }))
        print(f"[DEBUG] Envoi au client : match_id={self.match_id}, paddle={self.paddle}")

        if await self.is_match_ready(self.match_id):
            await self.start_game()

    async def disconnect(self, close_code):
        print(f"[DEBUG] Déconnexion WebSocket (code: {close_code})")

        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

        if hasattr(self, "match_id"):
            current = connected_users.get(self.match_id, 0)
            if current > 1:
                connected_users[self.match_id] = current - 1
            elif current == 1:
                del connected_users[self.match_id]
            print(f"[DEBUG] connected_users[{self.match_id}] après déconnexion = {connected_users.get(self.match_id)}")

        if hasattr(self, "player") and self.player:
            if connected_players.get(self.player.id) == self:
                print(f"[DEBUG] Suppression de connected_players pour {self.player.username}")
                del connected_players[self.player.id]

    @database_sync_to_async
    def match_exists_in_db(self, match_id):
        return Match.objects.filter(id=match_id).exists()

    @database_sync_to_async
    def get_match_state(self, match_id):
        return Match.objects.get(id=match_id).state

    @database_sync_to_async
    def create_match(self, player):
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
        player_match = existing_pm.filter(player=player).first()
        if player_match:
            return "left" if player_match.player_side == 'L' else "right"

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

    async def is_match_ready(self, match_id):
        count = connected_users.get(match_id, 0)
        print(f"[DEBUG] is_match_ready? match_id={match_id}, connected={count}")
        return count >= 2

    async def start_game(self):
        print(f"[DEBUG] start_game appelé pour match_id={self.match_id}")
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

    async def game_start(self, event):
        await self.send(text_data=json.dumps({
            "type": "game_start",
            "message": event["message"]
        }))
        print(f"[DEBUG] Envoi game_start: {event['message']}")

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
        print(f"[DEBUG] Envoi players_info: {event}")

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
        print(f"[DEBUG] État de jeu initialisé pour match {self.match_id}")

    async def start_game_loop(self):
        game_tasks[self.match_id] = asyncio.create_task(self.game_loop(self.match_id))
        print(f"[DEBUG] Boucle de jeu démarrée pour match_id={self.match_id}")

    async def do_countdown(self, match_id):
        await asyncio.sleep(5)
        state = game_states.get(match_id)
        if state:
            state["running"] = True
            print(f"[DEBUG] Décompte terminé, jeu lancé pour match {match_id}")

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
            if not state["running"]:
                break
            await self.broadcast_game_state(state)
            await asyncio.sleep(1/60)

    async def update_positions(self, state):
        state["paddle_left_y"] += state["paddle_speed_left"]
        state["paddle_right_y"] += state["paddle_speed_right"]
        h = state["height"]
        ph = state["paddle_height"]
        state["paddle_left_y"] = max(0, min(h - ph, state["paddle_left_y"]))
        state["paddle_right_y"] = max(0, min(h - ph, state["paddle_right_y"]))
        state["ball_x"] += state["ball_vx"]
        state["ball_y"] += state["ball_vy"]

    async def check_collisions_and_score(self, state):
        bx, by = state["ball_x"], state["ball_y"]
        vx, vy = state["ball_vx"], state["ball_vy"]
        w, h = state["width"], state["height"]
        ball_size = 15
        paddle_left_x = 50
        paddle_right_x = w - 50 - state["paddle_width"]

        if by <= 0 or by >= h - ball_size:
            state["ball_vy"] = -vy

        if bx <= paddle_left_x + state["paddle_width"]:
            if state["paddle_left_y"] <= by <= state["paddle_left_y"] + state["paddle_height"]:
                state["ball_vx"] = -vx * 1.1
                state["ball_vy"] = vy * 1.1
            else:
                state["score_right"] += 1
                await self.reset_ball(state)
        elif bx + ball_size >= paddle_right_x:
            if state["paddle_right_y"] <= by <= state["paddle_right_y"] + state["paddle_height"]:
                state["ball_vx"] = -vx * 1.1
                state["ball_vy"] = vy * 1.1
            else:
                state["score_left"] += 1
                await self.reset_ball(state)

        if state["score_left"] >= 10 or state["score_right"] >= 10:
            state["running"] = False
            await self.end_game(self.match_id, state)

    async def reset_ball(self, state):
        import random
        state["ball_x"] = state["width"] // 2
        state["ball_y"] = state["height"] // 2
        state["ball_vy"] = 5 * (1 if random.random() > 0.5 else -1)
        state["ball_vx"] = 5 if state["next_engagement_left"] else -5
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
            **event["state"]
        }))

    async def end_game(self, match_id, state):
        print(f"[DEBUG] Fin de match {match_id}")
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
        elif state["score_right"] > state["score_left"]:
            pm_right.is_winner = True
            pm_right.player.wins += 1
            pm_left.player.losses += 1

        pm_left.player.save()
        pm_right.player.save()
        pm_left.save()
        pm_right.save()

    async def game_over(self, event):
        await self.send(text_data=json.dumps({
            "type": "game_over",
            "score_left": event["score_left"],
            "score_right": event["score_right"]
        }))

    async def receive(self, text_data):
        print(f"[DEBUG] Donnée reçue du client: {text_data}")
        data = json.loads(text_data)
        action_type = data.get("type")

        if action_type == "move":
            direction = data.get("direction")
            state = game_states.get(self.match_id)
            if not state:
                return

            if self.paddle == "left":
                state["paddle_speed_left"] = -10 if direction == "up" else 10 if direction == "down" else 0
            else:
                state["paddle_speed_right"] = -10 if direction == "up" else 10 if direction == "down" else 0







