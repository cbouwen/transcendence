# views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from django.shortcuts import render

from django.shortcuts import render

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

@api_view(['POST'])
def save_tetris_scores(request):
    """
    Receives a POST request with JSON data in the format:
    {
        "players": [
            {
                "gameid": "1694457890201",   # Example game ID
                "name": "Alice",
                "score": 100,
                "lines_cleared": 5,
                "level": 1
            },
            {
                "gameid": "1694457890201",
                "name": "Bob",
                "score": 80,
                "lines_cleared": 3,
                "level": 1
            },
            ...
        ]
    }
    """
    # Extract the list of players from the request body
    player_data = request.data.get('players', [])

    # Use the serializer to validate and deserialize the data
    serializer = TetrisScoreSerializer(data=player_data, many=True)
    if serializer.is_valid():
        serializer.save()  # Saves multiple entries to the DB if many=True
        return Response({'message': 'Scores saved successfully!'}, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
