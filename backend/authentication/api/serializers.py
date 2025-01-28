from rest_framework import serializers
from .models import Player
from django.conf import settings
from django.contrib.auth import authenticate

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)

    class Meta:
        model = Player
        fields = ['email', 'username', 'first_name', 'last_name', 'password','avatar']
        extra_kwargs = {
            'avatar': {'required': False},
        }

    def validate_email(self, value):
        if Player.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value

    def validate_username(self, value):
        if Player.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        # Attribuer l'avatar par défaut si non fourni
        avatar = validated_data.pop('avatar', settings.DEFAULT_AVATAR_URL)
        user = Player(
            avatar=avatar,
            **validated_data
        )
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


