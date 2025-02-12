import re
import jwt
from channels.auth import AuthMiddlewareStack
from django.db import close_old_connections
from .settings import SECRET_KEY
from .models import Player
from channels.db import database_sync_to_async

# Faire un appel a la BDD de maniere asynchrone
@database_sync_to_async
def get_player_by_id(id):
    return Player.objects.get(id=id)

class TokenMiddleware:
    def __init__(self, inner):
        self.inner = inner
	# Fonction appelee a chaque connexion a un websocket
    async def __call__(self, scope, receive, send):
        close_old_connections()
        headers = dict(scope["headers"])
        if b"cookie" in headers:
            cookies = headers[b"cookie"].decode()
            match = re.search("jwt_token=(.*)", cookies) # Verifie la presence du cookie JWT stocker en bytes
            if match is not None:
                token_key = match.group(1)
                await self.decode_token(token_key, scope)
                return await self.inner(scope, receive, send) # Appel du Middleware standard qui appelera a son tour le consumer
        scope['status'] = "Not Connected"
        return await self.inner(scope, receive, send) # Appel du Middleware standard qui appelera a son tour le consumer

    async def decode_token(self, token_key, scope):
        try:
            payload = jwt.decode(token_key, SECRET_KEY, algorithms=['HS256'])
            if (payload['twofa']):
                scope['status'] = "Twofa"
                return
            scope['player'] = await get_player_by_id(payload['id'])
            scope['status'] = "Valid"
        except Player.DoesNotExist:
            scope['status'] = "Not Connected"
        except jwt.InvalidTokenError:
            scope['status'] = "Not connected"


MyAuthMiddlewareStack = lambda inner: TokenMiddleware(AuthMiddlewareStack(inner)) # Execution = Token Middleware -> Auth Middleware classique de Django -> Inner (les consumers)