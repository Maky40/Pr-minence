from django.utils.decorators import method_decorator
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import PlayerInfoSerializer
from .models import Player, Friendship, PlayerMatch, Match
from .decorators import jwt_cookie_required
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import os
from PIL import Image
from io import BytesIO
import urllib.parse
import uuid
from django.core.exceptions import ValidationError


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
            if "username" in player_data:
                username = ' '.join(player_data["username"].split())
                if not username or len(player_data['username']) > 8 :
                    return Response({
                        "status": 400,
                        "message": "Invalid username",
                    })
                player.username = username
                changed = True
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
            if "two_factor" in player_data and player_data['two_factor'] is False:
                player.two_factor = player_data['two_factor']
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


class PlayerAvatarUpload(APIView):

    @method_decorator(jwt_cookie_required)
    def post(self, request):
        try:
            # 1) Récupérer l'ID du joueur depuis le token décodé
            id = request.decoded_token['id']
            
            # 2) Extraire le fichier 'avatar' depuis la requête
            if 'avatar' not in request.FILES:
                return Response({
                    "status": 400,
                    "message": "No avatar file provided",
                }, status=400)
            
            file = request.FILES['avatar']
            
            # 3) Vérifier la taille du fichier
            MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
            if file.size > MAX_FILE_SIZE:
                return Response({
                    "status": 400,
                    "message": "Image file too large (max 2MB)",
                }, status=400)
            
            # 4) Ouvrir l'image avec Pillow
            try:
                image = Image.open(file)
                image_format = image.format  # e.g., 'JPEG', 'PNG'
            except IOError:
                return Response({
                    "status": 400,
                    "message": "Invalid image file",
                }, status=400)
            
            # 5) Vérifier le format de l'image
            ALLOWED_FORMATS = ['JPEG', 'PNG']
            if image_format not in ALLOWED_FORMATS:
                return Response({
                    "status": 400,
                    "message": f"Unsupported image format: {image_format}. Allowed formats: {ALLOWED_FORMATS}",
                }, status=400)
            
            # 6) Vérifier et redimensionner l'image si nécessaire
            MAX_WIDTH = 640
            MAX_HEIGHT = 480
            if image.width > MAX_WIDTH or image.height > MAX_HEIGHT:
                # Calculer le facteur de redimensionnement tout en conservant le ratio
                ratio = min(MAX_WIDTH / image.width, MAX_HEIGHT / image.height)
                new_size = (int(image.width * ratio), int(image.height * ratio))
                image = image.resize(new_size, Image.ANTIALIAS)
            
            # 7) Sauvegarder l'image redimensionnée dans un buffer BytesIO
            buffer = BytesIO()
            image.save(buffer, format=image_format)
            buffer.seek(0)
            
            # 8) Construire un nom de fichier unique pour éviter les conflits
            # Optionnel : ajouter un timestamp ou un UUID
            filename = f"{uuid.uuid4().hex}_{file.name}"
            file_path = os.path.join(settings.MEDIA_ROOT, filename)
            
            # 9) Sauvegarder l'image via le storage par défaut
            default_storage.save(file_path, ContentFile(buffer.read()))
            
            # 10) Construire l'URL publique de l'image
            file_url = urllib.parse.urljoin(
                settings.PUBLIC_PLAYER_URL,
                os.path.join(settings.MEDIA_URL, filename)
            )
            
            # 11) Mettre à jour le champ 'avatar' du joueur
            player = Player.objects.get(id=id)
            player.avatar = file_url
            player.save()
            
            # 12) Répondre avec succès
            return Response({
                "status": 200,
                "message": "Avatar updated successfully",
            }, status=200)
        
        except Player.DoesNotExist:
            return Response({
                "status": 404,
                "message": "User not found",
            }, status=404)
        except ValidationError as ve:
            return Response({
                "status": 400,
                "message": ve.message,
            }, status=400)
        except Exception as e:
            return Response({
                "status": 500,
                "message": str(e),
            }, status=500)


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