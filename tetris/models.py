# models.py
from django.db import models

class TetrisScore(models.Model):
    """
    Model to store Tetris game results.
    """
    gameid = models.CharField(max_length=100)  # Unique or shared ID representing a game instance
    name = models.CharField(max_length=100)
    score = models.IntegerField()
    lines_cleared = models.IntegerField()
    level = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Game {self.gameid} - {self.name}: {self.score}"
