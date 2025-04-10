from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Tournament, Player, Match, PlayerMatch, PlayerTournament
from .serializers import TournamentSerializer
from .decorators import jwt_cookie_required
from django.db import transaction

def update_tournament(tournament_id):
    with transaction.atomic():
        # Verrouiller le tournoi pour éviter des mises à jour concurrentes
        tournament = Tournament.objects.select_for_update().get(id=tournament_id)
        
        if tournament.status == 'FN':  # Le tournoi est terminé
            return

        current_round = tournament.current_round
        current_round_matches = Match.objects.filter(tournament=tournament, round=current_round)

        if all(match.state == 'PLY' for match in current_round_matches):
            if tournament.current_round == 'FN':
                tournament.status = 'FN'
                winner = PlayerMatch.objects.get(match__in=current_round_matches, is_winner=True)
                winner.player.champions += 1
                tournament.save()
                winner.player.save()
                return

            winning_players = list(PlayerMatch.objects.filter(match__in=current_round_matches, is_winner=True))

            if winning_players:
                if tournament.current_round == 'QU':
                    tournament.current_round = 'HF'
                elif tournament.current_round == 'HF':
                    tournament.current_round = 'FN'
                tournament.save()

            while len(winning_players) >= 2:
                player1 = winning_players.pop(0).player
                player2 = winning_players.pop(0).player

                # Vérifier dans la transaction si un match pour ces deux joueurs existe déjà dans ce tournoi et ce round
                match_exists = Match.objects.filter(
                    tournament=tournament,
                    round=tournament.current_round,
                    playermatch__player=player1
                ).filter(
                    playermatch__player=player2
                ).exists()

                if match_exists:
                    continue

                tournament_match = Match.objects.create(
                    tournament=tournament,
                    round=tournament.current_round
                )
                PlayerMatch.objects.create(match=tournament_match, player=player1, player_side='L')
                PlayerMatch.objects.create(match=tournament_match, player=player2, player_side='R')




class TournamentView(APIView):

    @method_decorator(jwt_cookie_required)
    def get(self, request):
        player_id = request.decoded_token['id']
        player = Player.objects.get(id=player_id)

        tournament = Tournament.objects.filter(
            playertournament__player=player,
            status__in=['PN', 'BG']
        ).first()

        if tournament:
            if tournament.status == 'BG':
                update_tournament(tournament.id)

            serializer = TournamentSerializer(tournament, context={"player": player})
            return Response({"statusCode": 200, "current_tournament": serializer.data})
        
        tournaments = Tournament.objects.filter(status='PN')
        if tournaments.exists():
            serializer = TournamentSerializer(tournaments, many=True, context={"player": player})
            return Response({"statusCode": 200, "tournaments": serializer.data})

        return Response({"statusCode": 404, "message": "Aucun tournoi en cours."})

    @method_decorator(jwt_cookie_required)
    def post(self, request):
        action = request.data.get('action')
        tournament_id = request.data.get('tournament_id')
        name = request.data.get('tournament_name')
        player_id = request.decoded_token['id']

        try:
            player = Player.objects.get(id=player_id)
        except Player.DoesNotExist:
            return Response({"statusCode": 400, "message": "Ce joueur n'existe pas."})

        if "create" in action:
            if not name or len(name.strip()) == 0:
                return Response({"statusCode": 400, "message": "Nom de tournoi non valide."})

            if len(name) > 40:
                return Response({"statusCode": 400, "message": "Nom de tournoi trop long(40 caracteres maximum)."})

            if Tournament.objects.filter(name=name, status__in=['PN', 'BG']).exists():
                return Response({"statusCode": 400, "message": "Un tournoi en cours ou en attente avec le meme nom existe deja."})

            serializer = TournamentSerializer()
            if serializer.is_player_in_tournament(player):
                return Response({"statusCode": 400, "message": "Vous etes deja dans un tournoi."})

            tournament = Tournament.objects.create(name=name)
            PlayerTournament.objects.create(player=player, tournament=tournament, creator=True)
            serializer = TournamentSerializer(tournament, context={"player": player})
            return Response({"statusCode": 200, "current_tournament": serializer.data}, status=201)

        try:
            tournament = Tournament.objects.get(id=tournament_id)
            serializer = TournamentSerializer(tournament, context={"player": player})
        except Tournament.DoesNotExist:
            return Response({"statusCode": 404, "message": "Ce joueur n'existe pas."})

        if "join" in action:
            if tournament.status == 'PN' and serializer.get_players_count(tournament) < 8:
                if serializer.is_player_in_tournament(player):
                    return Response({"statusCode": 400, "message": "Vous etes deja dans un tournoi."})
                PlayerTournament.objects.create(player=player, tournament=tournament)
                return Response({"statusCode": 200, "message": "Vous venez de rejoindre un tournoi."})
            return Response({"statusCode": 400, "message": "Le tournoi est deja plein."})

        elif "leave" in action:
            if tournament.status != 'PN':
                return Response({"statusCode": 400, "message": "Le tournoi a deja commence.Vous ne pouvez donc pas le quitter."})
            try:
                player_tournament = PlayerTournament.objects.get(player=player, tournament=tournament)
            except PlayerTournament.DoesNotExist:
                return Response({"statusCode": 400, "message": "Le joueur n'est pas dans le tournoi."})
            if player_tournament.creator:
                tournament.delete()
                return Response({"statusCode": 200, "message": "Tournoi supprime par le createur de celui-ci."})
            else:
                player_tournament.delete()
                return Response({"statusCode": 200, "message": "Le joueur vient de quitter le tournoi."})

        elif "start" in action:
            try:
                player_tournament = PlayerTournament.objects.get(player=player, tournament=tournament)
                if not player_tournament.creator:
                    return Response({"statusCode": 403, "message": "Seul le createur du tournoi peut supprimer celui-ci."})
            except PlayerTournament.DoesNotExist:
                return Response({"statusCode": 400, "message": "Le joueur n'est pas dans le tournoi"})

            players_count = serializer.get_players_count(tournament)
            if players_count != 8:
                return Response({"statusCode": 400, "message": f"Le tournoi ne peut pas commencer. {players_count} joueurs sont dans le tournoi."})

            tournament.status = 'BG'
            tournament.current_round = 'QU'
            tournament.save()

            pts = PlayerTournament.objects.filter(tournament=tournament).select_related('player')
            players_list = [pt.player for pt in pts]

            for i in range(0, 8, 2):
                match = Match.objects.create(
                    tournament=tournament,
                    state='UPL',
                    round='QU'
                )
                PlayerMatch.objects.create(player=players_list[i], match=match, player_side='L')
                PlayerMatch.objects.create(player=players_list[i+1], match=match, player_side='R')

            return Response({"statusCode": 200, "message": "Le tournoi commence"})

        return Response({"statusCode": 400, "message": "Cette action n'existe pas."})







    

