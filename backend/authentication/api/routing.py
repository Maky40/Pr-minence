from django.urls import path
from .consumers import OnlineConsumer

websocket_urlpatterns = [
    path('authentication/ws/online/', OnlineConsumer.as_asgi()),
]