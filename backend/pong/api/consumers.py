import json
from channels.generic.websocket import AsyncWebsocketConsumer

class TestConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Accepter la connexion WebSocket
        await self.accept()
        
        # Afficher le chemin (pour le debug)
        print("TestConsumer connected. Scope path:", self.scope.get("path"))
        
        # Récupérer le status défini par le middleware (ex. "Valid", "Not Connected", etc.)
        status = self.scope.get("status", "No status provided")
        
        # Si le middleware a ajouté le joueur dans le scope, récupérer son nom d'utilisateur
        username = self.scope.get("player").username if "player" in self.scope else "Anonymous"
        
        # Préparer un message de test à envoyer au client
        response = {
            "message": "Connexion WebSocket établie avec succès",
            "status": status,
            "username": username,
        }
        
        # Envoyer le message au client
        await self.send(text_data=json.dumps(response))
        
    async def disconnect(self, close_code):
        print("TestConsumer disconnected with code:", close_code)
        
    async def receive(self, text_data):
        # Pour le test, on affiche le message reçu et on renvoie une réponse d'écho
        print("TestConsumer received:", text_data)
        await self.send(text_data=text_data)
