import random
from typing import Optional, Tuple
from collections import defaultdict
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from .models import TetrisScore, TetrisPlayer
from .managers import active_player_manager  # Ensure correct import path

@receiver(user_logged_in)
def on_player_login(sender, request, user, **kwargs):
    """
    Signal handler for user login. Adds the player to the active pool.
    """
    try:
        player = TetrisPlayer.objects.get(user=user)
        active_player_manager.add_player(player)
    except TetrisPlayer.DoesNotExist:
        pass  # Optionally, handle the case where TetrisPlayer does not exist

@receiver(user_logged_out)
def on_player_logout(sender, request, user, **kwargs):
    """
    Signal handler for user logout. Removes the player from the active pool.
    """
    try:
        player = TetrisPlayer.objects.get(user=user)
        active_player_manager.remove_player(player.name)
    except TetrisPlayer.DoesNotExist:
        pass  # Optionally, handle the case where TetrisPlayer does not exist
