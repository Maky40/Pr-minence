
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Match
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Player, Match, PlayerMatch
from .decorators import jwt_cookie_required


@api_view(['GET'])
def match_exists_view(request, match_id):
    """
    Vérifie si un match avec 'match_id' existe dans la base.
    Renvoie 200 si oui, 404 sinon.
    """
    if Match.objects.filter(id=match_id).exists():
        return Response({"detail": "Match exists."}, status=status.HTTP_200_OK)
    else:
        return Response({"detail": "Match not found."}, status=status.HTTP_404_NOT_FOUND)
    


@api_view(['POST'])
@jwt_cookie_required
def create_individual_match(request):
    """
    Crée un match "1 vs 1" sans tournoi et associe le joueur initiateur (côté "Left").
    """
    try:
        # Récupération du joueur initiateur depuis le token JWT
        player_id = request.decoded_token['id']
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return Response({"error": "Player not found"}, status=404)

    # Création d'un match sans tournoi (tournament=None) et à l'état 'UPL' (Unplayed)
    match = Match.objects.create(
        tournament=None,
        state='UPL'
    )

    # Associer le joueur initiateur au match (côté Left)
    PlayerMatch.objects.create(
        player=player,
        match=match,
        player_side='L'
    )

    return Response({
        "match_id": match.id
    }, status=201)

@api_view(['POST'])
@jwt_cookie_required
def accept_individual_match(request):
    """
    Le joueur invité accepte le match : on l'associe au match (côté "Right").
    """
    match_id = request.data.get('match_id')
    if not match_id:
        return Response({"error": "No match_id provided"}, status=400)

    try:
        # Récupération du joueur invité depuis le token JWT
        player_id = request.decoded_token['id']
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return Response({"error": "Player not found"}, status=404)

    # Vérifier que le match existe, qu'il est Unplayed, et qu'il n'appartient pas à un tournoi
    match = get_object_or_404(Match, id=match_id, state='UPL', tournament__isnull=True)

    # Vérifier combien de joueurs sont déjà dans ce match
    existing_count = PlayerMatch.objects.filter(match=match).count()
    if existing_count >= 2:
        return Response({"error": "Match is already full"}, status=400)

    # Créer la relation PlayerMatch pour ce joueur (côté "Right")
    PlayerMatch.objects.create(
        player=player,
        match=match,
        player_side='R'
    )

    # Construire l'URL du WebSocket Pong (exemple)
    pong_url = f"ws://pong-service/ws/pong/{match.id}/"

    return Response({
        "message": "Match accepted successfully",
        "pong_url": pong_url
    }, status=200)


@api_view(['POST'])
@jwt_cookie_required
def refuse_individual_match(request):
    """
    Le joueur refuse le match :
    - Si le match n'a qu'un seul joueur (le créateur), on le supprime.
    - Sinon, on se contente de signaler que l'invitation est refusée.
    """
    match_id = request.data.get('match_id')
    if not match_id:
        return Response({"error": "No match_id provided"}, status=400)

    # On récupère le match (unplayed, sans tournoi)
    match = get_object_or_404(Match, id=match_id, state='UPL', tournament__isnull=True)

    # Vérifier le nombre de joueurs déjà inscrits
    existing_count = PlayerMatch.objects.filter(match=match).count()
    if existing_count <= 1:
        # S'il n'y a qu'un seul joueur (celui qui a initié),
        # on peut supprimer le match
        match.delete()
        return Response({"message": "Invitation refused and match deleted"}, status=200)

    # Sinon, on se contente de dire que l'invitation est refusée
    return Response({"message": "Invitation refused (match not deleted because multiple players exist)."}, status=200)

