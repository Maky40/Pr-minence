from rest_framework import serializers
from .models import Player
from django.conf import settings
from django.contrib.auth import authenticate
import re
from django.core.validators import EmailValidator

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = Player
        fields = ['email', 'username', 'first_name', 'last_name', 'password', 'avatar']
        extra_kwargs = {
            'avatar': {'required': False},
        }

    def validate_email(self, value):
        if len(value) > 100:
            raise serializers.ValidationError("L'adresse email ne doit pas dépasser 100 caractères.")
        EmailValidator()(value)
        if Player.objects.filter(email=value).exists():
            raise serializers.ValidationError("L'inscription a échoué.")
        return value

    def validate_username(self, value):
        if len(value.strip()) == 0 or len(value) > 50:
            raise serializers.ValidationError("Le nom d'utilisateur doit faire entre 1 et 50 caractères.")
        if Player.objects.filter(username=value).exists():
            raise serializers.ValidationError("L'inscription a échoué.")
        return value

    def validate_first_name(self, value):
        value = ' '.join(value.strip().split())
        if len(value) == 0 or len(value) > 50:
            raise serializers.ValidationError("Le prénom doit faire entre 1 et 50 caractères.")
        if not re.match(r"^[A-Za-zÀ-ÿ0-9'@.\- ]+$", value):
            raise serializers.ValidationError("Le prénom contient des caractères non autorisés.")
        return value

    def validate_last_name(self, value):
        value = ' '.join(value.strip().split())
        if len(value) == 0 or len(value) > 50:
            raise serializers.ValidationError("Le nom doit faire entre 1 et 50 caractères.")
        if not re.match(r"^[A-Za-zÀ-ÿ0-9'@.\- ]+$", value):
            raise serializers.ValidationError("Le nom contient des caractères non autorisés.")
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Le mot de passe doit contenir au moins 8 caractères.")
        if len(value) > 100:
            raise serializers.ValidationError("Le mot de passe ne doit pas dépasser 100 caractères.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        avatar = validated_data.pop('avatar', settings.DEFAULT_AVATAR_URL)
        user = Player(avatar=avatar, **validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])
        if user:
            data['user'] = user
            return data
        raise serializers.ValidationError("Identifiants invalides ou compte inactif.")






