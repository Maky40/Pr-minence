
import json
import asyncio
import math
import random
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Match, PlayerMatch


game_states = {}
game_tasks = {}
countdown_tasks = {}
connected_users = {}
connected_players = {}
local_game_states = {}
local_game_tasks = {}
active_local_connections = {}

class PongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if "player" not in self.scope:
            await self.close()
            return

        self.player = self.scope["player"]

        if self.player.id in connected_players:
            old_consumer = connected_players[self.player.id]
            if old_consumer != self:
                await old_consumer.close(code=4000)

        connected_players[self.player.id] = self

        self.match_id = self.scope["url_route"]["kwargs"].get("match_id")
        self.room_group_name = f"pong_{self.match_id}" if self.match_id else None

        if self.match_id:
            match_exists = await self.match_exists_in_db(self.match_id)
            if not match_exists:
                await self.accept()
                await self.send(text_data=json.dumps({"error": f"Match {self.match_id} inexistant"}))
                await self.close()
                return

            match_state = await self.get_match_state(self.match_id)
            if match_state == "PLY":
                await self.accept()
                await self.send(text_data=json.dumps({"error": "Ce match est déjà terminé."}))
                await self.close()
                return

            connected_users[self.match_id] = connected_users.get(self.match_id, 0) + 1

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

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await self.send(text_data=json.dumps({
            "message": "Connexion WebSocket établie",
            "match_id": self.match_id,
            "paddle": self.paddle
        }))

        if await self.is_match_ready(self.match_id):
            await self.start_game()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

        if hasattr(self, "match_id"):
            current = connected_users.get(self.match_id, 0)
            if current == 2 :
                connected_users[self.match_id] = 1
                state = game_states.get(self.match_id)
                match_state = await self.get_match_state(self.match_id)
                if state and match_state != "PLY" :
                    if state["running"] :
                        await self.forfeit_match(self.match_id, state)
                    elif state["score_left"] == 0 and state["score_right"] == 0:
                        await self.forfeit_match(self.match_id, state)
                
            elif current == 1:
                del connected_users[self.match_id]
                await self.delete_match_if_unplayed(self.match_id)

        if hasattr(self, "player") and self.player:
            if connected_players.get(self.player.id) == self:
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
    def delete_match_if_unplayed(self, match_id):
        try:
            match = Match.objects.get(id=match_id)
            if match.state == "UPL" and match.tournament is None:
                PlayerMatch.objects.filter(match=match).delete()
                match.delete()
        except Match.DoesNotExist:
            pass
    @database_sync_to_async
    def assign_player_side(self, match_id, player):
        existing_pm = PlayerMatch.objects.filter(match_id=match_id)
        player_match = existing_pm.filter(player=player).first()
        if player_match:
            return "left" if player_match.player_side == 'L' else "right"

        if existing_pm.count() == 0:
            PlayerMatch.objects.create(player=player, match_id=match_id, score=0, is_winner=False, player_side='L')
            return "left"
        elif existing_pm.count() == 1:
            PlayerMatch.objects.create(player=player, match_id=match_id, score=0, is_winner=False, player_side='R')
            return "right"
        return None

    async def forfeit_match(self, match_id, state) :
        if self.paddle == "left" :
            state["score_left"] = 0
            state["score_right"] = 5
        else :
            state["score_left"] = 5
            state["score_right"] = 0
        
        state["running"] = False
        await self.end_game(match_id, state)
        
    async def is_match_ready(self, match_id):
        return connected_users.get(match_id, 0) >= 2

    async def start_game(self):
        await self.channel_layer.group_send(self.room_group_name, {
            "type": "game_start",
            "message": "La partie va commencer dans 5 secondes..."
        })

        if self.match_id in game_states:
            del game_states[self.match_id]

        await self.init_game_state()
        await self.start_game_loop()

        left_username, right_username = await self.get_left_right_usernames(self.match_id)
        await self.channel_layer.group_send(self.room_group_name, {
            "type": "players_info",
            "left_username": left_username,
            "right_username": right_username
        })

        countdown_task = asyncio.create_task(self.do_countdown(self.match_id))
        countdown_tasks[self.match_id] = countdown_task

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
        direction = 1 if random.random() < 0.5 else -1
        speed = 8.5

        game_states[self.match_id] = {
            "width": 1000,
            "height": 600,
            "ball_x": 500,
            "ball_y": 300,
            "ball_vx": direction * speed,
            "ball_vy": 0,
            "paddle_left_y": 250,
            "paddle_right_y": 250,
            "paddle_speed_left": 0,
            "paddle_speed_right": 0,
            "paddle_width": 20,
            "paddle_height": 100,
            "score_left": 0,
            "score_right": 0,
            "running": False,
            "next_engagement_left": True
        }


    async def start_game_loop(self):
        game_tasks[self.match_id] = asyncio.create_task(self.game_loop(self.match_id))

    async def do_countdown(self, match_id):
        await asyncio.sleep(5)
        state = game_states.get(match_id)
        if state:
            state["running"] = True

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
        ball_size = 20
        paddle_left_x = 30
        paddle_right_x = w - 30 - state["paddle_width"]
        paddle_height = state["paddle_height"]
        hitbox_padding = 10
        max_speed = 16

        if by <= 0:
            state["ball_y"] = 0
            state["ball_vy"] = -vy
        elif by >= h - ball_size:
            state["ball_y"] = h - ball_size
            state["ball_vy"] = -vy

        def bounce_off_paddle(paddle_y, paddle_speed, is_left):
            ball_center_y = by + ball_size / 2
            paddle_center_y = paddle_y + paddle_height / 2
            relative_intersect = ball_center_y - paddle_center_y
            normalized = relative_intersect / (paddle_height / 2)
            bounce_angle = normalized * (math.pi / 4)
            intensity = 1 + abs(normalized) * 1.1
            base_speed = min(math.hypot(vx, vy) * 1.05 * intensity, max_speed)
            direction = 1 if is_left else -1
            new_vx = direction * base_speed * math.cos(bounce_angle)
            new_vy = base_speed * math.sin(bounce_angle)
            new_vy += paddle_speed * 0.15
            return new_vx, new_vy

        ball_center_y = by + ball_size / 2

        if bx <= paddle_left_x + state["paddle_width"]:
            if state["paddle_left_y"] - hitbox_padding <= ball_center_y <= state["paddle_left_y"] + paddle_height + hitbox_padding:
                new_vx, new_vy = bounce_off_paddle(state["paddle_left_y"], state["paddle_speed_left"], True)
                state["ball_vx"], state["ball_vy"] = new_vx, new_vy
            else:
                state["score_right"] += 1
                await self.reset_ball(state)
                return
        elif bx + ball_size >= paddle_right_x:
            if state["paddle_right_y"] - hitbox_padding <= ball_center_y <= state["paddle_right_y"] + paddle_height + hitbox_padding:
                new_vx, new_vy = bounce_off_paddle(state["paddle_right_y"], state["paddle_speed_right"], False)
                state["ball_vx"], state["ball_vy"] = new_vx, new_vy
            else:
                state["score_left"] += 1
                await self.reset_ball(state)
                return

        if state["score_left"] >= 5 or state["score_right"] >= 5:
            state["running"] = False
            await self.end_game(self.match_id, state)

    async def reset_ball(self, state):
        min_angle = math.radians(5)
        max_angle = math.radians(25)
        angle = random.uniform(min_angle, max_angle)
        angle *= -1 if random.random() < 0.5 else 1
        speed = 8.5
        direction = 1 if state["next_engagement_left"] else -1
        state["ball_vx"] = direction * speed * math.cos(angle)
        state["ball_vy"] = speed * math.sin(angle)
        state["ball_x"] = state["width"] // 2
        state["ball_y"] = state["height"] // 2
        state["next_engagement_left"] = not state["next_engagement_left"]


    async def broadcast_game_state(self, state):
        await self.channel_layer.group_send(self.room_group_name, {
            "type": "update_game_state",
            "state": {
                "ball_x": state["ball_x"],
                "ball_y": state["ball_y"],
                "paddle_left_y": state["paddle_left_y"],
                "paddle_right_y": state["paddle_right_y"],
                "score_left": state["score_left"],
                "score_right": state["score_right"],
            }
        })

    async def update_game_state(self, event):
        await self.send(text_data=json.dumps({
            "type": "game_state",
            **event["state"]
        }))

    async def end_game(self, match_id, state):
        await self.update_database_winner(match_id, state)
        await self.channel_layer.group_send(f"pong_{match_id}", {
            "type": "game_over",
            "score_left": state["score_left"],
            "score_right": state["score_right"]
        })

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
                
class LocalPongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.local_id = self.scope["url_route"]["kwargs"].get("local_id")
        self.random_id = self.scope["url_route"]["kwargs"].get("random_id")

        if self.local_id is None or self.random_id is None:
            await self.close()
            return

        self.connection_key = f"{self.local_id}_{self.random_id}"
        self.room_group_name = f"local_pong_{self.connection_key}"

        if self.connection_key in active_local_connections:
            old_consumer = active_local_connections[self.connection_key]
            if old_consumer != self:
                await old_consumer.close()
            del active_local_connections[self.connection_key]

        active_local_connections[self.connection_key] = self

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        if self.connection_key not in local_game_states:
            self.init_game_state()

        await self.send_json({
            "message": f"Local Pong: connected => (key={self.connection_key})"
        })

        state = local_game_states[self.connection_key]
        if not state.get("running"):
            await self.start_game()

    async def disconnect(self, code):
        if hasattr(self, "connection_key") and self.connection_key in active_local_connections:
            if active_local_connections[self.connection_key] == self:
                del active_local_connections[self.connection_key]

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    def init_game_state(self):
        direction = 1 if random.random() < 0.5 else -1
        speed = 8.5
        local_game_states[self.connection_key] = {
            "width": 1000,
            "height": 600,
            "ball_x": 500,
            "ball_y": 300,
            "ball_vx": direction * speed,
            "ball_vy": 0,
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

    async def start_game(self):
        state = local_game_states[self.connection_key]
        await self.channel_layer.group_send(self.room_group_name, {
            "type": "game_start",
            "message": "La partie va commencer dans 5 secondes (local)."
        })

        await self.channel_layer.group_send(self.room_group_name, {
            "type": "players_info",
            "left_username": "Player 1",
            "right_username": "Player 2"
        })

        if self.connection_key in local_game_tasks:
            local_game_tasks[self.connection_key].cancel()
        local_game_tasks[self.connection_key] = asyncio.create_task(self.game_loop())

        if self.connection_key in countdown_tasks:
            countdown_tasks[self.connection_key].cancel()
        countdown_tasks[self.connection_key] = asyncio.create_task(self.do_countdown())

    async def do_countdown(self):
        await asyncio.sleep(5)
        state = local_game_states.get(self.connection_key)
        if state:
            state["running"] = True

    async def game_loop(self):
        while True:
            state = local_game_states.get(self.connection_key)
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
        paddle_left_x = 30
        paddle_right_x = w - 30 - state["paddle_width"]
        paddle_height = state["paddle_height"]
        hitbox_padding = 10
        max_speed = 16

        if by <= 0:
            state["ball_y"] = 0
            state["ball_vy"] = -vy
        elif by >= h - ball_size:
            state["ball_y"] = h - ball_size
            state["ball_vy"] = -vy

        def bounce_off_paddle(paddle_y, paddle_speed, is_left):
            ball_center_y = by + ball_size / 2
            paddle_center_y = paddle_y + paddle_height / 2
            relative_intersect = ball_center_y - paddle_center_y
            normalized = relative_intersect / (paddle_height / 2)
            bounce_angle = normalized * (math.pi / 4)
            intensity = 1 + abs(normalized) * 1.1
            speed = min(math.hypot(vx, vy) * 1.05 * intensity, max_speed)
            direction = 1 if is_left else -1
            new_vx = direction * speed * math.cos(bounce_angle)
            new_vy = speed * math.sin(bounce_angle)
            new_vy += paddle_speed * 0.15
            return new_vx, new_vy

        ball_center_y = by + ball_size / 2

        if bx <= paddle_left_x + state["paddle_width"]:
            if (state["paddle_left_y"] - hitbox_padding <= ball_center_y <=
                state["paddle_left_y"] + paddle_height + hitbox_padding):
                state["ball_vx"], state["ball_vy"] = bounce_off_paddle(state["paddle_left_y"], state["paddle_speed_left"], True)
            else:
                state["score_right"] += 1
                await self.reset_ball(state)
                return

        elif bx + ball_size >= paddle_right_x:
            if (state["paddle_right_y"] - hitbox_padding <= ball_center_y <=
                state["paddle_right_y"] + paddle_height + hitbox_padding):
                state["ball_vx"], state["ball_vy"] = bounce_off_paddle(state["paddle_right_y"], state["paddle_speed_right"], False)
            else:
                state["score_left"] += 1
                await self.reset_ball(state)
                return

        if state["score_left"] >= 5 or state["score_right"] >= 5:
            state["running"] = False
            await self.end_game(state)

    async def reset_ball(self, state):
        angle = random.uniform(math.radians(5), math.radians(25))
        angle *= -1 if random.random() < 0.5 else 1
        speed = 8.5
        direction = 1 if state["next_engagement_left"] else -1
        state["ball_vx"] = direction * speed * math.cos(angle)
        state["ball_vy"] = speed * math.sin(angle)
        state["ball_x"] = state["width"] // 2
        state["ball_y"] = state["height"] // 2
        state["next_engagement_left"] = not state["next_engagement_left"]

    async def end_game(self, state):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "game_over",
                "score_left": state["score_left"],
                "score_right": state["score_right"]
            }
        )

    async def broadcast_game_state(self, state):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "local_update_game_state",
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

    async def local_update_game_state(self, event):
        await self.send_json({
            "type": "game_state",
            **event["state"]
        })

    async def game_start(self, event):
        await self.send_json({
            "type": "game_start",
            "message": event["message"]
        })

    async def players_info(self, event):
        await self.send_json({
            "type": "players_info",
            "left_username": event["left_username"],
            "right_username": event["right_username"]
        })

    async def game_over(self, event):
        await self.send_json({
            "type": "game_over",
            "score_left": event["score_left"],
            "score_right": event["score_right"]
        })

    async def receive(self, text_data):
        data = json.loads(text_data)
        action_type = data.get("type")
        state = local_game_states.get(self.connection_key)
        if not state:
            return

        if action_type == "local_move":
            left_dir = data.get("leftDir")
            right_dir = data.get("rightDir")

            state["paddle_speed_left"] = -10 if left_dir == "up" else 10 if left_dir == "down" else 0
            state["paddle_speed_right"] = -10 if right_dir == "up" else 10 if right_dir == "down" else 0

    def send_json(self, content):
        return self.send(text_data=json.dumps(content))