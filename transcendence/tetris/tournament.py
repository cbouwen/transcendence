import random

class TournamentError(Exception):
    """Custom exception for Tournament-related errors."""
    pass

class Tournament:
    def __init__(self):
        self.init = 0
        self.game = []
        self.players = []         # List of registered players (strings)
        self.started = False      # Once True, players cannot be added/removed
        self.rounds = []          # List of rounds. Each round is a list of matches.
        self.current_round_index = -1  # Index for current round (starts at 0 once started)

    def declare_game(self, game_name: str):
        if (game_name != "tetris" and game_name != "pong"):
            raise TournamentError("unknown game")
        self.game = game_name
        self.init = 1

    def add_player(self, player_name: str) -> None:
        """
        Add a player by name to the tournament.
        Only allowed before the tournament starts.
        Raises TournamentError if the tournament has already started or
        if the player is already registered.
        """
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        if self.started:
            raise TournamentError("Tournament already started – cannot add new players.")
        if player_name in self.players:
            raise TournamentError(f"Player '{player_name}' is already registered.")
        self.players.append(player_name)

    def remove_player(self, player_name: str) -> None:
        """
        Remove a player by name from the tournament.
        Only allowed before the tournament starts.
        Raises TournamentError if the tournament has already started or
        if the player is not registered.
        """
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        if self.started:
            raise TournamentError("Tournament already started – cannot remove players.")
        if player_name not in self.players:
            raise TournamentError(f"Player '{player_name}' is not registered.")
        self.players.remove(player_name)

    def start_tournament(self) -> dict:
        """
        Starts the tournament by shuffling players and creating the first round bracket.
        Returns a dictionary containing the list of players and round info.
        Raises TournamentError if the tournament is already started or if there 
        are fewer than 2 players.
        """
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        if self.started:
            raise TournamentError("Tournament already started.")
        if len(self.players) < 2:
            raise TournamentError("Not enough players to start a tournament (need at least 2).")
        self.started = True
        random.shuffle(self.players)
        round_info = self.generate_round(self.players)
        return {"players": self.players, "round": round_info}

    def generate_round(self, players_list: list) -> dict:
        """
        Given a list of players, creates match pairings for the round.
        If the number of players is odd, the last player gets a bye (auto-advances).
        Each match is represented as a dictionary:
          {"player1": <name>, "player2": <name or None>, "winner": <None or name>}
        Returns round information:
          - If only one player remains, returns {"champion": <player_name>}
          - Otherwise, returns {"matches": <detailed match info>}
        """
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        round_matches = []
        i = 0
        while i < len(players_list):
            if i + 1 < len(players_list):
                match = {"player1": players_list[i], "player2": players_list[i+1], "winner": None}
                round_matches.append(match)
                i += 2
            else:
                # Odd number of players: this player gets a bye.
                match = {"player1": players_list[i], "player2": None, "winner": players_list[i]}
                round_matches.append(match)
                i += 1

        self.rounds.append(round_matches)
        self.current_round_index = len(self.rounds) - 1

        # If only one player remains, the tournament is over.
        if len(players_list) == 1:
            self.started = False
            return {"champion": players_list[0]}
        else:
            return {"matches": self.get_current_round_matches_info()}

    def update_match(self, winner: str, loser: str) -> dict:
        """
        Update the current round by marking a match result.
        After each update, if the round is complete, generates the next round.
        Returns updated round info or champion details if the tournament is over.
        Raises TournamentError if the tournament hasn't started or if the match
        is not found or already updated.
        """
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        if not self.started:
            raise TournamentError("Tournament hasn't started yet.")

        current_round = self.rounds[self.current_round_index]
        match_found = False

        # Search for the match in the current round where both players are present.
        for match in current_round:
            # Skip if this match already has a recorded winner (for regular matches).
            if match["winner"] is not None and match["player2"] is not None:
                continue

            # For a regular match, check if the pair (winner, loser) matches (order doesn't matter).
            if match["player2"] is not None:
                players_in_match = {match["player1"], match["player2"]}
                if {winner, loser} == players_in_match:
                    match["winner"] = winner
                    match_found = True
                    break

        if not match_found:
            raise TournamentError("Match not found or already updated in the current round.")

        # Check if the current round is complete.
        if all(match["winner"] is not None for match in current_round):
            # Gather all winners from this round.
            winners = [match["winner"] for match in current_round]
            # If only one winner remains, we have a champion.
            if len(winners) == 1:
                self.started = False
                return {"champion": winners[0]}
            else:
                round_info = self.generate_round(winners)
                return {
                    "message": "Round complete. Advancing winners to the next round.",
                    "round": round_info
                }

        return {
            "message": f"Match result updated: '{winner}' defeated '{loser}'.",
            "round": self.get_current_round_matches_info()
        }

    def get_current_round_matches(self) -> list:
        """
        Returns the current round bracket as a list of strings, where each string represents
        the two players in a match. For a bye match, it indicates that the player auto-advances.
        """
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        if self.current_round_index < 0 or self.current_round_index >= len(self.rounds):
            return []
        round_bracket = []
        for match in self.rounds[self.current_round_index]:
            if match["player2"] is None:
                match_str = f"{match['player1']} gets a bye (auto-advances)."
            else:
                match_str = f"{match['player1']} vs {match['player2']}"
                if match["winner"]:
                    match_str += f" -> Winner: {match['winner']}"
            round_bracket.append(match_str)
        return round_bracket

    def get_current_match(self):
        """
        Returns the next (unplayed) match in the current round as a tuple of two strings:
        (player1, player2). This does not include bye matches.
        If all matches have been played or if no regular match exists, returns None.
        """
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        if self.current_round_index < 0 or self.current_round_index >= len(self.rounds):
            return None

        for match in self.rounds[self.current_round_index]:
            if match["player2"] is not None and match["winner"] is None:
                return (match["player1"], match["player2"])
        return None

    def get_current_round_matches_info(self) -> list:
        """
        Returns detailed match information for the current round as a list of dictionaries.
        Each dictionary contains:
           - "player1": str
           - "player2": str or None
           - "winner": str or None
           - "played": bool (True if the match has been played or is a bye, else False)
        """
        if self.current_round_index < 0 or self.current_round_index >= len(self.rounds):
            return []
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")

        matches_info = []
        for match in self.rounds[self.current_round_index]:
            info = {
                "player1": match["player1"],
                "player2": match["player2"],
                "winner": match["winner"],
                "played": (match["winner"] is not None)
            }
            matches_info.append(info)
        return matches_info

    def cancel_tournament(self) -> None:
        """
        Cancels the tournament by resetting all internal state.
        This removes all registered players, clears rounds, and resets the current round index.
        """
        self.init = 0
        self.game.clear()
        self.players.clear()
        self.rounds.clear()
        self.current_round_index = -1
        self.started = False

g_tournament = Tournament()
