from django.contrib.auth import authenticate
from django.http import JsonResponse
from .models import TetrisPlayer, TetrisScore

async function loginUser(username, password) {
    const response = await fetch('/temporary-login/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
        const data = await response.json();
        console.log('Login successful:', data);
        // Update the UI with player data
        displayPlayerData(data.player, data.scores);
    } else {
        const error = await response.json();
        console.error('Login failed:', error.message);
        // Show error message to the user
        alert(error.message);
    }
}

def temporary_login(request):
    username = request.POST.get('username')
    password = request.POST.get('password')

    user = authenticate(username=username, password=password)

    if user is not None:
        try:
            player = TetrisPlayer.objects.get(name=username)
            scores = TetrisScore.objects.filter(name=username).order_by('-timestamp')

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
        return JsonResponse({"status": "error", "message": "Invalid credentials"}, status=401)
