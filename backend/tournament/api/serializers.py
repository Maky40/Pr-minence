from rest_framework import serializers
from .models import Player, Tournament, PlayerMatch, Match, PlayerTournament
from django.db.models import Q


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ('id', 'avatar', 'username')


class PlayerMatchSerializer(serializers.ModelSerializer):
    player = serializers.SerializerMethodField()

    class Meta:
        model = PlayerMatch
        fields = ('player', 'score')

    def get_player(self, player_match):
        return PlayerSerializer(player_match.player).data


class TournamentSerializer(serializers.ModelSerializer):
    matches = serializers.SerializerMethodField()
    creator = serializers.SerializerMethodField()
    players_count = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = ('id', 'name', 'status', 'current_round', 'matches', 'creator', 'players_count')

    def get_matches(self, tournament):
        matches = Match.objects.filter(tournament=tournament)
        serializer = MatchSerializer(matches, context={"player": self.context.get("player")}, many=True)
        return serializer.data
    
    def get_players(self, tournament):
        players = [pt.player for pt in PlayerTournament.objects.filter(tournament=tournament)]
        return PlayerSerializer(players, many=True).data

    def get_players_count(self, tournament):
        return PlayerTournament.objects.filter(tournament=tournament).count()

    def is_player_in_tournament(self, player):
        return Tournament.objects.filter(
            Q(playertournament__player=player) &
            (Q(status='PN') | Q(status='BG'))
        ).first()

    def get_creator(self, tournament):
        player = self.context.get("player")
        if not player:
            return False  # Empêche une erreur si le joueur n'est pas passé dans le contexte

        return PlayerTournament.objects.filter(tournament=tournament, player=player, creator=True).exists()


class MatchSerializer(serializers.ModelSerializer):
    players = serializers.SerializerMethodField()
    current = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = ('id', 'state', 'round', 'current', 'players')

    def get_current(self, match):
        player = self.context.get("player")
        return False if match.state == 'PLY' else PlayerMatch.objects.filter(match=match, player=player).exists()

    def get_players(self, match):
        return PlayerMatchSerializer(PlayerMatch.objects.filter(match=match), many=True).data


