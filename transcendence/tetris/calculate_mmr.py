from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import User
from .models import TetrisPlayer

def update_player_ratings(user1: User, user2: User, player1_score: int, player2_score: int):
    """
    Determines the winner between two players based on their scores, retrieves
    the players' current MMR from the TetrisPlayer database, calls
    calculate_new_ratings to update their ratings, and saves the updated ratings
    back to the database.
    
    Args:
        user1 (User): Django User instance for player 1.
        user2 (User): Django User instance for player 2.
        player1_score (int): Score of player 1.
        player2_score (int): Score of player 2.
        
    Returns:
        tuple: Updated TetrisPlayer objects for user1 and user2.
    """
    try:
        player1 = TetrisPlayer.objects.get(user=user1)
        player2 = TetrisPlayer.objects.get(user=user2)
    except ObjectDoesNotExist:
        raise ValueError("One or both players do not exist in the database.")

    # Determine the winner by comparing scores.
    if player1_score > player2_score:
        result = 1  # user1 is the winner.
    elif player2_score > player1_score:
        result = 2  # user2 is the winner.
    else:
        raise ValueError("Scores are tied. No winner could be determined.")

    # Calculate new ratings using the provided function.
    new_rating1, new_rating2 = calculate_new_ratings(
        player1_rating=player1.matchmaking_rating,
        player2_rating=player2.matchmaking_rating,
        result=result
    )

    # Update the player objects with the new ratings and save.
    player1.matchmaking_rating = new_rating1
    player2.matchmaking_rating = new_rating2
    player1.save()
    player2.save()

    return player1, player2

def calculate_new_ratings(player1_rating: int, player2_rating: int, result: int):
    """
    Calculates the new matchmaking ratings for two players based on the result.
    
    Args:
        player1_rating (int): Current rating of player 1.
        player2_rating (int): Current rating of player 2.
        result (int): 1 if player 1 wins, 2 if player 2 wins.
        
    Returns:
        tuple: Updated ratings for player 1 and player 2.
    """
    # Define the K-factor (adjustment factor).
    K = 32

    # Calculate expected outcomes.
    expected1 = 1 / (1 + 10 ** ((player2_rating - player1_rating) / 400))
    expected2 = 1 / (1 + 10 ** ((player1_rating - player2_rating) / 400))

    # Determine the actual outcomes based on the result.
    if result == 1:  # user1 won.
        actual1, actual2 = 1, 0
    elif result == 2:  # user2 won.
        actual1, actual2 = 0, 1
    else:
        raise ValueError("Result must be 1 (User1 wins) or 2 (User2 wins)")

    # Update ratings.
    new_player1_rating = round(player1_rating + K * (actual1 - expected1))
    new_player2_rating = round(player2_rating + K * (actual2 - expected2))

    return new_player1_rating, new_player2_rating
