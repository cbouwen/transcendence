# serializers.py
from rest_framework import serializers
from .models import TetrisPlayer, TetrisScore

class TetrisScoreSerializer(serializers.ModelSerializer):
    """
    Serializer to handle the TetrisScore model fields.
    """
    class Meta:
        model = TetrisScore
        fields = ('gameid', 'user', 'score', 'lines_cleared', 'level')

class TetrisPlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TetrisPlayer
        fields = ('user', 'matchmaking_rating')
