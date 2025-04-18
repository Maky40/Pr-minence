from django.conf import settings
from django.core.cache import cache
from rest_framework.response import Response
from typing import Dict
import datetime
import jwt
import uuid
from .models import Player
from datetime import datetime, timedelta, timezone


def generate_jwt(id: int, two_factor: bool) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        'id': id,
        'twofa': two_factor,
        'exp': now + timedelta(days=1),
        'iat': now,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def jwt_cookie_required(view_func):
    def wrapped_view(request):
        if "jwt_token" not in request.COOKIES:
            return Response({"statusCode": 401, 'error': 'JWT token cookie missing'})
        token = request.COOKIES.get("jwt_token")
        try:
            request.token = token
            decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            #if (decoded_token['twofa']):
            #    return Response({"statusCode": 401, "error": "2FA required"})
            request.decoded_token = decoded_token
            return view_func(request)
        except jwt.ExpiredSignatureError:
            return Response({"statusCode": 401, 'error': 'Token is expired'})
        except jwt.InvalidTokenError:
            return Response({"statusCode": 401, 'error': 'Invalid token'})
        except Exception as e:
            return Response({"statusCode": 500, 'error': str(e)})
    return wrapped_view



def create_player(player_data: Dict[str, str]):
    try:
        email = player_data['email']
        if Player.objects.filter(email=email).exists():
            return Player.objects.get(email=email)
        
        base_username = player_data['username']
        username = base_username
        while Player.objects.filter(username=username).exists():
            unique_suffix = uuid.uuid4().hex[:6]  # suffixe aléatoire de 6 caractères
            username = f"{base_username}_{unique_suffix}"
        
        first_name = player_data['first_name']
        last_name = player_data['last_name']
        avatar = player_data['avatar']
        player = Player.objects.create(
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name,
            avatar=avatar,
        )
        return player
    except Exception as e:
        return None

