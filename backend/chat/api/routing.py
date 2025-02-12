from django.urls import path
from .consumers import TestConsumer

websocket_urlpatterns = [
    path('ws/chat/', TestConsumer.as_asgi()),  # Ensure this matches the Nginx path
]