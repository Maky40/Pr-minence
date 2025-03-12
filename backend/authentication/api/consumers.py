from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Player
import logging
import json

playersOpenTabs = {}

@database_sync_to_async
def set_player_status(player,  playerStatus):
    player.status = playerStatus
    player.save(update_fields=["status"])

@database_sync_to_async
def get_friends(player):
    return player.get_friends()

class OnlineConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("Scope path:", self.scope.get("path"))
        await self.accept()
        self.id = None
        if self.scope['status'] == 'Valid':
            self.player = self.scope['player']
            self.id = self.player.id
            self.group_name = f"user_{self.player.id}"
            await self.channel_layer.group_add(
				self.group_name,
				self.channel_name
			)
            print(f"Connected to group: {self.group_name}")
            if self.id not in playersOpenTabs:
                await set_player_status(self.player, 'ON')
                playersOpenTabs[self.id] = 1 # Creer le joueur dans le dict python
                await self.notify_friends('ON')
            else:
                playersOpenTabs[self.id] += 1 # Incrementer le nombre d'onglets du joueur
        await self.send(text_data=json.dumps({
            "type": "status",
            "status": self.scope['status']
            }))

    async def disconnect(self, close_code):
        if self.id is None:
            return
        if playersOpenTabs[self.id] == 1:
            await set_player_status(self.player, 'OF')
            del playersOpenTabs[self.id]
            await self.notify_friends('OF')
        else:
            playersOpenTabs[self.id] -= 1

    async def receive(self, text_data):
        print("Message reçu:", text_data)
        data = json.loads(text_data)
        message_type = data.get("type")
        if message_type == "status_update":
            status = data.get("status")
            await self.notify_friends(status)
        if message_type == "force_logout":
            print("on ferme les onglets")
            playersOpenTabs[self.id] = 0
            await self.close()

    async def notify_friends(self,status):
        friends = await get_friends(self.player)
        for friend in friends:
            print("ON envoie de la notif")
            await self.channel_layer.group_send(
                f"user_{friend.id}",
                {
                    "type": "status_update",
                    "user_id": self.id,
                    "status": status,
				}
			)

    async def status_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "status_update",
            "user_id": event["user_id"],
            "status": event["status"],
		}))

    async def force_logout(self, event):
        print("Force logout message received in consumer")
        await self.send(text_data=json.dumps({
            "type": "force_logout",
            "redirect_url": "#connexion"
        }))