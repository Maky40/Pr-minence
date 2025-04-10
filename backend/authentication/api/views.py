from django.conf import settings
from django.utils.http import urlencode
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from django.shortcuts import redirect
from os import getenv
import requests
from .service import generate_jwt, create_player, jwt_cookie_required
from django.core.cache import cache
from .models import Player
from rest_framework import status
from rest_framework.views import APIView
from .serializers import SignupSerializer, LoginSerializer
import pyotp
import re
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


@api_view(['GET'])
def intra_auth(request):
    # URL de redirection configurée dans l'API 42
    redirect_uri = getenv("INTRA_REDIRECT_URI")
    # Paramètres OAuth2 pour l'API 42
    params = {
        "client_id": getenv("INTRA_CLIENT_ID"),  # Récupère le client_id depuis les variables d'environnement
        "redirect_uri": redirect_uri,          # Récupère l'URL de redirection configurée
        "response_type": "code",               # Type d'autorisation (code OAuth2)
        "scope": "public",                     # Accès public (par défaut pour Intra 42)
    }

    # Construire l'URL finale pour l'authentification
    authorization_url = f"https://api.intra.42.fr/oauth/authorize?{urlencode(params)}"

    # Rediriger l'utilisateur vers Intra 42 pour autorisation
    return redirect(authorization_url)


@api_view(['GET'])
def intra_callback_auth(request):
    # Récupérer le code d'autorisation depuis la requête
    code = request.GET.get('code')
    if not code:
        return Response({"error": "Code d'autorisation manquant"}, status=400)

    # Préparer les données pour l'échange du code contre un token d'accès
    data = {
        "grant_type": "authorization_code",
        "client_id": getenv("INTRA_CLIENT_ID"),
        "client_secret": getenv("INTRA_CLIENT_SECRET"),
        "code": code,
        "redirect_uri": getenv("INTRA_REDIRECT_URI"),
    }

    # Envoyer la requête POST pour obtenir le token d'accès
    token_response = requests.post("https://api.intra.42.fr/oauth/token", data=data)
    if not token_response.ok:
        return Response({"error": "Échec lors de la récupération du token"}, status=401)

    # Extraire le token d'accès depuis la réponse
    access_token = token_response.json().get("access_token")
    if not access_token:
        return Response({"error": "AccessToken non trouvé"}, status=401)

    # Utiliser le token d'accès pour récupérer les informations utilisateur
    user_response = requests.get(
        "https://api.intra.42.fr/v2/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if not user_response.ok:
        return Response({"error": "Échec lors de la récupération des informations utilisateur"}, status=401)

    # Extraire les données de l'utilisateur depuis la réponse
    player_data = {
        "email": user_response.json()['email'],
        "username": user_response.json()['login'],
        "first_name": user_response.json()['first_name'],
        "last_name": user_response.json()['last_name'],
        "avatar": user_response.json()['image']['link'],
    }

    # Créer ou récupérer un joueur dans la base de données
    player = create_player(player_data)
    if player is None:
        # Rediriger vers la page de connexion en cas d'échec
        return redirect(f"https://{settings.IP_ADDRESS}/#connexion/", permanent=True)
    player.from_42 = True
    player.save()
    # Générer un token JWT pour le joueur
    jwt_token = generate_jwt(player.id, player.two_factor)

    # Rediriger vers le frontend avec un cookie JWT
    frontend_url = f'https://{settings.IP_ADDRESS}/#home'
    response = redirect(frontend_url)

    # Ajouter le token JWT et le pseudo dans les cookies
    response.set_cookie('jwt_token', jwt_token, httponly=True, secure=True)
    return response


@api_view(["GET"])
@jwt_cookie_required
def logout_user(request):
    if request.token is not None:
        id = request.decoded_token['id']
        user = Player.objects.get(id=id)
        print("JE PASSE DANS LOGOUT USER")

        # Invalidate the token
        cache.set(request.token, True, timeout=None)

        # Prepare the response
        response = redirect(f"https://{settings.IP_ADDRESS}/#connexion/", permanent=True)
        response.delete_cookie("jwt_token")

        # Update user status
        user.status = "OF"
        user.save()

        # Send force logout message to all tabs of this user
        group_name = f"user_{user.id}"
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "force_logout"  # This will trigger the force_logout method in the consumer
            }
        )

        return response
    else:
        return Response({"statusCode": 400, "detail": "Token non valide"})

class SignupView(APIView):
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "status": 201,
                "message": "Inscription réussie. Veuillez vous connecter."
            }, status=status.HTTP_201_CREATED)
        return Response({
            "status": 400,
            "errors": serializer.errors,
        }, status=status.HTTP_200_OK)

# views.py
class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            jwt_token = generate_jwt(user.id, user.two_factor)

            # Déterminer si HttpOnly doit être activé ou non
            http_only_value = not user.two_factor  # False si 2FA actif, True sinon

            response = Response({
                "status": 200,
                "message": "Connexion réussie",
            }, status=status.HTTP_200_OK)

            response.set_cookie(
                'jwt_token',
                jwt_token,
                httponly=http_only_value,  # Dynamique en fonction du 2FA
                secure=True,
                samesite='Strict'
            )
            return response

        return Response({
            "status": 400,
            "errors": serializer.errors,
        }, status=status.HTTP_400_BAD_REQUEST)


class Verify2FAView(APIView):

    @method_decorator(jwt_cookie_required)
    def post(self, request):
        try:
            id = request.decoded_token['id']
            user = Player.objects.get(id=id)
            otp_code = request.data.get("otp_code")

            # Vérifier que le 2FA est bien activé
            if not user.two_factor or not user.otp_secret:
                return Response({"error": "Le 2FA n'est pas active."}, status=400)

            # Vérifier que l'OTP est bien une chaîne de 6 chiffres
            if not otp_code or not re.fullmatch(r"\d{6}", otp_code):
                return Response({"error": "Le code doit etre une chaine de 6 chiffres."}, status=400)

            # Vérifier le code OTP avec pyotp
            totp = pyotp.TOTP(user.otp_secret)
            if totp.verify(otp_code):
                # Générer un nouveau JWT avec two_factor=False (car déjà vérifié)
                jwt_token = generate_jwt(user.id, False)

                response = Response({
                    "status": 200,
                    "message": "Verification 2FA reussie"
                }, status=status.HTTP_200_OK)

                response.set_cookie(
                    'jwt_token',
                    jwt_token,
                    httponly=True,
                    secure=True,
                    samesite='Strict'
                )
                return response
            else:
                return Response({"error": "Invalid OTP code."}, status=400)

        except Player.DoesNotExist:
            return Response({"status": 404, "message": "Ce jouer n'existe pas."})

        except Exception as e:
            return Response({"status": 500, "message": str(e)})
