from django.utils.decorators import method_decorator
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import PlayerInfoSerializer, PlayerMatchHistorySerializer
from .models import Player, Friendship, PlayerMatch, Match
from .decorators import jwt_cookie_required
from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.core.files.storage import default_storage
import os
from PIL import Image
from io import BytesIO
import uuid
from django.core.exceptions import ValidationError
import pyotp
import qrcode
import base64
from django.db.models import Q
from PIL import Image
from rest_framework.decorators import api_view
from rest_framework import status
from .decorators import jwt_cookie_required
from .models import Player, PlayerMatch
import json
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import re


class PlayerSearch(APIView):
    @method_decorator(jwt_cookie_required)
    def get(self, request):
        try:
            search_query = request.query_params.get('username', '').strip()
            current_user_id = request.decoded_token['id']

            if len(search_query) > 50:
                return Response({
                    "status": 400,
                    "message": "Le nom d'utilisateur ne peut pas dépasser 50 caractères.",
                })

            players = Player.objects.filter(
                username__icontains=search_query
            ).exclude(
                id=current_user_id
            ).order_by('username')[:5]

            serializer = PlayerInfoSerializer(players, many=True)

            return Response({
                "status": 200,
                "players": serializer.data,
                "message": f"{len(serializer.data)} joueurs trouvés."
            })

        except Exception as e:
            return Response({
                "status": 500,
                "message": str(e)
            }, status=500)


class PlayerInfo(APIView):

    @method_decorator(jwt_cookie_required)
    def get(self, request):
        try:
            username = request.query_params.get('username')
            if username:
                username = username.strip()

                if len(username) > 50:
                    return Response({
                        "status": 400,
                        "message": "Le nom d'utilisateur est trop long.",
                    })

                player = Player.objects.filter(username=username)
                if not player.exists():
                    raise Player.DoesNotExist

                serializer = PlayerInfoSerializer(player, many=True)
                return Response({
                    "status": 200,
                    "players": serializer.data,
                    "message": "Joueur correspondant trouvé dans la base de données"
                })

            player = Player.objects.get(id=request.decoded_token['id'])
            serializer = PlayerInfoSerializer(player)
            return Response({
                "status": 200,
                "player": serializer.data
            })

        except Player.DoesNotExist:
            return Response({
                "status": 404,
                "message": "Ce joueur n'existe pas",
            })
        except Exception as e:
            return Response({
                "status": 500,
                "message": str(e),
            })

    @method_decorator(jwt_cookie_required)
    def post(self, request):
        try:
            changed = False
            user_id = request.decoded_token['id']
            player_data = request.data.get('player')
            player = Player.objects.get(id=user_id)

            if "first_name" in player_data:
                first_name_raw = player_data['first_name']
                if not isinstance(first_name_raw, str):
                    return Response({"status": 400, "message": "Le prénom doit être une chaîne de caractères."})
                first_name = ' '.join(first_name_raw.strip().split())
                if len(first_name) == 0 or len(first_name) > 50:
                    return Response({"status": 400, "message": "Le prénom contient trop de caractères (ou aucun)."})
                if not re.match(r"^[A-Za-zÀ-ÿ0-9'@.\- ]+$", first_name):
                    return Response({"status": 400, "message": "Le prénom contient des caractères interdits."})
                player.first_name = first_name
                changed = True

            if "last_name" in player_data:
                last_name_raw = player_data['last_name']
                if not isinstance(last_name_raw, str):
                    return Response({"status": 400, "message": "Le nom doit être une chaîne de caractères."})
                last_name = ' '.join(last_name_raw.strip().split())
                if len(last_name) == 0 or len(last_name) > 50:
                    return Response({"status": 400, "message": "Le nom contient trop de caractères (ou aucun)."})
                if not re.match(r"^[A-Za-zÀ-ÿ0-9'@.\- ]+$", last_name):
                    return Response({"status": 400, "message": "Le nom contient des caractères interdits."})
                player.last_name = last_name
                changed = True

            if "username" in player_data:
                username_raw = player_data['username']
                if not isinstance(username_raw, str):
                    return Response({"status": 400, "message": "Le nom d'utilisateur doit être une chaîne de caractères."})
                username = username_raw.strip()
                if len(username) == 0 or len(username) > 50:
                    return Response({"status": 400, "message": "Le nom d'utilisateur doit contenir entre 1 et 50 caractères."})
                if Player.objects.filter(username=username).exclude(id=player.id).exists():
                    return Response({"status": 400, "message": "Ce nom d'utilisateur existe déjà."})
                player.username = username
                changed = True

            player.save()
            message = "Les informations du joueur sont actualisées" if changed else "Aucun changement"
            return Response({
                "status": 200,
                "message": message,
            })

        except Player.DoesNotExist:
            return Response({
                "status": 404,
                "message": "Le joueur n'existe pas",
            })
        except Exception as e:
            return Response({
                "status": 500,
                "message": str(e),
            })


class TwoFactorActivation(APIView):

    @method_decorator(jwt_cookie_required)
    def post(self, request):
        try:
            id = request.decoded_token['id']
            player = Player.objects.get(id=id)

            # Récupérer les paramètres envoyés
            activate_2fa = request.data.get("activate_2fa", None)
            show_qr_code = request.data.get("show_qr_code", False)  # Permet d'afficher le QR Code

            if activate_2fa is None and not show_qr_code:
                return Response({"status": 400, "message": "Champ 'activate_2FA' manquant ou 'show_qr_code' manquant."})

            # Cas où l'on veut activer ou désactiver le 2FA
            if activate_2fa is not None:
                if activate_2fa:  # Activation du 2FA
                    if not player.otp_secret:
                        player.otp_secret = pyotp.random_base32()  # Générer une clé secrète
                    player.two_factor = True
                    player.save()
                    return Response({"status": 200, "message": "2FA active. Vous pouvez scanner le QR Code."})

                else:  # Désactivation du 2FA
                    player.two_factor = False
                    player.otp_secret = None  # Supprimer la clé secrète
                    player.save()
                    return Response({"status": 200, "message": "2FA desactive."})

            # Cas où l'on veut seulement afficher le QR Code
            if show_qr_code:
                if not player.two_factor or not player.otp_secret:
                    return Response({"status": 400, "message": "2FA n'est pas active.Vous devez activer le 2FA."})

                # Générer l'URI pour Google Authenticator
                otp_uri = pyotp.TOTP(player.otp_secret).provisioning_uri(name=player.email, issuer_name="MyApp")

                # Générer le QR Code
                qr = qrcode.make(otp_uri)
                buffer = BytesIO()
                qr.save(buffer, format="PNG")
                qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

                return Response({
                    "status": 200,
                    "message": "Scannez ce QR Code avec Google Authenticator.",
                    "qr_code": f"data:image/png;base64,{qr_base64}"
                })

        except Player.DoesNotExist:
            return Response({"status": 404, "message": "Ce joueur n'existe pas."})

        except Exception as e:
            return Response({"status": 500, "message": str(e)})


class PlayerAvatarUpload(APIView):

    @method_decorator(jwt_cookie_required)
    def post(self, request):
        try:
            id = request.decoded_token['id']
            if 'avatar' not in request.FILES:
                return Response({"status": 400, "message": "Aucun fichier d'avatar"}, status=400)

            file = request.FILES['avatar']

            # Vérifier la taille du fichier
            MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
            if file.size > MAX_FILE_SIZE:
                return Response({"status": 400, "message": "Fichier trop lourd(2MB maximum)"}, status=400)

            # Ouvrir et valider l'image
            try:
                image = Image.open(file)
                image_format = image.format
            except IOError:
                return Response({"status": 400, "message": "Format d'image non valide"}, status=400)

            ALLOWED_FORMATS = ['JPEG', 'PNG']
            if image_format not in ALLOWED_FORMATS:
                return Response({"status": 400, "message": f"Format non supporte: {image_format}"}, status=400)

            # Redimensionner si nécessaire
            MAX_WIDTH = 640
            MAX_HEIGHT = 480
            if image.width > MAX_WIDTH or image.height > MAX_HEIGHT:
                ratio = min(MAX_WIDTH / image.width, MAX_HEIGHT / image.height)
                new_size = (int(image.width * ratio), int(image.height * ratio))
                image = image.resize(new_size, Image.LANCZOS)

            # Sauvegarde en mémoire
            buffer = BytesIO()
            image.save(buffer, format=image_format)
            buffer.seek(0)

            # Nom unique
            extension = file.name.split('.')[-1].lower()
            filename = f"{uuid.uuid4().hex}.{extension}"

            media_path = settings.MEDIA_ROOT
            avatars_path = os.path.join(media_path, "avatars")
            os.makedirs(avatars_path, exist_ok=True)  # Création des dossiers

            absolute_path = os.path.join(avatars_path, filename)
            with open(absolute_path, "wb") as f:
                f.write(buffer.getvalue())

            file_url = f"{settings.PUBLIC_PLAYER_URL}{settings.MEDIA_URL}avatars/{filename}"

            # Mise à jour du joueur
            player = Player.objects.get(id=id)
            player.avatar = file_url
            player.save()

            return Response({"status": 200, "message": "Reussite de la mise a jour de l'avatar", "avatar_url": file_url}, status=200)

        except Player.DoesNotExist:
            return Response({"status": 404, "message": "Ce joueur n'existe pas."}, status=404)
        except Exception as e:
            print(f"❌ Erreur serveur : {str(e)}")
            return Response({"status": 500, "message": str(e)}, status=500)



class PlayerFriendship(APIView):

    @method_decorator(jwt_cookie_required)
    def get(self, request):
        id = request.decoded_token['id']
        try:
            get_type = request.query_params.get('target')

            allowed_targets = {'invites', 'friends', 'requests'}
            if not get_type or len(get_type) > 20 or get_type not in allowed_targets:
                return Response({
                    "status": 400,
                    "message": "Le parametre target ne correspond pas aux types autorises.",
                })

            if get_type == 'invites':
                friendships = Friendship.objects.filter(player_receiver=id, state='PN')
                friendship_data = []
                for friendship in friendships:
                    friend = friendship.player_sender
                    friend_data = PlayerInfoSerializer(friend).data
                    friendship_data.append(friend_data)
                return Response({
                    "status": 200,
                    "friendships": friendship_data
                })

            elif get_type == 'friends':
                friendships = Friendship.objects.filter(
                    Q(player_sender=id) | Q(player_receiver=id), state="AC"
                )
                friendship_data = []
                for friendship in friendships:
                    friend = friendship.player_sender if friendship.player_sender.id != id else friendship.player_receiver
                    friend_data = PlayerInfoSerializer(friend).data
                    friendship_data.append(friend_data)
                return Response({
                    "status": 200,
                    "friendships": friendship_data
                })

            elif get_type == 'requests':
                friendships = Friendship.objects.filter(player_sender=id, state='PN')
                friendship_data = []
                for friendship in friendships:
                    friend = friendship.player_receiver
                    friend_data = PlayerInfoSerializer(friend).data
                    friendship_data.append(friend_data)
                return Response({
                    "status": 200,
                    "friendships": friendship_data
                })

        except Exception as e:
            return Response({
                "status": 500,
                "message": str(e),
            })

    @method_decorator(jwt_cookie_required)
    def post(self, request):
        id = request.decoded_token['id']
        try:
            sender = Player.objects.get(id=id)
            receiver_id = request.data.get('target_id')
            if receiver_id == id:
                return Response({
                    "status": 400,
                    "message": "Vous ne pouvez pas envoyer une requete d'amitie a vous meme.",
                })
            receiver = Player.objects.get(id=receiver_id)
            if Friendship.objects.filter(player_sender=sender, player_receiver=receiver).exists():
                return Response({
                    "status": 400,
                    "message": "Requete d'ami deja envoyee.",
                })
            elif Friendship.objects.filter(player_sender=receiver, player_receiver=sender).exists():
                friendships = Friendship.objects.filter(player_sender=receiver, player_receiver=sender)
                friendships.update(state='AC')
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"user_{receiver.id}",
                    {
                        "type": "status_update",
                        "user_id": sender.id,
                        "status": "ON",
                    }
                )
                return Response({
                    "status": 200,
                    "message": "Demande d'ami acceptee."
                })
            else:
                friendship = Friendship.objects.create(player_sender=sender, player_receiver=receiver, state='PN')
                friendship.save()
                return Response({
                    "status": 200,
                    "message": "Requete d'ami envoyee."
                })
        except Player.DoesNotExist:
            return Response({
                "status": 404,
                "message": "Ce joueur n'existe pas.",
            })
        except Friendship.DoesNotExist:
            return Response({
                "status": 404,
                "message": "La requete d'ami n'existe plus.",
            })
        except Exception as e:
            return Response({
                "status": 500,
                "message": str(e),
            })

    @method_decorator(jwt_cookie_required)
    def delete(self, request):
        try:
            sender_id = request.decoded_token['id']
            receiver_id = request.data.get('target_id')
            sender = Player.objects.get(id=sender_id)
            receiver = Player.objects.get(id=receiver_id)
            try:
                friendship = Friendship.objects.get(player_sender=sender, player_receiver=receiver)
            except Friendship.DoesNotExist:
                friendship = Friendship.objects.get(player_sender=receiver, player_receiver=sender)
            if friendship:
                friendship.delete()
                return Response({
                    "status": 204,
                    "message": 'Amitie supprimee.'
                })
            else:
                return Response({
                    "status": 404,
                    "message": "La requete d'ami n'existe plus.",
                })
        except Exception as e:
            return Response({
                "status": 500,
                "message": str(e),
            })



class ChangePasswordView(APIView):
    @method_decorator(jwt_cookie_required)
    def post(self, request):
        try:
            user_id = request.decoded_token['id']
            player = Player.objects.get(id=user_id)

            data = request.data
            current_password = data.get('current_password')
            new_password = data.get('new_password')
            confirm_password = data.get('confirm_password')

            if not current_password or not new_password or not confirm_password:
                return Response({"status": 400, "message": "Tous les champs sont requis."}, status=400)

            if not check_password(current_password, player.password):
                return Response({"status": 400, "message": "Mot de passe actuel incorrect."}, status=400)

            if new_password != confirm_password:
                return Response({"status": 400, "message": "Les nouveaux mots de passe ne correspondent pas."}, status=400)

            if len(new_password) < 8:
                return Response({"status": 400, "message": "Le mot de passe doit contenir au moins 8 caractères."}, status=400)

            if len(new_password) > 100:
                return Response({"status": 400, "message": "Le mot de passe ne doit pas dépasser 100 caractères."}, status=400)

            player.set_password(new_password)
            player.save()

            return Response({"status": 200, "message": "Mot de passe mis à jour avec succès."}, status=200)

        except Player.DoesNotExist:
            return Response({"status": 404, "message": "Utilisateur non trouvé."}, status=404)

        except Exception as e:
            return Response({"status": 500, "message": str(e)}, status=500)




@api_view(['GET'])
@jwt_cookie_required
def get_player_matches(request):
    try:
        player_id = request.decoded_token['id']
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return Response({"error": "Ce joueur n'existe pas."}, status=status.HTTP_404_NOT_FOUND)

    # Récupérer tous les PlayerMatch pour ce joueur, en préchargeant le match
    player_matches = PlayerMatch.objects.filter(player=player).select_related('match')

    matches_info = []
    has_unplayed = False

    for pm in player_matches:
        match_obj = pm.match
        if match_obj.state == 'UPL':
            has_unplayed = True

        matches_info.append({
            "match_id": match_obj.id,
            "state": match_obj.state,
            "created": match_obj.created.isoformat(),
            "tournament_id": match_obj.tournament.id if match_obj.tournament else None,
            "score": pm.score,
            "is_winner": pm.is_winner,
            "player_side": pm.player_side,
        })

    response_data = {
        "has_unplayed": has_unplayed,
        "matches": matches_info
    }

    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@jwt_cookie_required
def get_player_tournaments(request):
    try:
        player_id = request.decoded_token['id']
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return Response({"error": "Player not found"}, status=status.HTTP_404_NOT_FOUND)

    from .models import PlayerTournament
    pt_qs = PlayerTournament.objects.filter(player=player).select_related('tournament')

    tournaments_info = []
    has_active_tournament = False

    for pt in pt_qs:
        t = pt.tournament
        # Vérifie si le tournoi n'est pas 'FN' (Finish)
        if t.status != 'FN':
            has_active_tournament = True

        tournaments_info.append({
            "tournament_id": t.id,
            "name": t.name,
            "status": t.status,          # 'PN', 'BG', ou 'FN'
            "current_round": t.current_round,
            "created": t.created.isoformat(),
            "is_creator": pt.creator
        })

    return Response({
        "has_active_tournament": has_active_tournament,
        "tournaments": tournaments_info
    }, status=status.HTTP_200_OK)

class MatchHistoryView(APIView):
    @method_decorator(jwt_cookie_required)
    def get(self, request):
        try:
            username = request.query_params.get('username')

            if username:
                player = Player.objects.get(username__exact=username)
            else:
                player = Player.objects.get(id=request.decoded_token['id'])

            player_matches = PlayerMatch.objects.filter(
                player=player,
                match__state='PLY'
            ).select_related('match').order_by('-match__created')

            matches = [pm.match for pm in player_matches]
            serializer = PlayerMatchHistorySerializer(matches, many=True)

            return Response({
                "statusCode": 200,
                "matches": serializer.data
            })

        except Player.DoesNotExist:
            return Response({
                "statusCode": 404,
                "message": "User not found",
            })
        except Exception as e:
            return Response({
                "statusCode": 500,
                "message": str(e),
            })
