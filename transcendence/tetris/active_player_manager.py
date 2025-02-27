import random
from typing import Optional, Tuple
from collections import defaultdict
from .models import TetrisScore

class ActivePlayerManagerError(Exception):
    """Custom exception for ActivePlayerManager errors."""
    pass

class ActivePlayerManager:
    def __init__(self):
        self.active_players = {}

    def add_player(self, player):
        if player is None:
            raise ActivePlayerManagerError("Cannot add a None player.")

        if player.name in self.active_players:
            raise ActivePlayerManagerError(f"Player '{player.name}' is already active.")

        try:
            match_history = self.fetch_match_history_from_db(player.name)
        except Exception as e:
            raise ActivePlayerManagerError(
                f"Failed to fetch match history for player '{player.name}': {str(e)}"
            ) from e

        self.active_players[player.name] = {
            "player": player,
            "times_matched_with": match_history
        }

    def remove_player(self, player_name: str):
        if player_name not in self.active_players:
            raise ActivePlayerManagerError(f"Player '{player_name}' is not an active player.")
        del self.active_players[player_name]

    def clear_all_players(self):
        self.active_players.clear()

    def fetch_match_history_from_db(self, player_name: str) -> dict:
        try:
            player_gameids = TetrisScore.objects.filter(name=player_name).values_list('gameid', flat=True)
            times_matched_with = defaultdict(int)

            for g_id in player_gameids:
                participants = TetrisScore.objects.filter(gameid=g_id).values_list('name', flat=True)
                for p in participants:
                    if p != player_name:
                        times_matched_with[p] += 1

            return dict(times_matched_with)
        except Exception as e:
            raise ActivePlayerManagerError(
                f"Database error while fetching match history for '{player_name}': {str(e)}"
            ) from e

    def update_match_history(self, p1_name: str, p2_name: str):
        if p1_name not in self.active_players:
            raise ActivePlayerManagerError(f"Player '{p1_name}' is not an active player.")
        if p2_name not in self.active_players:
            raise ActivePlayerManagerError(f"Player '{p2_name}' is not an active player.")

        p1_data = self.active_players[p1_name]
        p2_data = self.active_players[p2_name]

        p1_data["times_matched_with"][p2_name] = p1_data["times_matched_with"].get(p2_name, 0) + 1
        p2_data["times_matched_with"][p1_name] = p2_data["times_matched_with"].get(p1_name, 0) + 1

        # Optionally, persist a new match to the DB here:
        # self.save_new_match_to_db(p1_name, p2_name)

    def refresh_all_players_match_histories(self):
        for player_name in list(self.active_players.keys()):
            try:
                new_history = self.fetch_match_history_from_db(player_name)
                self.active_players[player_name]["times_matched_with"] = new_history
            except Exception as e:
                raise ActivePlayerManagerError(
                    f"Failed to refresh match history for '{player_name}': {str(e)}"
                ) from e

    def find_next_match(self, player_name: Optional[str] = None) -> Tuple[str, str]:
        players_list = list(self.active_players.values())
        n = len(players_list)

        if n < 2:
            raise ActivePlayerManagerError("Not enough active players to find a match.")

        if player_name:
            specific_player_data = None
            for pdata in players_list:
                if pdata["player"].name == player_name:
                    specific_player_data = pdata
                    break

            if specific_player_data is None:
                raise ActivePlayerManagerError(f"Player '{player_name}' is not an active player.")

            possible_pairs = []
            for pdata in players_list:
                if pdata["player"].name == player_name:
                    continue  # Skip pairing the player with themselves.

                p1 = specific_player_data["player"]
                p2 = pdata["player"]

                times_faced = specific_player_data["times_matched_with"].get(p2.name, 0)
                mmr_diff = abs(p1.matchmaking_rating - p2.matchmaking_rating)
                base_score = 1.0 / (1.0 + mmr_diff)
                face_penalty = times_faced * 0.2
                random_factor = random.uniform(0.0, 0.2)
                score = base_score - face_penalty + random_factor

                possible_pairs.append((p1.name, p2.name, score))

            if not possible_pairs:
                raise ActivePlayerManagerError(f"No valid match found for player '{player_name}'.")

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

                    times_faced = p1_data["times_matched_with"].get(p2.name, 0)
                    mmr_diff = abs(p1.matchmaking_rating - p2.matchmaking_rating)
                    base_score = 1.0 / (1.0 + mmr_diff)
                    face_penalty = times_faced * 0.2
                    random_factor = random.uniform(0.0, 0.2)
                    score = base_score - face_penalty + random_factor

                    possible_pairs.append((p1.name, p2.name, score))

            if not possible_pairs:
                raise ActivePlayerManagerError("No valid match found among active players.")

            best_pair = max(possible_pairs, key=lambda x: x[2])
            return best_pair[0], best_pair[1]

# Instantiate the global active player manager
active_player_manager = ActivePlayerManager()
