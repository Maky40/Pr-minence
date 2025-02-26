from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Tournament, Player, Match, PlayerMatch, PlayerTournament
from .serializers import TournamentSerializer
from .decorators import jwt_cookie_required

def update_tournament(tournament_id):
    tournament = Tournament.objects.get(id=tournament_id)
    if tournament.status == 'FN':  # Tournament is finished
        return
    current_round = tournament.current_round
    current_round_matches = Match.objects.filter(tournament=tournament, round=current_round)

    if all(match.state == 'PLY' for match in current_round_matches):
        if tournament.current_round == 'FN':  # If already in Final, set to Finished
            tournament.status = 'FN'  
            winner = PlayerMatch.objects.get(match__in=current_round_matches, is_winner=True)
            winner.player.champions += 1
            tournament.save()
            winner.player.save()
            return
        
        winning_players = list(PlayerMatch.objects.filter(match__in=current_round_matches, is_winner=True))
        
        if winning_players:
            if tournament.current_round == 'QU':  # Quarter to Half
                tournament.current_round = 'HF'
            elif tournament.current_round == 'HF':  # Half to Final
                tournament.current_round = 'FN'
            tournament.save()

        while len(winning_players) >= 2:
            player1_match = winning_players.pop(0)
            player2_match = winning_players.pop(0)
            player1 = player1_match.player
            player2 = player2_match.player

            tournament_match = Match.objects.create(
                tournament=tournament,
                round=tournament.current_round
            )

            PlayerMatch.objects.create(
                match=tournament_match,
                player=player1
            )
            PlayerMatch.objects.create(
                match=tournament_match,
                player=player2
            )


class TournamentView(APIView):

    @method_decorator(jwt_cookie_required)
    def get(self, request):
        player_id = request.decoded_token['id']
        player = Player.objects.get(id=player_id)

        # Vérifie si le joueur est dans un tournoi
        tournament = Tournament.objects.filter(playertournament__player=player, status='PN').first()
        
        if tournament:
            serializer = TournamentSerializer(tournament, context={"player": player})
            return Response({"statusCode": 200, "current_tournament": serializer.data})
        
        # Si l'utilisateur n'est pas dans un tournoi, renvoie tous les tournois disponibles
        tournaments = Tournament.objects.filter(status='PN')
        if tournaments.exists():
            serializer = TournamentSerializer(tournaments, many=True, context={"player": player})
            return Response({"statusCode": 200, "tournaments": serializer.data})

        return Response({"statusCode": 404, "message": "No active tournaments found"})

    @method_decorator(jwt_cookie_required)
    def post(self, request):
        action = request.data.get('action')
        tournament_id = request.data.get('tournament_id')
        name = request.data.get('tournament_name')
        player_id = request.decoded_token['id']
        
        try:
            player = Player.objects.get(id=player_id)
        except Player.DoesNotExist:
            return Response({"statusCode": 400, "message": "Player does not exist"})

        if "create" in action:
            if not name or len(name) == 0:
                return Response({"statusCode": 400, "message": "Invalid Tournament name"})
            serializer = TournamentSerializer()
            if serializer.is_player_in_tournament(player):
                return Response({"statusCode": 400, "message": "Already in a Tournament"})
            tournament = Tournament.objects.create(name=name)
            PlayerTournament.objects.create(player=player, tournament=tournament, creator=True)
            
            # ✅ Correction ici : Ajout du contexte player pour bien afficher `creator`
            serializer = TournamentSerializer(tournament, context={"player": player})
            return Response({"statusCode": 200, "current_tournament": serializer.data}, status=201)

        try:
            tournament = Tournament.objects.get(id=tournament_id)
            serializer = TournamentSerializer(tournament, context={"player": player})
        except Tournament.DoesNotExist:
            return Response({"statusCode": 404, "message": "Not found"})

        if "join" in action:
            if tournament.status == 'PN' and serializer.get_players_count(tournament) < 8:
                if serializer.is_player_in_tournament(player):
                    return Response({"statusCode": 400, "message": "Already in a Tournament"})
                PlayerTournament.objects.create(player=player, tournament=tournament)
                return Response({"statusCode": 200, "message": "Successfully joined tournament"})
            return Response({"statusCode": 400, "message": "Tournament is full"})

        elif "leave" in action:
            if tournament.status != 'PN':  # Must be pending to leave
                return Response({"statusCode": 400, "message": "Tournament status is not pending"})
            try:
                player_tournament = PlayerTournament.objects.get(player=player, tournament=tournament)
            except PlayerTournament.DoesNotExist:
                return Response({"statusCode": 400, "message": "Player is not in the Tournament"})
            if player_tournament.creator:
                tournament.delete()
                return Response({"statusCode": 200, "message": "Tournament deleted along with player"})
            else:
                player_tournament.delete()
                return Response({"statusCode": 200, "message": "Player removed from Tournament"})

        return Response({"statusCode": 400, "message": "Wrong Action"})




    

