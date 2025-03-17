from django.db import models
from django.conf import settings

class PongScore(models.Model):
    gameid = models.CharField(max_length=100)
    me = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="games_as_me")
    them = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="games_as_them")
    my_score = models.IntegerField()
    their_score = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)

"""
class PongPlayer(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, default=1)
    matchmaking_rating = models.IntegerField()

    def __str__(self):
        return f"Player {self.matchmaking_rating}"
"""
