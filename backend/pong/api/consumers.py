import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import Match, PlayerMatch
from channels.db import database_sync_to_async

class PongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Connexion d'un joueur au WebSocket"""
        if "player" not in self.scope:
            await self.close()
            return

        self.player = self.scope["player"]
        self.match_id = self.scope["url_route"]["kwargs"].get("match_id")
        
        # Toujours définir room_group_name, même si match_id est temporairement None
        self.room_group_name = f"pong_{self.match_id}" if self.match_id else None

        if self.match_id:
            if await self.is_match_ready(self.match_id):
                await self.close()
                return
            
            self.paddle = await self.assign_player_side(self.match_id, self.player)
            if not self.paddle:
                await self.close()
                return
        else:
            self.match_id = await self.create_match(self.player)
            self.paddle = "left"
            self.room_group_name = f"pong_{self.match_id}"  # Redéfinir après la création du match

        # Vérification finale : `room_group_name` ne doit jamais être None à ce stade
        if not self.room_group_name:
            await self.close()
            return

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

        if await self.is_match_ready(self.match_id):
            await self.start_game()

    async def disconnect(self, close_code):
        """Déconnexion du joueur"""
        if self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    @database_sync_to_async
    def create_match(self, player):
        """Créer un match et assigner le premier joueur"""
        match = Match.objects.create()
        PlayerMatch.objects.create(player=player, match=match, score=0, is_winner=False)
        return match.id

    @database_sync_to_async
    def assign_player_side(self, match_id, player):
        """Assigner un joueur à 'left' ou 'right' selon l'ordre d'arrivée"""
        existing_players = PlayerMatch.objects.filter(match_id=match_id)

        if existing_players.count() == 0:
            return "left"
        elif existing_players.count() == 1:
            PlayerMatch.objects.create(player=player, match_id=match_id, score=0, is_winner=False)
            return "right"
        return None  # Match déjà plein

    @database_sync_to_async
    def is_match_ready(self, match_id):
        """Vérifier si deux joueurs sont connectés"""
        return PlayerMatch.objects.filter(match_id=match_id).count() == 2

    async def start_game(self):
        """Lancer le jeu dès que les deux joueurs sont connectés"""
        if self.room_group_name:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "game_start",
                    "message": "La partie commence !"
                }
            )

    async def game_start(self, event):
        """Envoyer le signal de démarrage aux joueurs"""
        await self.send(text_data=json.dumps({
            "type": "game_start",
            "message": event["message"]
        }))

    async def receive(self, text_data):
        """Recevoir et diffuser les mises à jour des joueurs (mouvements, balle, scores)"""
        if not self.room_group_name:
            return  # Ne rien faire si `room_group_name` n'est pas défini

        data = json.loads(text_data)
        action_type = data.get("type")

        if action_type == "move":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "update_position",
                    "player": self.paddle,  # "left" ou "right"
                    "position": data["position"]
                }
            )

        elif action_type == "ball":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "update_ball",
                    "x": data["x"],
                    "y": data["y"]
                }
            )

        elif action_type == "score":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "update_score",
                    "score1": data["score1"],
                    "score2": data["score2"]
                }
            )

    async def update_position(self, event):
        """Envoyer la mise à jour de la position de la raquette à l'autre joueur"""
        await self.send(text_data=json.dumps({
            "type": "move",
            "player": event["player"],
            "position": event["position"]
        }))

    async def update_ball(self, event):
        """Envoyer la mise à jour de la position de la balle"""
        await self.send(text_data=json.dumps({
            "type": "ball",
            "x": event["x"],
            "y": event["y"]
        }))

    async def update_score(self, event):
        """Envoyer la mise à jour du score"""
        await self.send(text_data=json.dumps({
            "type": "score",
            "score1": event["score1"],
            "score2": event["score2"]
        }))



