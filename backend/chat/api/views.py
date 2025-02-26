from django.utils.decorators import method_decorator
from .decorators import jwt_cookie_required
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Player, BlockedUser

class is_blocked(APIView):
	@method_decorator(jwt_cookie_required)
	def get(self, request):
		try:
			player = Player.objects.get(id=request.decoded_token['id'])
			id_target_player = request.query_params.get('id')
			target_player = Player.objects.get(id=id_target_player)
			is_blocked_by_me = BlockedUser.objects.filter(blocker=player, blocked=target_player).exists()
			is_blocked_by_her = BlockedUser.objects.filter(blocker=target_player, blocked=player).exists()

			return Response({
				"status": 200,
				"is_blocked_by_me": is_blocked_by_me,
				"is_blocked_by_her": is_blocked_by_her
			})
		except Exception as e:
			return Response({
				"status": 500,
				"message": str(e)
			}, status=500)

	@method_decorator(jwt_cookie_required)
	def post(self, request):
		try:
			player = Player.objects.get(id=request.decoded_token['id'])
			id_target_player = request.query_params.get('id')
			target_player = Player.objects.get(id=id_target_player)
			is_blocked = BlockedUser.objects.filter(blocker=player, blocked=target_player).first()
			if is_blocked:
				# L'utilisateur est déjà bloqué, on le débloque
				is_blocked.delete()
				return Response({"status": 200, "message": "Utilisateur débloqué"}, status=200)
			else:
				# L'utilisateur n'est pas bloqué, on le bloque
				BlockedUser.objects.create(blocker=player, blocked=target_player)
				return Response({"status": 200, "message": "Utilisateur bloqué"}, status=200)
		except Exception as e:
			return Response({
				"status": 500,
				"message": str(e)
			}, status=500)