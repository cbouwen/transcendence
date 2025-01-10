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
