<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Multi-Player Tetris</title>
  <!-- Load the Tetris game script -->
  <script src="tetris_multiplayer.js" defer></script>
  <style>
    /* Some basic styling */
    body {
      font-family: sans-serif;
      text-align: center;
      margin-top: 50px;
    }
    #error {
      color: red;
    }
  </style>
</head>
<body>
  <!-- Start Screen / Entry Form -->
  <div id="start-screen">
    <h1>Multi-Player Tetris</h1>
    <form id="playerForm">
      <label for="playerNames">
        Enter player names (comma separated; maximum 3):
      </label>
      <br>
      <input type="text" id="playerNames" placeholder="Alice, Bob, Charlie" />
      <br><br>
      <button type="submit">Start Game</button>
      <p id="error"></p>
    </form>
  </div>

  <!-- Container where the Tetris game will appear -->
  <div id="game-container" style="display: none;">
    <!-- Your game UI (canvas, etc.) will be rendered by tetris_multiplayer.js -->
  </div>

  <script>
    /**
     * Detects the keyboard layout.
     * In this example we use navigator.language as a heuristic:
     * If the language starts with "fr" (e.g. "fr-FR"), we assume an AZERTY layout.
     * Otherwise we default to QWERTY.
     */
    function detectKeyboardLayout() {
      if (navigator.language && navigator.language.startsWith('fr')) {
        return 'azerty';
      }
      return 'qwerty';
    }

    /**
     * Returns a key mapping (controls object) for a given player number.
     *
     * For our purposes:
     * - Player 1 always gets the arrow keys.
     * - If there are 2 players, Player 2 gets:
     *     • QWERTY: a (left), d (right), s (down), w (rotate)
     *     • AZERTY: q (left), d (right), s (down), z (rotate)
     *
     * - If there are 3 players, we assign:
     *     • Player 1: Arrow keys
     *     • Player 2: j (left), l (right), k (down), i (rotate)
     *     • Player 3: as above for Player 2 in two-player mode (wasd vs. zqsd)
     */
    function getKeyBindings(layout, playerNumber, totalPlayers) {
      // Player 1 always uses the arrow keys
      if (playerNumber === 1) {
        return {
          left: 'ArrowLeft',
          right: 'ArrowRight',
          down: 'ArrowDown',
          rotate: 'ArrowUp'
        };
      }

      // If there are only two players, the only remaining configuration is:
      if (totalPlayers === 2) {
        if (layout === 'azerty') {
          return {
            left: 'q',
            right: 'd',
            down: 's',
            rotate: 'z'
          };
        } else { // qwerty
          return {
            left: 'a',
            right: 'd',
            down: 's',
            rotate: 'w'
          };
        }
      }

      // For three players:
      if (totalPlayers === 3) {
        // Player 2: assign the j, i, k, l cluster.
        if (playerNumber === 2) {
          return {
            left: 'j',
            right: 'l',
            down: 'k',
            rotate: 'i'
          };
        }
        // Player 3: use the wasd/zqsd cluster.
        if (playerNumber === 3) {
          if (layout === 'azerty') {
            return {
              left: 'q',
              right: 'd',
              down: 's',
              rotate: 'z'
            };
          } else {
            return {
              left: 'a',
              right: 'd',
              down: 's',
              rotate: 'w'
            };
          }
        }
      }
    }

    // Wait until the DOM content is loaded.
    document.addEventListener('DOMContentLoaded', () => {
      const form = document.getElementById('playerForm');
      const errorEl = document.getElementById('error');

      form.addEventListener('submit', function(event) {
        event.preventDefault();
        errorEl.textContent = '';

        // Retrieve and parse the player names from the input field.
        const input = document.getElementById('playerNames').value;
        const names = input
          .split(',')
          .map(name => name.trim())
          .filter(name => name.length > 0);

        if (names.length === 0) {
          errorEl.textContent = 'Please enter at least one name.';
          return;
        }
        if (names.length > 3) {
          errorEl.textContent = 'A maximum of 3 players is allowed.';
          return;
        }

        // Determine the keyboard layout.
        const layout = detectKeyboardLayout();

        // Build the player configurations.
        const playerConfigs = names.map((name, index) => {
          const playerNumber = index + 1;
          const controls = getKeyBindings(layout, playerNumber, names.length);
          return {
            name: name,
            controls: controls
          };
        });

        // Hide the entry form and show the game container.
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';

        // Launch the Tetris game with the player configurations.
        launchTetrisGame(playerConfigs);
      });
    });
  </script>
</body>
</html>
