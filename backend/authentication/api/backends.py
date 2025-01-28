from django.contrib.auth.backends import ModelBackend
from .models import Player

class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            user = Player.objects.get(email=username)
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        except Player.DoesNotExist:
            return None

