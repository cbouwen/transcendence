import random
from typing import Optional, Tuple
from collections import defaultdict
from .models import TetrisScore

class ActivePlayerManagerError(Exception):
    """Custom exception for ActivePlayerManager errors."""
    pass

class ActivePlayerManager:
    def __init__(self):
        # The keys in active_players will be the user’s id.
        self.active_players = {}

    def add_player(self, player):
        if player is None:
            raise ActivePlayerManagerError("Cannot add a None player.")

        # Use the user id from the player's related user as key.
        key = player.user.id
        if key in self.active_players:
            return "already active"

        try:
            match_history = self.fetch_match_history_from_db(key)
        except Exception as e:
            raise ActivePlayerManagerError(
                f"Failed to fetch match history for user ID '{key}': {str(e)}"
            ) from e

        self.active_players[key] = {
            "player": player,
            "times_matched_with": match_history
        }
        return "player added"

    def remove_player(self, user):
        key = user.id
        if key not in self.active_players:
            raise ActivePlayerManagerError(f"Player with user ID '{key}' is not an active player.")
        del self.active_players[key]

    def clear_all_players(self):
        self.active_players.clear()

    def fetch_match_history_from_db(self, user_id: int) -> dict:
        try:
            # Query match history using the user's id.
            player_gameids = TetrisScore.objects.filter(user_id=user_id).values_list('gameid', flat=True)
            times_matched_with = defaultdict(int)

            for g_id in player_gameids:
                participants = TetrisScore.objects.filter(gameid=g_id).values_list('user_id', flat=True)
                for uid in participants:
                    if uid != user_id:
                        times_matched_with[uid] += 1

            return dict(times_matched_with)
        except Exception as e:
            raise ActivePlayerManagerError(
                f"Database error while fetching match history for user ID '{user_id}': {str(e)}"
            ) from e

    def refresh_all_players_match_histories(self):
        for user_id in list(self.active_players.keys()):
            try:
                new_history = self.fetch_match_history_from_db(user_id)
                self.active_players[user_id]["times_matched_with"] = new_history
            except Exception as e:
                raise ActivePlayerManagerError(
                    f"Failed to refresh match history for user ID '{user_id}': {str(e)}"
                ) from e

    def find_next_match(self, user=None) -> Tuple[str, str]:
        players_list = list(self.active_players.values())
        n = len(players_list)
        if n < 2:
            return "", ""

        if user is not None:
            user_id = user.id
            specific_player_data = None
            # Now we compare against player.user.id
            for pdata in players_list:
                if pdata["player"].user.id == user_id:
                    specific_player_data = pdata
                    break

            if specific_player_data is None:
                raise ActivePlayerManagerError(f"Player with user ID '{user_id}' is not an active player.")

            possible_pairs = []
            for pdata in players_list:
                if pdata["player"].user.id == user_id:
                    continue  # Skip pairing the player with themselves.

                p1 = specific_player_data["player"]
                p2 = pdata["player"]

                # Use the user field for lookup in times_matched_with
                times_faced = specific_player_data["times_matched_with"].get(p2.user.id, 0)
                mmr_diff = abs(p1.matchmaking_rating - p2.matchmaking_rating)
                base_score = 1.0 / (1.0 + mmr_diff)
                face_penalty = times_faced * 0.2
                random_factor = random.uniform(0.0, 0.2)
                score = base_score - face_penalty + random_factor

                possible_pairs.append((p1.user.username, p2.user.username, score))

            if not possible_pairs:
                raise ActivePlayerManagerError(f"No valid match found for player with user ID '{user_id}'.")

            best_pair = max(possible_pairs, key=lambda x: x[2])
            return best_pair[0], best_pair[1]
        else:
            possible_pairs = []
            for i in range(n):
                for j in range(i + 1, n):
                    p1_data = players_list[i]
                    p2_data = players_list[j]
                    p1 = p1_data["player"]
                    p2 = p2_data["player"]

                    times_faced = p1_data["times_matched_with"].get(p2.user.id, 0)
                    mmr_diff = abs(p1.matchmaking_rating - p2.matchmaking_rating)
                    base_score = 1.0 / (1.0 + mmr_diff)
                    face_penalty = times_faced * 0.2
                    random_factor = random.uniform(0.0, 0.2)
                    score = base_score - face_penalty + random_factor

                    possible_pairs.append((p1.user.username, p2.user.username, score))

            if not possible_pairs:
                raise ActivePlayerManagerError("No valid match found among active players.")

            best_pair = max(possible_pairs, key=lambda x: x[2])
            return best_pair[0], best_pair[1]

# Instantiate the global active player manager
active_player_manager = ActivePlayerManager()
