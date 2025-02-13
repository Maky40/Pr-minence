import json
from channels.generic.websocket import AsyncWebsocketConsumer
# from django.utils.timezone import now
# from .models import Message
# from channels.db import database_sync_to_async

class ChatConsumer (AsyncWebsocketConsumer):
	async def connect(self):
		# Connexion WebSocket
		self.player = self.scope.get('player', None) # Récupère l'utilisateur connecté -> merci middleware
		self.other_player_id = int(self.scope['url_route']['kwargs']['other_player_id'])
		# Creer le nom de la salle commune
		self.room_name = f"chat_{min(self.player.id, self.other_player_id)}_{max(self.player.id, self.other_player_id)}"
		# Joindre la salle partagee
		await self.channel_layer.group_add(
            self.room_name,
            self.channel_name
        )

		await self.accept()

	async def disconnect(self, close_code):
		"""Gestion de la déconnexion WebSocket"""
		await self.channel_layer.group_discard(
            self.room_name,  # Nom de la salle partagée
            self.channel_name
        )

	async def receive(self, text_data):
		"""Réception et envoi des messages"""
		data = json.loads(text_data)
		message = data.get("message")

        # Diffuser le message à tous les utilisateurs dans la salle partagée
		await self.channel_layer.group_send(
            self.room_name,  # Nom de la salle partagée
            {
                "type": "chat_message",  # Type d'événement
                "message": message,  # Message à transmettre
            }
        )

	async def chat_message(self, event):
		"""Recevoir les messages dans la salle partagée"""
		message = event["message"]

		# Envoyer le message aux utilisateurs connectés via WebSocket
		await self.send(text_data=json.dumps({
			"message": message
        }))
