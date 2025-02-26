import json
from channels.generic.websocket import AsyncWebsocketConsumer

class MatchmakingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """ Gère la connexion WebSocket """
        await self.accept()
        await self.send(text_data=json.dumps({
            "message": "WebSocket connection established!"
        }))

    async def disconnect(self, close_code):
        """ Gère la déconnexion WebSocket """
        print(f"WebSocket disconnected with code {close_code}")

    async def receive(self, text_data):
        """ Gère les messages reçus via WebSocket """
        data = json.loads(text_data)
        message = data.get("message", "")

        # Répondre au message reçu
        await self.send(text_data=json.dumps({
            "message": f"Received: {message}"
        }))
