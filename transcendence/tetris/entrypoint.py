import sys
import random
import locale
from collections import defaultdict
from typing import Optional, Tuple
from .active_player_manager import active_player_manager

class SimplePlayer:
    def __init__(self, name, matchmaking_rating=1500):
        self.name = name
        self.matchmaking_rating = matchmaking_rating

    def __repr__(self):
        return f"<SimplePlayer {self.name} (MMR: {self.matchmaking_rating})>"

def detect_keyboard_layout() -> str:
    """
    Detects the keyboard layout based on the system locale.
    If the default locale language starts with "fr", we assume AZERTY.
    Otherwise, we default to QWERTY.
    """
    lang, _ = locale.getdefaultlocale()
    if lang and lang.startswith('fr'):
        return 'azerty'
    return 'qwerty'

def get_key_bindings(layout: str, player_number: int, total_players: int) -> dict:
    """
    Returns a key mapping for a given player number and total number of players.
    
    - Player 1 always uses the arrow keys.
    - For 2 players: Player 2 uses:
        • QWERTY: a (left), d (right), s (down), w (rotate)
        • AZERTY: q (left), d (right), s (down), z (rotate)
    - For 3 players:
        • Player 1: Arrow keys
        • Player 2: j (left), l (right), k (down), i (rotate)
        • Player 3: same as Player 2 in the two‑player config (wasd vs. zqsd)
    """
    if player_number == 1:
        return {
            "left": "ArrowLeft",
            "right": "ArrowRight",
            "down": "ArrowDown",
            "rotate": "ArrowUp"
        }

    if total_players == 2:
        if layout == "azerty":
            return {
                "left": "q",
                "right": "d",
                "down": "s",
                "rotate": "z"
            }
        else:
            return {
                "left": "a",
                "right": "d",
                "down": "s",
                "rotate": "w"
            }

    if total_players == 3:
        if player_number == 2:
            return {
                "left": "j",
                "right": "l",
                "down": "k",
                "rotate": "i"
            }
        elif player_number == 3:
            if layout == "azerty":
                return {
                    "left": "q",
                    "right": "d",
                    "down": "s",
                    "rotate": "z"
                }
            else:
                return {
                    "left": "a",
                    "right": "d",
                    "down": "s",
                    "rotate": "w"
                }
    # Fallback empty mapping
    return {}

# -------------------------------
# Tetris Game Launch Placeholder
# -------------------------------
def launch_tetris_game(player_configs: list):
    """
    Placeholder function that represents launching the Tetris game.
    In your full implementation the actual game (visual UI etc.) would be started here.
    """
    print("Launching Tetris game with the following player configurations:")
    for config in player_configs:
        print(f"  Player: {config['name']}, Controls: {config['controls']}")
    # Here you would integrate with your actual Tetris game launcher.

# -------------------------------
# Entry Point (No Visual/UI)
# -------------------------------
def entry_point(player_names: list):
    """
    Headless entry point that:
      - Checks that there are 1–3 players.
      - Detects the keyboard layout.
      - Builds player configurations (name and controls).
      - Adds players to the ActivePlayerManager.
      - Launches the Tetris game with these configurations.
    """
    if not (1 <= len(player_names) <= 3):
        raise ValueError("Number of players must be between 1 and 3.")

    layout = detect_keyboard_layout()
    players = []
    player_configs = []
    
    for i, name in enumerate(player_names):
        player_number = i + 1
        # Create a simple player object.
        player = SimplePlayer(name)
        players.append(player)
        # Add the player to the active player manager.
        active_player_manager.add_player(player)
        # Get the proper key bindings for this player.
        controls = get_key_bindings(layout, player_number, len(player_names))
        player_configs.append({
            "name": name,
            "controls": controls
        })

    # (Optional) For two players, you might want to report a match-up:
    if len(player_names) == 2:
        match = (players[0].name, players[1].name)
        print(f"Match found between: {match[0]} and {match[1]}")
    elif len(player_names) == 3:
        print("Three-player game initiated.")

    # Now launch the Tetris game with the prepared configurations.
    launch_tetris_game(player_configs)

# -------------------------------
# Main: Run the Entry Point
# -------------------------------
if __name__ == '__main__':
    # This entry point is headless: it expects player names as command-line arguments.
    # Usage examples:
    #   python tetris_entrypoint.py Alice
    #   python tetris_entrypoint.py Alice Bob
    #   python tetris_entrypoint.py Alice Bob Charlie
    if len(sys.argv) < 2:
        print("Usage: python tetris_entrypoint.py <player1> [<player2> <player3>]")
    else:
        # Exclude the script name from arguments.
        entry_point(sys.argv[1:])
