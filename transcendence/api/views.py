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
from tournament.tournament import TournamentError, g_tournament, get_game_id_number
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
        totp = request.data.get("TOTP")
        if not totp:
            raise AuthenticationFailed('Please provide TOTP details')

        request_data = {
            'client_id': settings.FT_OAUTH_CLIENT_ID,
            'client_secret': settings.FT_OAUTH_CLIENT_SECRET,
            'code': ft_api_user_login_code,
            'grant_type': 'authorization_code',
            'redirect_uri': settings.FT_OAUTH_REDIRECT_URI,
        }
        token_response = requests.post(settings.FT_OAUTH_TOKEN_URL, data=request_data)

        if token_response.status_code != 200:
            error_data = token_response.json()
            error_data |= { 'type': "intra error" }
            raise AuthenticationFailed(error_data)

        token_data = token_response.json()
        access_token = token_data.get('access_token')

        if not access_token:
            raise AuthenticationFailed("42 OAuth access token is required.")

        # Authenticate user using the custom backend
        user = authenticate(request, token=access_token, totp=totp)

        # Generate JWT tokens
        if not user:
            return Response({
                            'error': str(user)
            })
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
        userdata = serializer.data
        userdata.pop("totpsecret")
        userdata.pop("password")
        return Response(userdata)

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

# Endpoint to return active player manager users
class tetris_get_active_players(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # active_player_manager.active_players is a dict where each value is a dict 
        # with a "player" key that has a user attribute.
        usernames = [
            active_player["player"].user.username 
            for active_player in active_player_manager.active_players.values()
        ]
        return Response({"active_players": usernames}, status=200)

class tournament_get_participants(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Assuming g_tournament.players is a list of Django User objects
            usernames = [user.username for user in g_tournament.players]
            return Response({"tournament_users": usernames}, status=200)
        except TournamentError as e:
            return Response({"error": str(e)})

class tournament_add_player(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            user = request.user
            g_tournament.add_player(user)
            # Ensure user is serializable or return a meaningful identifier.
            return Response({'Player added': str(user)})
        except TournamentError as e:
            return Response({"error": str(e)})

class tournament_remove_player(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        try:
            user = request.user
            g_tournament.remove_player(user)
            return Response({'Player removed': str(user)})
        except TournamentError as e:
            return Response({"error": str(e)})

class tournament_start(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            g_tournament.start_tournament()
            return Response({'Message': 'tournament started'})
        except TournamentError as e:
            return Response({"error": str(e)})

class tournament_generate_round(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            g_tournament.generate_round(g_tournament.players)
            return Response({'Message': 'Round generated'})
        except TournamentError as e:
            return Response({"error": str(e)})

class tournament_update_match(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Extract and validate required fields from the request payload.
            status_value = request.data.get('status')  # expected to be "winner" or "loser"
            gameid = request.data.get('gameid')
            packetnumber = request.data.get('packetnumber')
            packetamount = request.data.get('packetamount')

            if not all([status_value, gameid, packetnumber, packetamount]):
                return Response(
                    {'error': 'status, gameid, packetnumber, and packetamount are required fields.'},
                    status=400
                )

            # Ensure packetamount is exactly 2 and packetnumber is either 1 or 2.
            try:
                packetamount = int(packetamount)
                packetnumber = int(packetnumber)
            except ValueError:
                return Response({'error': 'packetnumber and packetamount must be integers.'}, status=400)

            if packetamount != 2:
                return Response({'error': 'Invalid packet amount. Must be 2.'}, status=400)
            if packetnumber not in [1, 2]:
                return Response({'error': 'Invalid packet number. Must be 1 or 2.'}, status=400)

            # Verify that the status is either "winner" or "loser".
            if status_value not in ["winner", "loser"]:
                return Response({'error': 'Invalid status. Must be either "winner" or "loser".'}, status=400)

            # Build a package record; we use the authenticated user's id to determine who sent it.
            package = {
                "status": status_value,
                "user_id": request.user.id,
                "packetnumber": packetnumber,
            }

            # Use the gameid as the key to temporarily store packages.
            cache_key = f"tournament_result_{gameid}"
            packages = cache.get(cache_key)

            if packages:
                # Prevent duplicate submission from the same status.
                if any(pkg['status'] == status_value for pkg in packages):
                    return Response({'error': 'Duplicate package received.'}, status=400)
                packages.append(package)
                # If both packages have been received, process the tournament result.
                if len(packages) == 2:
                    # By using the gameid as our cache key, we ensure both packages refer to the same game.
                    winner_pkg = next((pkg for pkg in packages if pkg['status'] == "winner"), None)
                    loser_pkg = next((pkg for pkg in packages if pkg['status'] == "loser"), None)
                    if not winner_pkg or not loser_pkg:
                        return Response({'error': 'Both winner and loser packages are required.'}, status=400)

                    # Retrieve the User objects corresponding to each package.
                    winner = User.objects.get(id=winner_pkg['user_id'])
                    loser = User.objects.get(id=loser_pkg['user_id'])

                    # Call your tournament update_match method.
                    result = g_tournament.update_match(winner=winner, loser=loser, gameid=gameid)
                    # Clear the cached packages now that we have processed the result.
                    cache.delete(cache_key)
                    return Response(result)
                else:
                    # Only one package received so far; update the cache and wait.
                    cache.set(cache_key, packages, timeout=60)  # expires in 1 minutes
                    return Response({'message': 'Package received. Waiting for the other package.'})
            else:
                # No package has been received yet for this gameid; store this package.
                cache.set(cache_key, [package], timeout=60)  # expires in 1 minutes
                return Response({'message': 'Package received. Waiting for the other package.'})
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class tournament_get_current_match(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            return Response({'Message': g_tournament.start_game()})
        except TournamentError as e:
            return Response({"error": str(e)})

class tournament_cancel_tournament(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        try:
            g_tournament.cancel_tournament()
            return Response({'Message': 'tournament canceled'})
        except TournamentError as e:
            return Response({"error": str(e)})

class tournament_declare_game(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            game_name = request.data.get('game_name')
            g_tournament.declare_game(game_name)
            return JsonResponse({'Message': 'game name declared'})
        except TournamentError as e:
            return JsonResponse({"error": str(e)})

class tournament_get_game(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(g_tournament.game)

class tournament_ping(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        game_id = request.data.get('game_id')
        g_tournament.ping_game(game_id)

class get_game_id(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        game_id = get_game_id_number()  # Call the helper function
        return Response({'game_id': game_id})
