# views.py

import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import TetrisScore, TetrisPlayer
from .calculate_mmr import update_player_ratings

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
