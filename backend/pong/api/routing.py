from django.urls import path
from .consumers import PongConsumer

websocket_urlpatterns = [
    path('ws/pong/', PongConsumer.as_asgi()),
    path('ws/pong/<int:match_id>/', PongConsumer.as_asgi()),
]
