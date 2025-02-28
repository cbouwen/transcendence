from urllib.parse import parse_qs
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import authenticate, get_user_model
from django.conf import settings
import requests
import json
import tetris.calculate_mmr
from tetris.tournament import g_tournament
from tetris.active_player_manager import active_player_manager
from tetris.models import TetrisPlayer, TetrisScore
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
            user_id = data.get("user_id")
            nickname = data.get("nickname")
            if not user_id or not nickname:
                return Response({"error": "Missing required fields."}, status=400)

            # Try to fetch the TetrisPlayer instance for the given user
            try:
                player_instance = TetrisPlayer.objects.get(user__id=user_id)
                # Update the nickname if it does not match the current value
                if player_instance.name != nickname:
                    player_instance.name = nickname
                    player_instance.save()
            except TetrisPlayer.DoesNotExist:
                User = get_user_model()
                try:
                    user = User.objects.get(id=user_id)
                except User.DoesNotExist:
                    return Response({"error": "User does not exist."}, status=404)
                player_instance = TetrisPlayer.objects.create(
                    user=user,
                    name=nickname,
                    matchmaking_rating=1200
                )

            # Now that we have the updated player, add them to the active player manager.
            active_player_manager.add_player(player_instance)

            return Response({
                "message": f"Player {player_instance.name} added.",
                "mmr": player_instance.matchmaking_rating
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class tetris_remove_player(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
            try:
                data = json.loads(request.body)
                player_name = data.get("name")
                if not player_name:
                    return Response({"error": "Player name is required."}, status=400)
                active_player_manager.remove_player(player_name)
                active_player_manager.update_match_history
                return Response({"Message": f"Player {player_name} removed."})
            except Exception as e:
                return Response({"error": str(e)}, status=500)

class tetris_get_next_match(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            active_player_manager.update_match_history
            player_name = request.GET.get('player')
            match = active_player_manager.find_next_match(player_name)
            if match:
                return Response({'player1': match[0], 'player2': match[1]})
            else:
                return Response({'error': 'No match found'}, status=404)
        except ValueError as e:
            return Response({'error': str(e)}, status=400)

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
            active_player_manager.update_match_history
            return Response({'Message': 'Scores processed successfully.'})
        
        except Exception as e:
            return Response({'error': str(e)}, status=400)

class tournament_add_player(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            player_name = request.data.get('player_name', [])
            g_tournament.add_player(player_name)
            return Response({'Player added': player_name})

        except Exception as e:
            return Response({'error': str(e)}, status=400)

class tournament_remove_player(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        try:
           player_name = request.data.get('player_name', [])
           g_tournament.remove_player(player_name)
           return Response({'Player removed': player_name})

        except Exception as e:
            return Response({'error': str(e)}, status=400)

class tournament_start(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            g_tournament.start_tournament()
            return Response({'Message': 'tournament started'})

        except Exception as e:
            return Response({'error': str(e)}, status=400)

class tournament_generate_round(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            g_tournament.generate_round(g_tournament.players)
            return Response({'Message': 'Round generated'})

        except Exception as e:
            return Response({'error': str(e)}, status=400)

class tournament_update_match(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            players_data = request.data.get('players', [])
            
            for player in players_data:
                TetrisScore.objects.create(
                    gameid=player.get('gameid'),
                    name=player.get('name'),
                    score=player.get('score'),
                    lines_cleared=player.get('lines_cleared'),
                    level=player.get('level')
                )
            if (players_data[0].get('score') > players_data[1].get('score')):
                g_tournament.update_match(players_data[0].get('name'), players_data[1].get('name'))
                return Response ({'Message': 'tournament match updated'})
            if (players_data[0].get('score') < players_data[1].get('score')):
                g_tournament.update_match(players_data[1].get('name'), players_data[0].get('name'))
                return Response ({'Message': 'tournament match updated'})
            return Response({'Message': 'match ended in a draw'})

        except Exception as e:
            return Response({'error': str(e)}, status=400)

class tournament_get_current_match(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            return Response({'Message': g_tournament.get_current_match()})

        except Exception as e:
            return Response({'error': str(e)}, status=400)

class tournament_cancel_tournament(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        try:
            g_tournament.cancel_tournament()
            return Response({'Message': 'tournament canceled'})

        except Exception as e:
            return Response({'error': str(e)}, status=400)

class tournament_declare_game(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        try:
            game_name = request.data.get('game_name')
            g_tournament.declare_game(game_name)
            return JsonResponse({'Message': 'game name declared'})

        except Exception as e:
            return Response({'error': str(e)}, status=400)
