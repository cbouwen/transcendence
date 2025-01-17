from django.core.exceptions import ObjectDoesNotExist
from models import TetrisPlayer

def update_player_ratings(player1_name, player2_name, player1_score, player2_score):
    """
    Determines the winner between two players based on their scores, retrieves
    the players' current MMR from the TetrisPlayer database, calls
    calculate_new_ratings to update their ratings, and saves the updated ratings
    back to the database.
    
    Args:
        player1_name (str): Name of player 1.
        player2_name (str): Name of player 2.
        player1_score (int): Score of player 1.
        player2_score (int): Score of player 2.
        
    Returns:
        tuple: Updated TetrisPlayer objects for player1 and player2.
    """
    try:
        player1 = TetrisPlayer.objects.get(name=player1_name)
        player2 = TetrisPlayer.objects.get(name=player2_name)
    except ObjectDoesNotExist:
        raise ValueError("One or both players do not exist in the database.")

    # Determine the winner by comparing scores
    if player1_score > player2_score:
        result = 1  # player1 is the winner
    elif player2_score > player1_score:
        result = 2  # player2 is the winner
    else:
        # In case of a tie, handle it according to your logic
        # (E.g., no rating change or half-win logic).
        # Here, we'll just raise an error.
        raise ValueError("Scores are tied. No winner could be determined.")

    # Calculate new ratings using your existing function
    new_rating1, new_rating2 = calculate_new_ratings(
        player1_rating=player1.matchmaking_rating,
        player2_rating=player2.matchmaking_rating,
        result=result
    )

    # Update the player objects with new ratings and save
    player1.matchmaking_rating = new_rating1
    player2.matchmaking_rating = new_rating2
    player1.save()
    player2.save()

    return player1, player2

def calculate_new_ratings(player1_rating, player2_rating, result):
    """
    Calculates the new matchmaking ratings for two players based on the result.
    
    Args:
        player1_rating (int): Current rating of player 1.
        player2_rating (int): Current rating of player 2.
        result (int): 1 if player 1 won, 2 if player 2 won.
        
    Returns:
        tuple: Updated ratings for player 1 and player 2.
    """
    # Define the K-factor (adjustment factor)
    K = 32

    # Calculate expected outcomes
    expected1 = 1 / (1 + 10 ** ((player2_rating - player1_rating) / 400))
    expected2 = 1 / (1 + 10 ** ((player1_rating - player2_rating) / 400))

    # Determine the actual outcome based on the result
    if result == 1:  # Player 1 won
        actual1, actual2 = 1, 0
    elif result == 2:  # Player 2 won
        actual1, actual2 = 0, 1
    else:
        raise ValueError("Result must be 1 (Player 1 wins) or 2 (Player 2 wins)")

    # Update ratings
    new_player1_rating = round(player1_rating + K * (actual1 - expected1))
    new_player2_rating = round(player2_rating + K * (actual2 - expected2))

    return new_player1_rating, new_player2_rating
