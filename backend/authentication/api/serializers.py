from rest_framework import serializers
from .models import Player
from django.conf import settings
from django.contrib.auth import authenticate
import re
from django.core.validators import EmailValidator


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)

    class Meta:
        model = Player
        fields = ['email', 'username', 'first_name', 'last_name', 'password', 'avatar']
        extra_kwargs = {
            'avatar': {'required': False},
        }

    def validate_email(self, value):
        EmailValidator()(value)
        if Player.objects.filter(email=value).exists():
            raise serializers.ValidationError("L'inscription a échoué.")
        return value

    def validate_username(self, value):
        if Player.objects.filter(username=value).exists():
            raise serializers.ValidationError("L'inscription a échoué.")
        return value

    def validate_first_name(self, value):
        # Autoriser lettres, chiffres, ', @, -, espace, et .
        if not re.match(r"^[A-Za-zÀ-ÿ0-9'@.\- ]+$", value):
            raise serializers.ValidationError("Le prénom contient des caractères non autorisés.")
        return value

    def validate_last_name(self, value):
        if not re.match(r"^[A-Za-zÀ-ÿ0-9'@.\- ]+$", value):
            raise serializers.ValidationError("Le nom contient des caractères non autorisés.")
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
        user = authenticate(username=data['email'], password=data['password'])  # username ici
        if user:
            data['user'] = user
            return data
        raise serializers.ValidationError("Identifiants invalides ou compte inactif.")


