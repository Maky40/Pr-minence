from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Player
import logging

playersOpenTabs = {}

@database_sync_to_async
def set_player_status(player,  playerStatus):
    player.status = playerStatus
    player.save(update_fields=["status"])

class OnlineConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("Scope path:", self.scope.get("path"))
        await self.accept()
        self.id = None
        if self.scope['status'] == 'Valid':
            self.player = self.scope['player']
            self.id = self.player.id
            if self.id not in playersOpenTabs:
                await set_player_status(self.player, 'ON')
                playersOpenTabs[self.id] = 1 # Creer le joueur dans le dict python
            else:
                playersOpenTabs[self.id] += 1 # Incrementer le nombre d'onglets du joueur
        await self.send(self.scope['status'])

    async def disconnect(self, close_code):
        if self.id is None:
            return
        if playersOpenTabs[self.id] == 1:
            await set_player_status(self.player, 'OF')
            del playersOpenTabs[self.id]
        else:
            playersOpenTabs[self.id] -= 1

    async def receive(self, text_data):
        pass