
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Match

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