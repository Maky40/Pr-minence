import re
import jwt
from channels.auth import AuthMiddlewareStack
from django.db import close_old_connections
from .settings import SECRET_KEY
from .models import Player
from channels.db import database_sync_to_async

@database_sync_to_async
def get_player_by_id(id):
    """Récupère un joueur à partir de son ID en base"""
    try:
        return Player.objects.get(id=id)
    except Player.DoesNotExist:
        return None

class TokenMiddleware:
    """Middleware qui vérifie et décode le token JWT"""
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        close_old_connections()
        headers = dict(scope["headers"])

        if b"cookie" in headers:
            cookies = headers[b"cookie"].decode()
            match = re.search(r"jwt_token=([^;]+)", cookies)  # Extraction du token JWT
        
            if match:
                token_key = match.group(1)
                player = await self.decode_token(token_key)
                if player:
                    scope['player'] = player  # On stocke le joueur dans le scope
        
        # Si aucun joueur n'est trouvé, on ferme la connexion
        if 'player' not in scope:
            return

        return await self.inner(scope, receive, send)

    async def decode_token(self, token_key):
        """Décoder le token JWT et récupérer le joueur"""
        try:
            payload = jwt.decode(token_key, SECRET_KEY, algorithms=['HS256'])
            return await get_player_by_id(payload['id'])
        except (jwt.InvalidTokenError, Player.DoesNotExist):
            return None

MyAuthMiddlewareStack = lambda inner: TokenMiddleware(AuthMiddlewareStack(inner))

