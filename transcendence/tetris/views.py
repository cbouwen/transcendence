# views.py

import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import TetrisScore, TetrisPlayer
from .calculate_mmr import update_player_ratings
from .active_player_manager import active_player_manager

@require_http_methods(["GET"])
def get_next_match(request):
    try:
        player_name = request.GET.get('player')
        match = active_player_manager.find_next_match(player_name)
        if match:
            return JsonResponse({'player1': match[0], 'player2': match[1]})
        else:
            return JsonResponse({'error': 'No match found'}, status=404)
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)

@require_http_methods(["POST"])
def add_player(request):
    try:
        data = json.loads(request.body)
        # Assume you have a way to create or retrieve a player instance.
        # This is just a stub; you might integrate with your authentication system.
        player_name = data.get("name")
        matchmaking_rating = data.get("matchmaking_rating")
        if not player_name or matchmaking_rating is None:
            return JsonResponse({"error": "Missing required fields."}, status=400)
        
        # Create a simple player object. In a real app, this would likely be a model instance.
        class Player:
            def __init__(self, name, matchmaking_rating):
                self.name = name
                self.matchmaking_rating = matchmaking_rating

        player = Player(player_name, matchmaking_rating)
        active_player_manager.add_player(player)
        return JsonResponse({"message": f"Player {player_name} added."})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@require_http_methods(["POST"])
def remove_player(request):
    try:
        data = json.loads(request.body)
        player_name = data.get("name")
        if not player_name:
            return JsonResponse({"error": "Player name is required."}, status=400)
        active_player_manager.remove_player(player_name)
        return JsonResponse({"message": f"Player {player_name} removed."})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def tetris_main(request):
    return render(request, 'tetris/main.html')

def one_player(request):
    return render(request, 'one_player.html')

def two_player(request):
    return render(request, 'two_player.html')

def three_player(request):
    return render(request, 'three_player.html')

def one_player_original(request):
    return render(request, 'one_player_original.html')

def two_player_original(request):
    return render(request, 'two_player_original.html')

def three_player_original(request):
    return render(request, 'three_player_original.html')

def tetris_view(request):
    return render(request, 'tetris/tetris.html')

@csrf_exempt
def save_tetris_scores(request):
    """
    Receives POST requests with Tetris game data, saves to TetrisScore,
    and updates player MMR in TetrisPlayer.
    """
    if request.method == 'POST':
        try:
            # Parse JSON from request
            data = json.loads(request.body)
            players_data = data.get('players', [])

            # Validate that all players have the same game_id
            game_ids = set(player['gameid'] for player in players_data)
            if len(game_ids) != 1:
                raise ValueError("All players must have the same game ID.")
            game_id = game_ids.pop()

            # Save each player's result to the TetrisScore model
            for player_data in players_data:
                TetrisScore.objects.create(
                    gameid=player_data['gameid'],
                    name=player_data['name'],
                    score=player_data['score'],
                    lines_cleared=player_data['lines_cleared'],
                    level=player_data['level']
                )

            # Handle MMR updates based on the number of players
            if len(players_data) == 2:
                p1, p2 = players_data
                update_player_ratings(
                    player1_name=p1['name'],
                    player2_name=p2['name'],
                    player1_score=p1['score'],
                    player2_score=p2['score'],
                )
            elif len(players_data) > 2:
                # Implement your logic for more than two players
                # Example: Rank players by score and update ratings pairwise
                sorted_players = sorted(players_data, key=lambda x: x['score'], reverse=True)
                for i in range(len(sorted_players)):
                    for j in range(i + 1, len(sorted_players)):
                        update_player_ratings(
                            player1_name=sorted_players[i]['name'],
                            player2_name=sorted_players[j]['name'],
                            player1_score=sorted_players[i]['score'],
                            player2_score=sorted_players[j]['score'],
                        )
            else:
                raise ValueError("Insufficient number of players for MMR update.")

            return JsonResponse({'message': 'Game data successfully saved'}, status=200)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)
