# serializers.py
from rest_framework import serializers
from .models import TetrisPlayer, TetrisScore
from django.contrib.auth import get_user_model

User = get_user_model()

class TetrisScoreSerializer(serializers.ModelSerializer):
    """
    Serializer to handle the TetrisScore model fields.
    """
    class Meta:
        model = TetrisScore
        depth = 10
        fields = ('gameid', 'user', 'score', 'lines_cleared', 'level')
        fields = '__all__'

class TetrisPlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TetrisPlayer
        depth = 10
        fields = ('user', 'matchmaking_rating')
