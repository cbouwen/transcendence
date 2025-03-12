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
            raise
        except Exception as e:
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
        # Now, only two tournament types are supported: "single" (2 players) and "double_elimination" (4 or 8 players)
        self.tournament_type = None  
        self.losers = []             # For double elimination (loser bracket)
        self.champion = None         # Store the winning User if tournament is over

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
        # Allow only 2, 4, or 8 players.
        if len(self.players) not in (2, 4, 8):
            raise TournamentError("Tournament must have 2, 4, or 8 players.")
        
        # Set tournament type.
        if len(self.players) == 2:
            self.tournament_type = "single"
        else:
            self.tournament_type = "double_elimination"

        self.started = True
        random.shuffle(self.players)
        round_info = self.generate_round(self.players)
        return {"players": [user.username for user in self.players], "round": round_info}

    @tournament_error_only
    def generate_round(self, users_list: list) -> dict:
        """Generates the next round of matches for elimination tournaments."""
        if self.init == 0 or not self.started:
            raise TournamentError("Tournament not setup with a game")
        
        round_matches = []
        if self.tournament_type == "single":
            # For 2 players, create a single match.
            round_matches.append({
                "player1": users_list[0],
                "player2": users_list[1],
                "winner": None,
                "loser": None,
                "gameid": None
            })
        elif self.tournament_type == "double_elimination":
            # For 4 or 8 players, pair them up; assign a bye if odd.
            i = 0
            while i < len(users_list):
                if i + 1 < len(users_list):
                    round_matches.append({
                        "player1": users_list[i],
                        "player2": users_list[i+1],
                        "winner": None,
                        "loser": None,
                        "gameid": None
                    })
                    i += 2
                else:
                    # Odd number: assign a bye.
                    round_matches.append({
                        "player1": users_list[i],
                        "player2": None,
                        "winner": users_list[i],
                        "loser": None,
                        "gameid": None
                    })
                    i += 1
        else:
            raise TournamentError("Unknown tournament type.")

        self.rounds.append(round_matches)
        self.current_round_index = len(self.rounds) - 1
        return {"matches": self.get_current_round_matches_info()}

    @tournament_error_only
    def update_match(self, winner: User, loser: User, gameid: str) -> dict:
        """
        Expects:
            winner: User, loser: User, gameid: str
        Updates the match with the provided game id.
        """
        if self.tournament_type not in ("single", "double_elimination"):
            raise TournamentError("This update_match method only supports elimination style tournaments.")

        current_round = self.rounds[self.current_round_index]
        match_found = False
        for match in current_round:
            # Skip bye matches or matches already updated.
            if match.get("player2") is None or match["winner"] is not None:
                continue
            if {winner.id, loser.id} == {match["player1"].id, match["player2"].id}:
                match["winner"] = winner
                match["loser"] = loser
                match["gameid"] = gameid
                match_found = True
                if self.tournament_type == "double_elimination":
                    self.losers.append(loser)
                break

        if not match_found:
            raise TournamentError("Match not found or already updated in the current round.")

        # If the current round is complete, advance the tournament.
        if all(match["winner"] is not None for match in current_round):
            winners = [match["winner"] for match in current_round]
            if self.tournament_type == "single":
                self.started = False
                self.champion = winners[0]
                return {"champion": winners[0].username}
            elif self.tournament_type == "double_elimination":
                if len(winners) == 1 and len(self.losers) == 0:
                    self.started = False
                    self.champion = winners[0]
                    return {"champion": winners[0].username}
                else:
                    round_info = self.generate_round(winners)
                    return {
                        "message": "Winners round complete. Advancing winners to the next round.",
                        "round": round_info
                    }
        return {
            "message": f"Match result updated: '{winner.username}' defeated '{loser.username}' in game {gameid}.",
            "round": self.get_current_round_matches_info()
        }

    @tournament_error_only
    def get_current_round_matches(self) -> list:
        """Returns a list of human-readable match strings for the current round."""
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        if self.current_round_index < 0 or self.current_round_index >= len(self.rounds):
            return []
        
        round_bracket = []
        for match in self.rounds[self.current_round_index]:
            if match.get("player2") is None:
                match_str = f"{match['player1'].username} gets a bye (auto-advances)."
            else:
                match_str = f"{match['player1'].username} vs {match['player2'].username}"
                if match["winner"]:
                    match_str += f" -> Winner: {match['winner'].username} (Game ID: {match.get('gameid')})"
            round_bracket.append(match_str)
        return round_bracket

    @tournament_error_only
    def get_current_round_matches_info(self) -> list:
        """
        Returns detailed info on the matches in the current round.
        Each match dict now includes player names, winner (if determined), and the gameid.
        """
        if self.current_round_index < 0 or self.current_round_index >= len(self.rounds):
            return []
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")

        matches_info = []
        current_round = self.rounds[self.current_round_index]
        for match in current_round:
            info = {
                "player1": match["player1"].username,
                "player2": match["player2"].username if match["player2"] else None,
                "winner": match["winner"].username if match["winner"] and hasattr(match["winner"], "username") else None,
                "gameid": match.get("gameid")
            }
            matches_info.append(info)
        return matches_info

    @tournament_error_only
    def get_current_match(self):
        if self.init == 0:
            raise TournamentError("Tournament not setup with a game")
        
        # If the tournament is over, return the champion info.
        if not self.started:
            if self.rounds:
                last_round = self.rounds[-1]
                if len(last_round) == 1 and last_round[0].get("winner"):
                    return {"champion": last_round[0]["winner"].username}
            return {"champion": None, "message": "Tournament over, but champion not determined."}
        
        # Tournament is still in progress; return the next pending match.
        for match in self.rounds[self.current_round_index]:
            if match.get("player2") is not None and match["winner"] is None:
                return (match["player1"].username, match["player2"].username)
        return None

    @tournament_error_only
    def cancel_tournament(self) -> None:
        self.init = 0
        self.game = None
        self.players.clear()
        self.rounds.clear()
        self.current_round_index = -1
        self.started = False
        self.tournament_type = None
        self.losers.clear()

g_tournament = Tournament()
