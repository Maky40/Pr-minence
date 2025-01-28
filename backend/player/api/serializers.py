from rest_framework import serializers
from .models import Player

class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = '__all__'

class PlayerInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = [
            'id',           
            'email',
            'username',
            'first_name',
            'last_name',
            'avatar',
            'champions',
            'wins',
            'losses',
            'two_factor',
            'status',        # Champ avec des choix
        ]
        read_only_fields = ['id', 'champions', 'wins', 'losses', 'state']
