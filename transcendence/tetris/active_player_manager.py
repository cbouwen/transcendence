import random
from typing import Optional, Tuple

class ActivePlayerManager:
    def __init__(self):
        # Dictionary keyed by player name
        # Value is another dict containing the TetrisPlayer and a "times_matched_with" map
        self.active_players = {}  

    def add_player(self, player):
        """
        Add a player to the active pool.
        Initialize their 'times_matched_with' dictionary if not present.
        """
        self.active_players[player.name] = {
            "player": player,
            "times_matched_with": {}
        }

    def remove_player(self, player_name: str):
        """
        Remove a player from the active pool.
        """
        if player_name in self.active_players:
            del self.active_players[player_name]

    def clear_all_players(self):
        """
        Removes all players from the active pool.
        """
        self.active_players.clear()

    def update_match_history(self, p1_name: str, p2_name: str):
        """
        Increment the 'times_matched_with' counters for the two players that just got matched.
        This will ensure the system counts how many times they’ve faced each other.
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

    def find_next_match(self) -> Optional[Tuple[str, str]]:
        """
        Find and return the next best match as a tuple of player names (p1_name, p2_name).
        
        Basic logic:
        - Create all possible pairs among active players.
        - Calculate a 'score' for each pair, taking into account MMR difference
          and how many times they've faced each other already.
        - Optionally add some randomness if you want to break ties or reduce repetition.
        - Return the pair with the highest 'score'.

        If no pairs are available, return None.
        """
        players_list = list(self.active_players.values())
        n = len(players_list)
        if n < 2:
            return None  # not enough players to form a match

        possible_pairs = []

        for i in range(n):
            for j in range(i + 1, n):
                p1_data = players_list[i]
                p2_data = players_list[j]

                p1 = p1_data["player"]
                p2 = p2_data["player"]

                # Times these two have already faced each other
                times_faced = p1_data["times_matched_with"].get(p2.name, 0)

                # Compute some difference in MMR
                mmr_diff = abs(p1.matchmaking_rating - p2.matchmaking_rating)

                # Simple formula (you can tweak as you like):
                #   - Higher is "better" for pairing
                #   - Favor smaller MMR difference
                #   - Penalize pairs that have faced each other too many times
                #   - Add some randomness
                base_score = 1.0 / (1.0 + mmr_diff)  # smaller diff => bigger portion
                face_penalty = times_faced * 0.2     # each previous matchup lowers the score
                random_factor = random.uniform(0.0, 0.2)  # add up to 0.2 of randomness

                score = base_score - face_penalty + random_factor
                possible_pairs.append((p1.name, p2.name, score))

        if not possible_pairs:
            return None

        # Sort or pick max by 'score'. We pick the pair with the highest 'score'.
        best_pair = max(possible_pairs, key=lambda x: x[2])

        return best_pair[0], best_pair[1]
