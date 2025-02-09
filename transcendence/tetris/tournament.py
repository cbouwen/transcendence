import random

class Tournament:
    def __init__(self, game_id: int):
        """
        Initialize the tournament with a game id.
        For example: 1 for pong, 2 for tetris.
        """
        self.game_id = game_id
        self.players = []         # List of registered players (strings)
        self.started = False      # Once True, players cannot be added/removed
        self.rounds = []          # List of rounds. Each round is a list of matches.
        self.current_round_index = -1  # Index for current round (starts at 0 once started)

    def add_player(self, player_name: str):
        """
        Add a player by name to the tournament. 
        Only allowed before the tournament starts.
        """
        if self.started:
            print("Tournament already started – cannot add new players.")
            return
        if player_name in self.players:
            print(f"Player '{player_name}' is already registered.")
            return
        self.players.append(player_name)
        print(f"Player '{player_name}' added.")

    def start_tournament(self):
        """
        Starts the tournament by shuffling players and creating the first round bracket.
        """
        if self.started:
            print("Tournament already started.")
            return
        if len(self.players) < 2:
            print("Not enough players to start a tournament (need at least 2).")
            return

        self.started = True
        # Optionally shuffle the players for bracket randomness
        random.shuffle(self.players)
        print("Tournament started!")
        print("Players (shuffled):", self.players)

        # Create the first round with all the registered players.
        self.generate_round(self.players)

    def generate_round(self, players_list):
        """
        Given a list of players, create match pairings for the round.
        If the number of players is odd, the last player gets a bye (auto-advances).
        Each match is represented as a dictionary:
          {"player1": <name>, "player2": <name or None>, "winner": <None or name>}
        """
        round_matches = []
        i = 0
        while i < len(players_list):
            if i + 1 < len(players_list):
                # Regular match: pair two players.
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
        print("\n--- New Round Generated ---")
        self.print_current_round()

        # If only one player remains after byes, the tournament is over.
        if len(players_list) == 1:
            print("\nTournament Champion:", players_list[0])
            self.started = False  # Optionally mark tournament as ended.

    def update_match(self, winner: str, loser: str):
        """
        Update the current round by marking a match result.
        The first parameter (winner) should be the winning player's name,
        and the second (loser) should be the losing player's name.
        After each update, the code checks if the round is complete
        and, if so, generates the next round.
        """
        if not self.started:
            print("Tournament hasn't started yet.")
            return

        current_round = self.rounds[self.current_round_index]
        match_found = False

        # Search for the match in the current round where both players are present.
        for match in current_round:
            # Skip if this match already has a recorded winner.
            if match["winner"] is not None and match["player2"] is not None:
                continue

            # For a normal match, check if the pair (winner, loser) matches (order doesn't matter).
            if match["player2"] is not None:
                players_in_match = {match["player1"], match["player2"]}
                if {winner, loser} == players_in_match:
                    match["winner"] = winner
                    print(f"Match result updated: '{winner}' defeated '{loser}'.")
                    match_found = True
                    break

        if not match_found:
            print("Match not found or already updated in the current round.")
            return

        # Check if the current round is complete.
        if all(match["winner"] is not None for match in current_round):
            # Gather all winners from this round.
            winners = [match["winner"] for match in current_round]
            # If only one winner remains, we have a champion.
            if len(winners) == 1:
                print("\nTournament Champion:", winners[0])
                self.started = False  # Tournament ends.
            else:
                print("\nRound complete. Advancing the following winners to the next round:")
                print(winners)
                self.generate_round(winners)

    def print_current_round(self):
        """
        Print the bracket for the current round.
        """
        print(f"Round {self.current_round_index + 1} Bracket:")
        for match in self.rounds[self.current_round_index]:
            if match["player2"] is None:
                # Bye match – only one player.
                print(f"  {match['player1']} gets a bye (auto-advances).")
            else:
                result = f"  {match['player1']} vs {match['player2']}"
                if match["winner"]:
                    result += f"  -> Winner: {match['winner']}"
                print(result)

    def get_current_round_matches(self):
        """
        Returns the current round bracket as a list of strings, where each string represents
        the two players in a match. For a bye match, it indicates that the player auto-advances.
        """
        # Ensure we have a valid current round
        if self.current_round_index < 0 or self.current_round_index >= len(self.rounds):
            return []
        round_bracket = []
        for match in self.rounds[self.current_round_index]:
            if match["player2"] is None:
                # Bye match – only one player.
                match_str = f"{match['player1']} gets a bye (auto-advances)."
            else:
                match_str = f"{match['player1']} vs {match['player2']}"
                if match["winner"]:
                    match_str += f" -> Winner: {match['winner']}"
            round_bracket.append(match_str)
        return round_bracket
