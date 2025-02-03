from django.utils.decorators import method_decorator
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import PlayerInfoSerializer
from .models import Player, Friendship, PlayerMatch, Match
from .decorators import jwt_cookie_required
from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import os
from PIL import Image
from io import BytesIO
import urllib.parse
import uuid
from django.core.exceptions import ValidationError
import pyotp
import qrcode
import base64
from PIL import Image



class PlayerInfo(APIView):

    @method_decorator(jwt_cookie_required)
    def get(self, request):
        try:
            # Recuperer les donnees d'un autre utilisateur a l'aide de son username
            username = request.query_params.get('username')
            if username:
                player = Player.objects.filter(username=username)
                if not player.exists():
                    raise Player.DoesNotExist
                serializer = PlayerInfoSerializer(player, many=True)
                return Response({
                    "status": 200,
                    "players": serializer.data,
                    "message": "User found successfully"
                })
            # Si pas d'username fournit, recuperer les donnees personnelles de l'utilisateur connecte pour afficher son profil personnel
            player = Player.objects.get(id=request.decoded_token['id'])
            serializer = PlayerInfoSerializer(player)
            return Response({
                "status": 200,
                "player": serializer.data
            })
        except Player.DoesNotExist:
            return Response({
                "status": 404,
                "message": "User not found",
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
            id = request.decoded_token['id']
            player_data = request.data.get('player')
            player = Player.objects.get(id=id)
            if "first_name" in player_data:
                first_name = ' '.join(player_data['first_name'].split())
                if not first_name or len(first_name) > 20 :
                    return Response({
                        "status": 400,
                        "message": "Invali first name",
                    })
                player.first_name = first_name
                changed = True
            if "last_name" in player_data:
                last_name = ' '.join(player_data['last_name'].split())
                if not last_name or len(last_name) > 20 :
                    return Response({
                        "status": 400,
                        "message": "Invalid last name",
                    })
                player.last_name = last_name
                changed = True
            player.save()
            message = "User updated successfully" if changed else "No changes detected"
            return Response({
                "status": 200,
                "message": message,
            })
        except Player.DoesNotExist:
            return Response({
                "status": 404,
                "message": "User not found",
            })
        except Exception as e:
            return Response({
                "status": 500,
                "message": str(e),
            })


class TwoFactorActivation(APIView):
    """
    Gère l'activation/désactivation du 2FA avec une gestion séparée du QR Code
    """

    @method_decorator(jwt_cookie_required)
    def post(self, request):
        try:
            id = request.decoded_token['id']
            player = Player.objects.get(id=id)

            # Récupérer les paramètres envoyés
            activate_2fa = request.data.get("activate_2fa", None)
            show_qr_code = request.data.get("show_qr_code", False)  # Permet d'afficher le QR Code

            if activate_2fa is None and not show_qr_code:
                return Response({"status": 400, "message": "Missing 'activate_2fa' or 'show_qr_code' field."})

            # Cas où l'on veut activer ou désactiver le 2FA
            if activate_2fa is not None:
                if activate_2fa:  # Activation du 2FA
                    if not player.otp_secret:
                        player.otp_secret = pyotp.random_base32()  # Générer une clé secrète
                    player.two_factor = True
                    player.save()
                    return Response({"status": 200, "message": "2FA activated. You can now scan the QR code."})

                else:  # Désactivation du 2FA
                    player.two_factor = False
                    player.otp_secret = None  # Supprimer la clé secrète
                    player.save()
                    return Response({"status": 200, "message": "2FA disabled successfully."})

            # Cas où l'on veut seulement afficher le QR Code
            if show_qr_code:
                if not player.two_factor or not player.otp_secret:
                    return Response({"status": 400, "message": "2FA is not activated. Enable it first."})

                # Générer l'URI pour Google Authenticator
                otp_uri = pyotp.TOTP(player.otp_secret).provisioning_uri(name=player.email, issuer_name="MyApp")

                # Générer le QR Code
                qr = qrcode.make(otp_uri)
                buffer = BytesIO()
                qr.save(buffer, format="PNG")
                qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

                return Response({
                    "status": 200,
                    "message": "Scan this QR code with Google Authenticator.",
                    "qr_code": f"data:image/png;base64,{qr_base64}"
                })

        except Player.DoesNotExist:
            return Response({"status": 404, "message": "User not found."})

        except Exception as e:
            return Response({"status": 500, "message": str(e)})



class PlayerAvatarUpload(APIView):
    """
    Met à jour l'avatar du joueur avec des vérifications de sécurité.
    """

    @method_decorator(jwt_cookie_required)
    def post(self, request):
        try:
            id = request.decoded_token['id']
            
            # Vérifier si un fichier est bien envoyé
            if 'avatar' not in request.FILES:
                return Response({"status": 400, "message": "No avatar file provided"}, status=400)

            file = request.FILES['avatar']

            # Vérifier la taille du fichier (max 2MB)
            MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
            if file.size > MAX_FILE_SIZE:
                return Response({"status": 400, "message": "Image file too large (max 2MB)"}, status=400)

            # Ouvrir l'image et vérifier son format
            try:
                image = Image.open(file)
                image_format = image.format
            except IOError:
                return Response({"status": 400, "message": "Invalid image file"}, status=400)

            # Vérifier les formats autorisés
            ALLOWED_FORMATS = ['JPEG', 'PNG']
            if image_format not in ALLOWED_FORMATS:
                return Response({"status": 400, "message": f"Unsupported image format: {image_format}. Allowed formats: {ALLOWED_FORMATS}"}, status=400)

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

            # Nom unique de fichier
            extension = file.name.split('.')[-1].lower()
            filename = f"{uuid.uuid4().hex}.{extension}"

            # ✅ Correction : Sauvegarde dans /player/media/avatars/
            absolute_path = os.path.join(settings.MEDIA_ROOT, "avatars", filename)

            # Vérifier que le dossier avatars existe
            os.makedirs(os.path.dirname(absolute_path), exist_ok=True)

            # Sauvegarder l'image localement
            with open(absolute_path, "wb") as f:
                f.write(buffer.getvalue())

            # ✅ Génération de l'URL publique correcte
            file_url = urllib.parse.urljoin(settings.PUBLIC_PLAYER_URL, settings.MEDIA_URL + f"avatars/{filename}")

            # Mise à jour de l'avatar du joueur
            player = Player.objects.get(id=id)
            player.avatar = file_url
            player.save()

            return Response({"status": 200, "message": "Avatar updated successfully", "avatar_url": file_url}, status=200)

        except Player.DoesNotExist:
            return Response({"status": 404, "message": "User not found"}, status=404)
        except Exception as e:
            return Response({"status": 500, "message": str(e)}, status=500)



class PlayerFriendship(APIView):

        @method_decorator(jwt_cookie_required)
        def get(self, request):
            id = request.decoded_token['id']
            try:
                get_type = request.query_params.get('target')
                if get_type == 'invites':
                    # Invitation recues
                    friendships = Friendship.objects.filter(receiver=id, status='PN')
                    friendship_data = []
                    for friendship in friendships:
                        friend = friendship.sender
                        friend_data = PlayerInfoSerializer(friend).data
                        friendship_data.append(friend_data)
                    return Response({
                        "status": 200,
                        "friendships": friendship_data
                    })
                elif get_type == 'friends':
                    # Liste d'Amis
                    friendships = Friendship.objects.filter(Q(sender=id) | Q(receiver=id),status="AC")
                    friendship_data = []
                    for friendship in friendships:
                        friend = friendship.sender if friendship.sender.id != id else friendship.receiver
                        friend_data = PlayerInfoSerializer(friend).data
                        friendship_data.append(friend_data)
                    return Response({
                        "status": 200,
                        "friendships": friendship_data
                    })
                elif get_type == 'requests':
                    # Demande d'amis envoyes
                    friendships = Friendship.objects.filter(sender=id, status='PN')
                    friendship_data = []
                    for friendship in friendships:
                        friend = friendship.receiver
                        friend_data = PlayerInfoSerializer(friend).data
                        friendship_data.append(friend_data)
                    return Response({
                        "status": 200,
                        "friendships": friendship_data
                    })
                else:
                    return Response({
                        "status": 400,
                        "message": "Invalid request",
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
                    # Requete d'ami envoye a soi meme
                    return Response({
                        "status": 400,
                        "message": "You can't send a friend request to yourself",
                    })
                receiver = Player.objects.get(id=receiver_id)
                if Friendship.objects.filter(sender=sender, receiver=receiver).exists():
                    # Requete deja envoye ou amitie deja existante
                    return Response({
                        "status": 400,
                        "message": "Friend request already sent",
                    })
                elif Friendship.objects.filter(sender=receiver, receiver=sender).exists():
                    # Acceptation de la demande d'ami si la personne m'avait demande egalement en ami 
                    friendships = Friendship.objects.filter(sender=receiver, receiver=sender)
                    friendships.update(status='AC')
                    return Response({
                    "status": 200,
                    "message": "Friend requests accepted successfully"
                    })
                else:
                    # Envoyer une demande d'ami 
                    friendship = Friendship.objects.create(sender=sender, receiver=receiver, status='PN')
                    friendship.save()
                    return Response({
                        "status": 200,
                        "message": "Friend request sent successfully"
                    })
            except Player.DoesNotExist:
                return Response({
                    "status": 404,
                    "message": "User not found",
                })
            except Friendship.DoesNotExist:
                    return Response({
                        "status": 404,
                        "message": "Friend request not found",
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
                    friendship = Friendship.objects.get(sender=sender, receiver=receiver)
                except Friendship.DoesNotExist:
                    friendship = Friendship.objects.get(sender=receiver, receiver=sender)
                if friendship:
                    friendship.delete()
                    return Response({
                        "status": 204,
                        "message": 'Friendship deleted successfully'
                    })
                else:
                    return Response({
                        "status": 404,
                        "message": "Friend request not found",
                    })
            except Exception as e:
                return Response({
                    "status": 500,
                    "message": str(e),
                })


class ChangePasswordView(APIView):
    """
    Vue permettant à un utilisateur de changer son mot de passe.
    """
    @method_decorator(jwt_cookie_required)
    def post(self, request):
        try:
            # 1️⃣ Récupérer l'utilisateur authentifié via le token JWT
            user_id = request.decoded_token['id']
            player = Player.objects.get(id=user_id)

            # 2️⃣ Extraire les données de la requête
            data = request.data
            current_password = data.get('current_password')
            new_password = data.get('new_password')
            confirm_password = data.get('confirm_password')

            # 3️⃣ Vérifier que tous les champs sont fournis
            if not current_password or not new_password or not confirm_password:
                return Response({"status": 400, "message": "Tous les champs sont requis."}, status=400)

            # 4️⃣ Vérifier que le mot de passe actuel est correct
            if not check_password(current_password, player.password):
                return Response({"status": 400, "message": "Mot de passe actuel incorrect."}, status=400)

            # 5️⃣ Vérifier que le nouveau mot de passe et la confirmation sont identiques
            if new_password != confirm_password:
                return Response({"status": 400, "message": "Les nouveaux mots de passe ne correspondent pas."}, status=400)

            # 6️⃣ Vérifier la force du mot de passe (optionnel mais recommandé)
            if len(new_password) < 8:
                return Response({"status": 400, "message": "Le mot de passe doit contenir au moins 8 caractères."}, status=400)

            # 7️⃣ Modifier le mot de passe et sauvegarder
            player.set_password(new_password)
            player.save()

            return Response({"status": 200, "message": "Mot de passe mis à jour avec succès."}, status=200)

        except Player.DoesNotExist:
            return Response({"status": 404, "message": "Utilisateur non trouvé."}, status=404)

        except Exception as e:
            return Response({"status": 500, "message": str(e)}, status=500)
