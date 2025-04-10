from django.urls import path
from .consumers import PongConsumer, LocalPongConsumer

websocket_urlpatterns = [
    path('ws/pong/', PongConsumer.as_asgi()),
    path('ws/pong/<int:match_id>/', PongConsumer.as_asgi()),
	path('ws/pong/local/<int:local_id>/', LocalPongConsumer.as_asgi()),
	path('ws/pong/local/<int:local_id>/<int:random_id>/', LocalPongConsumer.as_asgi()),
]
