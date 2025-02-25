from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import authenticate
from django.conf import settings
import requests
import json
import tetris.calculate_mmr
from ..tetris.models import TetrisScore
from tetris.active_player_manager import active_player_manager
from .serializers import UserSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request):
        # Get OAuth token from the request data
        ft_api_user_login_code = request.data.get("ft_api_user_login_code")
        if not ft_api_user_login_code:
            raise AuthenticationFailed('Please provide ft_api_user_login_code')

        request_data = {
            'client_id': settings.FT_OAUTH_CLIENT_ID,
            'client_secret': settings.FT_OAUTH_CLIENT_SECRET,
            'code': ft_api_user_login_code,
            'grant_type': 'authorization_code',
            'redirect_uri': settings.FT_OAUTH_REDIRECT_URI,
        }
        token_response = requests.post(settings.FT_OAUTH_TOKEN_URL, data=request_data)

        if token_response.status_code != 200:
            raise AuthenticationFailed(token_response.json())

        token_data = token_response.json()
        access_token = token_data.get('access_token')



        if not access_token:
            raise AuthenticationFailed("42 OAuth access token is required.")

        # Authenticate user using the custom backend
        user = authenticate(request, token=access_token)
        if not user:
            raise AuthenticationFailed("Invalid 42 OAuth access token.")

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


class Test(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        content = {'message': 'Test completed! You have successfully authenticated yourself and received access this super secret message'}
        return Response(content)

class Me(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def post(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User updated successfully", "user": serializer.data}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class tetris_add_player(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
            try:
                data = json.loads(request.body)
                player_name = data.get("name")
                matchmaking_rating = data.get("matchmaking_rating")
                if not player_name or matchmaking_rating is None:
                    return JsonResponse({"error": "Missing required fields."}, status=400)
                
                class Player:
                    def __init__(self, name, matchmaking_rating):
                        self.name = name
                        self.matchmaking_rating = matchmaking_rating

                player = Player(player_name, matchmaking_rating)
                active_player_manager.add_player(player)
                return JsonResponse({"message": f"Player {player_name} added."})
            except Exception as e:
                return JsonResponse({"error": str(e)}, status=500)

class tetris_remove_player(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
            try:
                data = json.loads(request.body)
                player_name = data.get("name")
                if not player_name:
                    return JsonResponse({"error": "Player name is required."}, status=400)
                active_player_manager.remove_player(player_name)
                return JsonResponse({"message": f"Player {player_name} removed."})
            except Exception as e:
                return JsonResponse({"error": str(e)}, status=500)

class tetris_get_next_match(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            player_name = request.GET.get('player')
            match = active_player_manager.find_next_match(player_name)
            if match:
                return JsonResponse({'player1': match[0], 'player2': match[1]})
            else:
                return JsonResponse({'error': 'No match found'}, status=404)
        except ValueError as e:
            return JsonResponse({'error': str(e)}, status=400)

class tetris_save_tetris_scores(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            players_data = request.data.get('players', [])
            ranked = request.data.get('ranked', False)
            
            for player in players_data:
                TetrisScore.objects.create(
                    gameid=player.get('gameid'),
                    name=player.get('name'),
                    score=player.get('score'),
                    lines_cleared=player.get('lines_cleared'),
                    level=player.get('level')
                )
                
            if ranked and len(players_data) >= 2:
                first_player = players_data[0]
                second_player = players_data[1]
                tetris.calculate_mmr.update_player_ratings(
                    first_player.get('name'),
                    second_player.get('name'),
                    first_player.get('score'),
                    second_player.get('score')
                )
            
            return Response({'message': 'Scores processed successfully.'})
        
        except Exception as e:
            return Response({'error': str(e)}, status=400)
