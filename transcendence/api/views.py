from urllib.parse import parse_qs
from django.http import JsonResponse
from django.shortcuts import redirect
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.cache import cache
from datetime import timedelta
import time
import json
import requests

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import AuthenticationFailed

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

import tetris.calculate_mmr
from tetris.serializers import TetrisPlayerSerializer
from tetris.tournament import g_tournament
from tetris.active_player_manager import active_player_manager
from tetris.models import TetrisPlayer, TetrisScore

from .serializers import UserSerializer
from accounts.models import PuppetGrant

User = get_user_model()

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
            raise AuthenticationFailed(request_data | token_response.json())

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

class CustomTokenObtainPuppetPairView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        username = request.data.get("username")
        if not username:
            raise AuthenticationFailed("Please provide a username.")

        try:
            puppet = User.objects.get(username=username)
        except User.DoesNotExist:
            raise AuthenticationFailed("User that you want to puppet is not found.")

        if not PuppetGrant.objects.filter(
            puppet=puppet,
            puppeteer=request.user,
            expiry__gt=timezone.now()
        ).exists():
            return Response({'status' : "failed"})

        refresh = RefreshToken.for_user(puppet)
        return Response({
            'status': "succes",
            'value': {
                'refresh': str(refresh),
                'access': str(refresh.access_token)
            }
        })

class CreatePuppetGrantView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        puppeteer_username = request.data.get("puppeteer")
        if not puppeteer_username:
            return Response({"error": "Puppeteer username is required."}, status=400)
        
        try:
            puppeteer = User.objects.get(username=puppeteer_username)
        except User.DoesNotExist:
            return Response({"error": "Puppeteer not found."}, status=404)
        
        expiry_time = timezone.now() + timedelta(minutes=900) #change this later back to 5
        
        puppet_grant = PuppetGrant.objects.create(
            puppet=request.user,
            puppeteer=puppeteer,
            expiry=expiry_time
        )
        
        return Response({
            "message": "Puppet grant created.",
            "puppet": request.user.username,
            "puppeteer": puppeteer.username,
            "expiry": puppet_grant.expiry
        }, status=201)

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

class tetris_get_player(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Retrieve the TetrisPlayer instance for the current logged-in user.
        player = TetrisPlayer.objects.get(user=request.user)
        serializer = TetrisPlayerSerializer(player)
        return Response(serializer.data)

class tetris_add_player(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Get the authenticated user from the request.
        user = request.user

        # Try to fetch the TetrisPlayer instance for the authenticated user.
        try:
            player_instance = TetrisPlayer.objects.get(user=user)
        except TetrisPlayer.DoesNotExist:
            # Create a new TetrisPlayer if one does not exist.
            player_instance = TetrisPlayer.objects.create(
                user=user,
                matchmaking_rating=1200
            )

        # Add the player to the active player manager.
        response = active_player_manager.add_player(player_instance)
        if (response == "alreaddy active"):
            return Response({
                "message": f"player {player_instance.user.username} alreaddy active."})

        return Response({
            "message": f"Player {player_instance.user.username} added.",
            "mmr": player_instance.matchmaking_rating
        })

class tetris_remove_player(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        if not user:
            return Response({"error": "Player id is required."}, status=400)
        active_player_manager.remove_player(user)
        active_player_manager.refresh_all_players_match_histories
        return Response({"Message": f"Player {user} removed."})

class tetris_get_next_match(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        active_player_manager.refresh_all_players_match_histories
        user = request.user
        match = active_player_manager.find_next_match(user)
        if match:
            return Response({'player1': match[0], 'player2': match[1]})
        else:
            return Response({'error': 'No match found'}, status=404)

class tetris_save_tetris_scores(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        print(request)
        print("\n\n")
        # Define required keys without 'part' and 'total_parts'
        required_keys = ['gameid', 'score', 'lines_cleared', 'level']
        player_data = {}
        for key in required_keys:
            value = request.data.get(key)
            if value is None:
                return Response({'error': f"Missing key '{key}' in player data."}, status=400)
            player_data[key] = value

        # Add authenticated user's id to the player_data
        player_data['user_id'] = request.user.id

        # Immediately save or update the Tetris score
        score_obj, created = TetrisScore.objects.update_or_create(
            user_id=player_data.get('user_id'),
            gameid=player_data.get('gameid'),
            defaults={
                'score': player_data.get('score'),
                'lines_cleared': player_data.get('lines_cleared'),
                'level': player_data.get('level'),
            }
        )
        return Response({'Message': 'Score processed successfully.'}, status=200)

class tournament_add_player(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        g_tournament.add_player(user)
        return Response({'Player added': user})

class tournament_remove_player(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        g_tournament.remove_player(user)
        return Response({'Player removed': user})

class tournament_start(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        g_tournament.start_tournament()
        return Response({'Message': 'tournament started'})

class tournament_generate_round(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        g_tournament.generate_round(g_tournament.players)
        return Response({'Message': 'Round generated'})

class tournament_update_match(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        players_data = request.data.get('players', [])
        
        for player in players_data:
            TetrisScore.objects.create(
                gameid=player.get('gameid'),
                user=player.get('user'),
                score=player.get('score'),
                lines_cleared=player.get('lines_cleared'),
                level=player.get('level')
            )
        if (players_data[0].get('score') > players_data[1].get('score')):
            g_tournament.update_match(players_data[0].get('user'), players_data[1].get('user'))
            return Response ({'Message': 'tournament match updated'})
        if (players_data[0].get('score') < players_data[1].get('score')):
            g_tournament.update_match(players_data[1].get('user'), players_data[0].get('user'))
            return Response ({'Message': 'tournament match updated'})
        return Response({'Message': 'match ended in a draw'})

class tournament_get_current_match(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'Message': g_tournament.get_current_match()})

class tournament_cancel_tournament(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        g_tournament.cancel_tournament()
        return Response({'Message': 'tournament canceled'})

class tournament_declare_game(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        game_name = request.data.get('game_name')
        g_tournament.declare_game(game_name)
        return JsonResponse({'Message': 'game name declared'})
