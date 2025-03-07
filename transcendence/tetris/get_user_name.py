from django.http import HttpResponse
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import TetrisPlayer, TetrisScore
from django.contrib.auth import authenticate
from active_player_manager import active_player_manager

def temporary_login(request):
    # Extract username and password from the request
    username = request.POST.get('username')
    password = request.POST.get('password')

    # Authenticate the user without creating a session
    user = authenticate(username=username, password=password)

    if user is not None:
        # User is authenticated, fetch player data
        try:
            player = TetrisPlayer.objects.get(name=username)
            scores = TetrisScore.objects.filter(name=username).order_by('-timestamp')

            # Serialize player data and scores
            scores_data = [
                {
                    "gameid": score.gameid,
                    "score": score.score,
                    "lines_cleared": score.lines_cleared,
                    "level": score.level,
                    "timestamp": score.timestamp.isoformat(),
                }
                for score in scores
            ]

            # Add this player to the "active" players manager
            active_player_manager.add_player(player)

            return JsonResponse({
                "status": "success",
                "player": {
                    "name": player.name,
                    "matchmaking_rating": player.matchmaking_rating,
                },
                "scores": scores_data,
            })
        except TetrisPlayer.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Player not found"}, status=404)
    else:
        # Invalid credentials
        return JsonResponse({"status": "error", "message": "Invalid credentials"}, status=401)


def get_player_data(request):
    if request.user.is_authenticated:
        # Use the username to fetch the player's data
        username = request.user.username
        # Query the TetrisPlayer model for the matching player
        player = get_object_or_404(TetrisPlayer, name=username)
        
        # Return player data as JSON
        return JsonResponse({
            "name": player.name,
            "matchmaking_rating": player.matchmaking_rating,
        })
    else:
        # Return an appropriate response for unauthenticated users
        return JsonResponse({"error": "User is not logged in"}, status=401)


def view_player_name(request):
    if request.user.is_authenticated:
        return HttpResponse(request.user.username)
    else:
        return HttpResponse(status=401)

    import random
from typing import Optional, Tuple
from .models import TetrisPlayer
