from rest_framework import serializers
from .models import Match, PlayerMatch, Player
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
            'status',
            'from_42',
        ]
        read_only_fields = ['id', 'champions', 'wins', 'losses', 'state']



class MatchPlayerInfoSerializer(serializers.ModelSerializer):
    player_id = serializers.IntegerField(source='player.id')
    username = serializers.CharField(source='player.username')
    avatar = serializers.CharField(source='player.avatar')

    class Meta:
        model = PlayerMatch
        fields = ['player_id', 'username', 'avatar', 'score', 'is_winner']

class PlayerMatchHistorySerializer(serializers.ModelSerializer):
    players = serializers.SerializerMethodField()
    tournament_match = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = ['id', 'created', 'players', 'tournament_match']

    def get_players(self, match):
        player_matches = PlayerMatch.objects.filter(match=match).select_related('player')
        return MatchPlayerInfoSerializer(player_matches, many=True).data

    def get_tournament_match(self, match):
        return match.tournament is not None
