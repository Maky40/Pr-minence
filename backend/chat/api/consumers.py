import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import Player
from .models import Room
from .models import Message
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Connexion WebSocket
        self.player = self.scope.get('player', None)  # Récupère l'utilisateur connecté -> merci middleware
        self.other_player_id = int(self.scope['url_route']['kwargs']['other_player_id'])
        # Creer le nom de la salle commune
        self.room_name = f"chat_{min(self.player.id, self.other_player_id)}_{max(self.player.id, self.other_player_id)}"
        self.room = await self.get_or_create_room()
        # Joindre la salle partagee
        await self.channel_layer.group_add(
            self.room.name,
            self.channel_name
        )
        await self.accept()
        # Recuperer et envoyer l'historique des messages
        await self.send_chat_history()


# /////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
# /////////////////////////////////////////////║                     MESSAGES HANDLING                      ║/////////////////////////////////////////////
# /////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////


    async def receive(self, text_data):
        """Réception et envoi des messages"""
        data = json.loads(text_data)
        message = data.get("message")  # Récupérer le message depuis le datas
        sender_name = data.get("senderName")  # Récupérer senderName depuis le datas
        sender_id = data.get("senderId")  # Récupérer senderId depuis le data
        await self.save_message(message, sender_id)
        # Diffuser le message à tous les utilisateurs dans la salle partagée
        await self.channel_layer.group_send(
            self.room.name,  # Nom de la salle partagée
            {
                "type": "chat_message",  # Type d'événement
                "message": message,  # Message à transmettre
                "senderName": sender_name,
                "senderId": sender_id,
            }
        )

    async def chat_message(self, event):
        """Recevoir les messages dans la salle partagée"""
        message = event["message"]
        sender_name = event["senderName"]
        sender_id = event["senderId"]
        # Envoyer le message aux utilisateurs connectés via WebSocket
        await self.send(text_data=json.dumps({
            "message": message,
            "senderName": sender_name,
            "senderId": sender_id,
        }))

	# async def invitation_play(self, event):
    #     """Recevoir les messages dans la salle partagée"""
    #     sender_name = event["senderName"]
    #     sender_id = event["senderId"]

    #     # Envoyer le message aux utilisateurs connectés via WebSocket
    #     await self.send(text_data=json.dumps({
    #         "message": message,
    #         "senderName": sender_name,
    #         "senderId": sender_id,
    #     }))


# /////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
# /////////////////////////////////////////////║                       FOR CHAT HISTORY                     ║/////////////////////////////////////////////
# /////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

    @database_sync_to_async
    def get_or_create_room(self):
        room_name = f"chat_{min(self.player.id, self.other_player_id)}_{max(self.player.id, self.other_player_id)}"
        room, create = Room.objects.get_or_create(name=room_name)
        if self.player not in room.participants.all():
            room.participants.add(self.player)
        return room

    @database_sync_to_async
    def save_message(self, message, sender_id):
        sender = Player.objects.get(id=sender_id)
        Message.objects.create(room=self.room, sender=sender, message=message)

    @database_sync_to_async
    def get_message_history(self):
        """Récupérer l'historique des messages pour la room"""
        messages = Message.objects.filter(room=self.room).order_by('timestamp')
        # Convert QuerySet to list to avoid async iteration issues
        return list(messages)

    @database_sync_to_async
    def get_sender_username(self, sender_id):
        sender = Player.objects.get(id=sender_id)
        return sender.username

    async def send_chat_history(self):
        # Get message history as a list instead of a QuerySet
        messages = await self.get_message_history()

        for message in messages:
            sender_id = message.sender_id  # Utilise l'ID directement sans accéder à l'objet relation
            sender_name = await self.get_sender_username(sender_id)
            await self.send(text_data=json.dumps({
                "message": message.message,
                "senderName": sender_name,
                "senderId": sender_id,
            }))

# /////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
# /////////////////////////////////////////////║                         DISCONNECT                         ║/////////////////////////////////////////////
# /////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

    async def disconnect(self, close_code):
        """Gestion de la déconnexion WebSocket"""
        await self.channel_layer.group_discard(
            self.room.name,  # Nom de la salle partagée
            self.channel_name
        )