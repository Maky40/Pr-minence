
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
    return PlayerMatch.objects.filter(
        player=player,
        match__state='UPL',
        match__tournament__isnull=True
    ).exists()

def is_in_active_tournament(player: Player) -> bool:
    return PlayerTournament.objects.filter(
        player=player,
        tournament__status__in=['PN', 'BG']
    ).exists()



@api_view(['GET'])
def match_exists_view(request, match_id):
    try:
        match = Match.objects.get(id=match_id)
        return Response({
            "detail": "Match exists.",
            "state_code": match.state,          # Renvoie "UPL" ou "PLY"
        }, status=status.HTTP_200_OK)
    except Match.DoesNotExist:
        return Response({"detail": "Le Match n'existe pas."}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@jwt_cookie_required
def create_individual_match(request):

    try:
        player_id = request.decoded_token['id']
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return Response({"error": "Ce joueur n'existe pas."}, status=404)

    # Vérifier qu'il n'a pas déjà un match unplayed
    if has_unplayed_match(player):
        return Response(
            {"error": "Vous avez deja un match en cours non joue. Veuillez annuler ou terminer celui ci avant d'en lancer un autre"},
            status=400
        )

    # Vérifier qu'il n'est pas dans un tournoi actif
    if is_in_active_tournament(player):
        return Response(
            {"error": "Vous etes dans un tournoi en cours. Vous ne pouvez pas lancer de match tant que le tournoi n'est pas fini."},
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
    match_id = request.data.get('match_id')
    if not match_id:
        return Response({"error": "Aucun match_id fourni dans la requete."}, status=400)

    try:
        player_id = request.decoded_token['id']
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return Response({"error": "Ce joueur n'existe pas."}, status=404)

    # Vérifier qu'il n'a pas déjà un match unplayed
    if has_unplayed_match(player):
        return Response(
            {"error": "Vous avez deja un match en cours non joue. Veuillez annuler ou terminer celui ci avant d'en lancer un autre."},
            status=400
        )

    # Vérifier qu'il n'est pas dans un tournoi actif
    if is_in_active_tournament(player):
        return Response(
            {"error": "Vous etes dans un tournoi en cours. Vous ne pouvez pas lancer de match tant que le tournoi n'est pas fini."},
            status=400
        )

    # Vérifier que le match existe
    match = get_object_or_404(Match, id=match_id, state='UPL', tournament__isnull=True)
    
    pong_url = f"wss://pong/ws/pong/{match.id}/"

    return Response({
        "message": "Match accepte.",
        "pong_url": pong_url
    }, status=200)



@api_view(['POST'])
@jwt_cookie_required
def refuse_individual_match(request):

    match_id = request.data.get('match_id')
    if not match_id:
        return Response({"error": "Aucun match_id fourni dans la requete."}, status=400)

    match = get_object_or_404(Match, id=match_id, state='UPL', tournament__isnull=True)

    # Vérifier le nombre de joueurs déjà inscrits
    existing_count = PlayerMatch.objects.filter(match=match).count()
    if existing_count <= 1:
        match.delete()
        return Response({"message": "Invitation refusee et match supprime."}, status=200)

    return Response({"message": "Invitation refusee."}, status=200)

@api_view(['POST'])
@jwt_cookie_required
def delete_individual_match(request):
    try:
        player_id = request.decoded_token['id']
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return Response({"error": "Ce joueur n'existe pas."}, status=404)

    unplayed_qs = PlayerMatch.objects.filter(
        player=player,
        match__state='UPL',
        match__tournament__isnull=True
    ).select_related('match')

    # Si aucun match unplayed
    if not unplayed_qs.exists():
        return Response({"error": "Aucun match non joue a supprimer."}, status=400)

    # Si le joueur a plus d'un match unplayed, on peut renvoyer une erreur ou en supprimer un seul
    if unplayed_qs.count() > 1:
        return Response({
            "error": "Vous avez plusieurs matchs non joue. Veuillez contacter le support."
        }, status=400)

    # On récupère le seul PlayerMatch unplayed
    player_match = unplayed_qs.first()
    match = player_match.match

    # Vérifier qu'il n'y a qu'un seul joueur dans ce match
    existing_count = PlayerMatch.objects.filter(match=match).count()
    if existing_count > 1:
        return Response({
            "error": "Vous ne pouvez pas supprimer un match qui contient plus d'un joueur."
        }, status=400)

    # Si on est ici, c'est qu'il n'y a qu'un seul joueur : le créateur
    match.delete()
    return Response({"message": "Suppression du match non joue reussie."}, status=200)

@api_view(['GET'])
@jwt_cookie_required
def get_individual_match(request):
    try:
        player_id = request.query_params.get('id')
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return Response({"error" : "Ce joueur n'existe pas."}, status = 404)
    match_ids = PlayerMatch.objects.filter(player=player).values_list('match_id', flat=True)

    return Response({"matches": list(match_ids)}, status=200)
