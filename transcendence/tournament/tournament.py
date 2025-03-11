import random
from django.contrib.auth.models import User  # assuming Django’s built-in User model

class TournamentError(Exception):
    """Custom exception for Tournament-related errors."""
    pass

class Tournament:
    def __init__(self):
        self.init = 0
        self.game = None
        self.players = []         # List of registered users (Django User objects)
        self.started = False      # Once True, players cannot be added/removed
        self.rounds = []          # List of rounds. Each round is a list of matches.
        self.current_round_index = -1  # Index for current round (starts at 0 once started)

    def declare_game(self, game_name: str):
        if game_name not in ["tetris", "pong"]:
            raise TournamentError("unknown game")
        self.game = game_name
        self.init = 1

    def add_player(self, user: User) -> None:
        """
        Add a user to the tournament.
        Only allowed before the tournament starts.
        Raises TournamentError if the tournament has already started or
        if the user is already registered.
        """
        if self.started:
            raise TournamentError("Tournament already started – cannot add new users.")
        # Check by user ID to avoid duplicates.
        if any(player.id == user.id for player in self.players):
            raise TournamentError(f"User '{user.username}' is already registered.")
        self.players.append(user)

    def remove_player(self, user: User) -> None:
        """
        Remove a user from the tournament.
        Only allowed before the tournament starts.
        Raises TournamentError if the tournament has already started or
        if the user is not registered.
        """
        if self.started:
            raise TournamentError("Tournament already started – cannot remove users.")
        for player in self.players:
            if player.id == user.id:
                self.players.remove(player)
                return
        raise TournamentError(f"User '{user.username}' is not registered.")

    def start_tournament(self) -> dict:
        """
        Starts the tournament by shuffling users and creating the first round bracket.
        Returns a dictionary containing the list of users and round info.
        Raises TournamentError if the tournament is already started or if there 
        are fewer than 2 users.
        """
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        if self.started:
            raise TournamentError("Tournament already started.")
        if len(self.players) < 2:
            raise TournamentError("Not enough users to start a tournament (need at least 2).")
        self.started = True
        random.shuffle(self.players)
        round_info = self.generate_round(self.players)
        # Returning usernames for display
        return {"players": [user.username for user in self.players], "round": round_info}

    def generate_round(self, users_list: list) -> dict:
        """
        Given a list of users, creates match pairings for the round.
        If the number of users is odd, the last user gets a bye (auto-advances).
        Each match is represented as a dictionary:
          {"player1": <User>, "player2": <User or None>, "winner": <None or User>}
        Returns round information:
          - If only one user remains, returns {"champion": <user.username>}
          - Otherwise, returns {"matches": <detailed match info>}
        """
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        round_matches = []
        i = 0
        while i < len(users_list):
            if i + 1 < len(users_list):
                match = {"player1": users_list[i], "player2": users_list[i+1], "winner": None}
                round_matches.append(match)
                i += 2
            else:
                # Odd number of users: this user gets a bye.
                match = {"player1": users_list[i], "player2": None, "winner": users_list[i]}
                round_matches.append(match)
                i += 1

        self.rounds.append(round_matches)
        self.current_round_index = len(self.rounds) - 1

        # If only one user remains, the tournament is over.
        if len(users_list) == 1:
            self.started = False
            return {"champion": users_list[0].username}
        else:
            return {"matches": self.get_current_round_matches_info()}

    def update_match(self, winner: User, loser: User) -> dict:
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

        for match in current_round:
            # Skip bye matches (player2 is None) or already updated matches.
            if match["player2"] is None or (match["winner"] is not None and match["player2"] is not None):
                continue

            # Check if the provided winner and loser correspond to the match.
            if {winner.id, loser.id} == {match["player1"].id, match["player2"].id}:
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
                return {"champion": winners[0].username}
            else:
                round_info = self.generate_round(winners)
                return {
                    "message": "Round complete. Advancing winners to the next round.",
                    "round": round_info
                }

        return {
            "message": f"Match result updated: '{winner.username}' defeated '{loser.username}'.",
            "round": self.get_current_round_matches_info()
        }

    def get_current_round_matches(self) -> list:
        """
        Returns the current round bracket as a list of strings, where each string represents
        the two users in a match. For a bye match, it indicates that the user auto-advances.
        """
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        if self.current_round_index < 0 or self.current_round_index >= len(self.rounds):
            return []
        round_bracket = []
        for match in self.rounds[self.current_round_index]:
            if match["player2"] is None:
                match_str = f"{match['player1'].username} gets a bye (auto-advances)."
            else:
                match_str = f"{match['player1'].username} vs {match['player2'].username}"
                if match["winner"]:
                    match_str += f" -> Winner: {match['winner'].username}"
            round_bracket.append(match_str)
        return round_bracket

    def get_current_match(self):
        """
        Returns the next (unplayed) match in the current round as a tuple of two User objects:
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
           - "player1": str (username)
           - "player2": str or None (username)
           - "winner": str or None (username)
           - "played": bool (True if the match has been played or is a bye, else False)
        """
        if self.current_round_index < 0 or self.current_round_index >= len(self.rounds):
            return []
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")

        matches_info = []
        for match in self.rounds[self.current_round_index]:
            info = {
                "player1": match["player1"].username,
                "player2": match["player2"].username if match["player2"] else None,
                "winner": match["winner"].username if match["winner"] else None,
                "played": (match["winner"] is not None)
            }
            matches_info.append(info)
        return matches_info

    def cancel_tournament(self) -> None:
        """
        Cancels the tournament by resetting all internal state.
        This removes all registered users, clears rounds, and resets the current round index.
        """
        self.init = 0
        self.game = None
        self.players.clear()
        self.rounds.clear()
        self.current_round_index = -1
        self.started = False

g_tournament = Tournament()

# Example usage:
# g_tournament = Tournament()
# g_tournament.declare_game("tetris")
# user1 = User.objects.get(pk=1)
# user2 = User.objects.get(pk=2)
# g_tournament.add_player(user1)
# g_tournament.add_player(user2)
# tournament_data = g_tournament.start_tournament()
