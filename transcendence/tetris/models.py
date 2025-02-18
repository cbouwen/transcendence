from django.db import models
from django.conf import settings  # Import settings for AUTH_USER_MODEL

class TetrisScore(models.Model):
    """
    Model to store Tetris game results.
    """
    gameid = models.CharField(max_length=100)
    name = models.CharField(max_length=100)
    score = models.IntegerField()
    lines_cleared = models.IntegerField()
    level = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Game {self.gameid} - {self.name}: {self.score}"


class TetrisPlayer(models.Model):
    """
    Model to store Tetris player data.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, default=1)
    name = models.CharField(max_length=100)
    matchmaking_rating = models.IntegerField()

    def __str__(self):
        return f"Player {self.name}: {self.matchmaking_rating}"
