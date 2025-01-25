import random
from typing import Optional, Tuple
from collections import defaultdict
from .models import TetrisScore

class ActivePlayerManager:
    def __init__(self):
        self.active_players = {}

    def add_player(self, player):
        """
        Add a player to the active pool,
        automatically fetching their past match history from the database.
        """
        match_history = self.fetch_match_history_from_db(player.name)
        self.active_players[player.name] = {
            "player": player,
            "times_matched_with": match_history
        }

    def remove_player(self, player_name: str):
        if player_name in self.active_players:
            del self.active_players[player_name]

    def clear_all_players(self):
        self.active_players.clear()

    def fetch_match_history_from_db(self, player_name: str) -> dict:
        """
        Queries TetrisScore to find how many times 'player_name' has faced each other player.
        """
        player_gameids = TetrisScore.objects.filter(name=player_name).values_list('gameid', flat=True)
        times_matched_with = defaultdict(int)

        for g_id in player_gameids:
            participants = TetrisScore.objects.filter(gameid=g_id).values_list('name', flat=True)
            for p in participants:
                if p != player_name:
                    times_matched_with[p] += 1

        return dict(times_matched_with)

    def update_match_history(self, p1_name: str, p2_name: str):
        """
        Increment the 'times_matched_with' counters for the two players that just got matched.
        (Optionally, also save the match to the DB.)
        """
        if p1_name in self.active_players:
            p1_data = self.active_players[p1_name]
            p1_data["times_matched_with"][p2_name] = (
                p1_data["times_matched_with"].get(p2_name, 0) + 1
            )

        if p2_name in self.active_players:
            p2_data = self.active_players[p2_name]
            p2_data["times_matched_with"][p1_name] = (
                p2_data["times_matched_with"].get(p1_name, 0) + 1
            )

        # Optionally, persist a new match to the DB here:
        # self.save_new_match_to_db(p1_name, p2_name)

    def refresh_all_players_match_histories(self):
        """
        After one or more matches have been added to the database,
        refresh EVERY active player's match history so it matches the latest DB state.
        """
        for player_name in self.active_players:
            # Re-fetch from the DB and update our in-memory dictionary
            new_history = self.fetch_match_history_from_db(player_name)
            self.active_players[player_name]["times_matched_with"] = new_history

    def find_next_match(self) -> Optional[Tuple[str, str]]:
        players_list = list(self.active_players.values())
        n = len(players_list)
        if n < 2:
            return None

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
            return None

        best_pair = max(possible_pairs, key=lambda x: x[2])
        return best_pair[0], best_pair[1]
