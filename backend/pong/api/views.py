
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Match
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Player, Match, PlayerMatch, PlayerTournament
from .decorators import jwt_cookie_required

def has_unplayed_match(player: Player) -> bool:
    """
    Vérifie si le joueur a déjà un match Unplayed (sans tournoi).
    """
    return PlayerMatch.objects.filter(
        player=player,
        match__state='UPL',
        match__tournament__isnull=True
    ).exists()

def is_in_active_tournament(player: Player) -> bool:
    """
    Vérifie si le joueur est dans un tournoi dont le statut est 'PN' (Pending) ou 'BG' (Begin).
    """

    return PlayerTournament.objects.filter(
        player=player,
        tournament__status__in=['PN', 'BG']
    ).exists()



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
        player_id = request.decoded_token['id']
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return Response({"error": "Player not found"}, status=404)

    # Vérifier qu'il n'a pas déjà un match unplayed
    if has_unplayed_match(player):
        return Response(
            {"error": "You already have an unplayed match. Please delete it or finish it before creating a new one."},
            status=400
        )

    # Vérifier qu'il n'est pas dans un tournoi actif
    if is_in_active_tournament(player):
        return Response(
            {"error": "You are currently in an active tournament. You cannot create an individual match now."},
            status=400
        )

    # Création du match
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
        player_id = request.decoded_token['id']
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return Response({"error": "Player not found"}, status=404)

    # Vérifier qu'il n'a pas déjà un match unplayed
    if has_unplayed_match(player):
        return Response(
            {"error": "You already have an unplayed match. Please delete it or finish it before accepting a new one."},
            status=400
        )

    # Vérifier qu'il n'est pas dans un tournoi actif
    if is_in_active_tournament(player):
        return Response(
            {"error": "You are currently in an active tournament. You cannot accept an individual match now."},
            status=400
        )

    # Vérifier que le match existe
    match = get_object_or_404(Match, id=match_id, state='UPL', tournament__isnull=True)

    # Vérifier combien de joueurs sont déjà dans ce match
    existing_count = PlayerMatch.objects.filter(match=match).count()
    if existing_count >= 2:
        return Response({"error": "Match is already full"}, status=400)

    # Associer le joueur (côté Right)
    PlayerMatch.objects.create(
        player=player,
        match=match,
        player_side='R'
    )

    # Construire l'URL du WebSocket Pong (exemple)
    pong_url = f"wss://pong/ws/pong/{match.id}/"

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

@api_view(['POST'])
@jwt_cookie_required
def delete_individual_match(request):
    try:
        player_id = request.decoded_token['id']
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return Response({"error": "Player not found"}, status=404)

    # Trouver tous les PlayerMatch "unplayed" (sans tournoi) pour ce joueur
    unplayed_qs = PlayerMatch.objects.filter(
        player=player,
        match__state='UPL',
        match__tournament__isnull=True
    ).select_related('match')

    # Si aucun match unplayed
    if not unplayed_qs.exists():
        return Response({"error": "You have no unplayed match to delete."}, status=400)

    # Si le joueur a plus d'un match unplayed, on peut renvoyer une erreur ou en supprimer un seul
    if unplayed_qs.count() > 1:
        return Response({
            "error": "You have multiple unplayed matches. Please resolve or contact support."
        }, status=400)

    # On récupère le seul PlayerMatch unplayed
    player_match = unplayed_qs.first()
    match = player_match.match

    # Vérifier qu'il n'y a qu'un seul joueur dans ce match
    existing_count = PlayerMatch.objects.filter(match=match).count()
    if existing_count > 1:
        return Response({
            "error": "Cannot delete a match that already has multiple players."
        }, status=400)

    # Si on est ici, c'est qu'il n'y a qu'un seul joueur : le créateur
    match.delete()
    return Response({"message": "Your unplayed match has been deleted successfully."}, status=200)


