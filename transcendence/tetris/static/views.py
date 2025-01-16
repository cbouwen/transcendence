# views.py
import json
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import TetrisScore, TetrisPlayer
from .calculate_mmr import update_player_ratings


def one_player(request):
    return render(request, 'tetris/html_1_player_test.html')

def two_player(request):
    return render(request, 'tetris/html_2_player_test.html')

def three_player(request):
    return render(request, 'tetris/html_3_player_test.html')

def one_player_original(request):
    return render(request, 'tetris/1_player.html')

def two_player_original(request):
    return render(request, 'tetris/2_player.html')

def three_player_original(request):
    return render(request, 'tetris/3_player.html')


from .serializers import TetrisScoreSerializer

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
            
            # If you generate a unique game_id on the frontend, it should be in each player's record.
            # E.g., players_data = [
            #     {
            #         "gameid": "some_unique_id",
            #         "name": "Player1",
            #         "score": 12345,
            #         "lines_cleared": 50,
            #         "level": 10
            #     },
            #     {
            #         "gameid": "some_unique_id",
            #         "name": "Player2",
            #         "score": 9876,
            #         "lines_cleared": 45,
            #         "level": 9
            #     }
            # ]

            # Save each player's result to the TetrisScore model
            for player_data in players_data:
                TetrisScore.objects.create(
                    gameid=player_data['gameid'],
                    name=player_data['name'],
                    score=player_data['score'],
                    lines_cleared=player_data['lines_cleared'],
                    level=player_data['level']
                )

            # Example logic for 2-player game
            if len(players_data) == 2:
                p1 = players_data[0]
                p2 = players_data[1]

                update_player_ratings(
                    player1_name=p1['name'],
                    player2_name=p2['name'],
                    player1_score=p1['score'],
                    player2_score=p2['score'],
                )
            
            # If you have more than two players, you'll need different logic
            # for awarding MMR. Possibly comparing top scores, etc.

            return JsonResponse({'message': 'Game data successfully saved'}, status=200)
        
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)
