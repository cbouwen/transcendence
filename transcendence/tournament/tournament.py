import random
import functools
from django.contrib.auth.models import User  # assuming Django’s built-in User model

class TournamentError(Exception):
    """Custom exception for Tournament-related errors."""
    pass

def tournament_error_only(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except TournamentError:
            # If it's already a TournamentError, re-raise it.
            raise
        except Exception as e:
            # Wrap any other exception as a TournamentError.
            raise TournamentError(f"An unexpected error occurred in {func.__name__}: {str(e)}")
    return wrapper

class Tournament:
    def __init__(self):
        self.init = 0
        self.game = None
        self.players = []         # List of registered users (Django User objects)
        self.started = False      # Once True, players cannot be added/removed
        self.rounds = []          # List of rounds. Each round is a list of matches.
        self.current_round_index = -1  # Index for current round (starts at 0 once started)

    @tournament_error_only
    def declare_game(self, game_name: str):
        if game_name not in ["tetris", "pong"]:
            raise TournamentError("unknown game")
        self.game = game_name
        self.init = 1

    @tournament_error_only
    def add_player(self, user: User) -> None:
        if self.started:
            raise TournamentError("Tournament already started – cannot add new users.")
        if any(player.id == user.id for player in self.players):
            raise TournamentError(f"User '{user.username}' is already registered.")
        self.players.append(user)

    @tournament_error_only
    def remove_player(self, user: User) -> None:
        if self.started:
            raise TournamentError("Tournament already started – cannot remove users.")
        for player in self.players:
            if player.id == user.id:
                self.players.remove(player)
                return
        raise TournamentError(f"User '{user.username}' is not registered.")

    @tournament_error_only
    def start_tournament(self) -> dict:
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        if self.started:
            raise TournamentError("Tournament already started.")
        if len(self.players) < 2:
            raise TournamentError("Not enough users to start a tournament (need at least 2).")
        self.started = True
        random.shuffle(self.players)
        round_info = self.generate_round(self.players)
        return {"players": [user.username for user in self.players], "round": round_info}

    @tournament_error_only
    def generate_round(self, users_list: list) -> dict:
        if self.init == 0 or self.started == 0:
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

        if len(users_list) == 1:
            self.started = False
            return {"champion": users_list[0].username}
        else:
            return {"matches": self.get_current_round_matches_info()}

    @tournament_error_only
    def update_match(self, winner: User, loser: User) -> dict:
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

            if {winner.id, loser.id} == {match["player1"].id, match["player2"].id}:
                match["winner"] = winner
                match_found = True
                break

        if not match_found:
            raise TournamentError("Match not found or already updated in the current round.")

        if all(match["winner"] is not None for match in current_round):
            winners = [match["winner"] for match in current_round]
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

    @tournament_error_only
    def get_current_round_matches(self) -> list:
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

    @tournament_error_only
    def get_current_match(self):
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        if self.current_round_index < 0 or self.current_round_index >= len(self.rounds):
            return None

        for match in self.rounds[self.current_round_index]:
            if match["player2"] is not None and match["winner"] is None:
                return (match["player1"], match["player2"])
        return None

    @tournament_error_only
    def get_current_round_matches_info(self) -> list:
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

    @tournament_error_only
    def cancel_tournament(self) -> None:
        self.init = 0
        self.game = None
        self.players.clear()
        self.rounds.clear()
        self.current_round_index = -1
        self.started = False

g_tournament = Tournament()

# Example usage:
# g_tournament.declare_game("tetris")
# user1 = User.objects.get(pk=1)
# user2 = User.objects.get(pk=2)
# g_tournament.add_player(user1)
# g_tournament.add_player(user2)
# tournament_data = g_tournament.start_tournament()
