# models.py
from django.db import models

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
    player_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=100)
    matchmaking_rating = models.IntegerField()

    def __str__(self):
        return f"Player {self.player_id} - {self.name}: {self.matchmaking_rating}"
