import React, { useEffect, useState } from "react";
import axios from "axios";
import { BrowserRouter as Router} from "react-router-dom";

const BACKEND_URL = "http://localhost:8000";

function App() {
  const [player, setPlayer] = useState(null);
  const [message, setMessage] = useState("");

  // Fetch logged-in player details
  const fetchPlayerDetails = async () => {
    try {
      const response = await axios.get("/api/current-user/"); // Django endpoint
      const playerData = {
        name: response.data.username,
        matchmaking_rating: response.data.matchmaking_rating || 1000,
      };
      setPlayer(playerData);
      return playerData;
    } catch (error) {
      console.error("Error fetching player details:", error);
      setMessage("Failed to fetch player details.");
      return null;
    }
  };

  // Add player to active player manager
  const addPlayer = async (playerData) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/players/`, playerData);
      setMessage(response.data.message);
    } catch (error) {
      console.error("Error adding player:", error);
      setMessage("Failed to add player.");
    }
  };

  // Clear all players in the active player manager
  const clearAllPlayers = async () => {
    try {
      await axios.post(`${BACKEND_URL}/players/refresh_histories`);
      setMessage("All players cleared successfully.");
    } catch (error) {
      console.error("Error clearing players:", error);
      setMessage("Failed to clear players.");
    }
  };

  // On component mount, fetch player details and add to manager
  useEffect(() => {
    const handlePlayerLogin = async () => {
      const playerData = await fetchPlayerDetails();
      if (playerData) {
        await addPlayer(playerData);
      }
    };

    handlePlayerLogin();

    // On page unload, clear all players
    return () => {
      clearAllPlayers();
    };
  }, []);

  return (
    <Router>
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
        <h1>Active Player Manager</h1>
        {message && <p>{message}</p>}
        {player ? (
          <div>
            <h2>Welcome, {player.name}!</h2>
            <p>Your Matchmaking Rating: {player.matchmaking_rating}</p>
          </div>
        ) : (
          <p>Loading player information...</p>
        )}
      </div>
    </Router>
  );
}

// This file is the SPA entry point. It provides:
// 1. A simple player configuration form.
// 2. Detection of keyboard layout (azerty vs. qwerty).
// 3. Initialization of the tetris_multiplayer game.

document.addEventListener("DOMContentLoaded", () => {
  const playersDiv = document.getElementById("players");
  const addPlayerButton = document.getElementById("addPlayer");
  const playerForm = document.getElementById("playerForm");

  // A simple default control mapping for qwerty.
  const defaultControls = {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    down: 'ArrowDown',
    rotate: 'ArrowUp'
  };

  // Alternative control mapping for AZERTY.
  const azertyControls = {
    left: 'q',       // On AZERTY, Q is in the position of A on QWERTY keyboards.
    right: 'd',
    down: 's',
    rotate: 'z'      // Z is often used for rotate on an AZERTY layout.
  };

  // Detect keyboard layout based on navigator.language.
  // (This is just a heuristic; in a robust solution, you might detect differently or let the user choose.)
  function detectKeyboardLayout() {
    // If the browser language is French then assume AZERTY.
    if (navigator.language && navigator.language.startsWith("fr")) {
      return "azerty";
    }
    return "qwerty";
  }

  const currentLayout = detectKeyboardLayout();
  console.log("Detected keyboard layout:", currentLayout);

  // Return the default controls based on the detected layout.
  function getDefaultControls() {
    return currentLayout === "azerty" ? azertyControls : defaultControls;
  }

  // Function to add a new player config input block.
  let playerCount = 0;
  function addPlayerInput(name = "", controls = getDefaultControls()) {
    playerCount++;
    const playerDiv = document.createElement("div");
    playerDiv.className = "player-config";
    playerDiv.dataset.playerId = playerCount;
    playerDiv.innerHTML = `
      <h3>Player ${playerCount}</h3>
      <label>
        Name:
        <input type="text" name="playerName" value="${name || `Player ${playerCount}`}" required>
      </label>
      <fieldset>
        <legend>Controls</legend>
        <label>
          Left:
          <input type="text" name="leftKey" value="${controls.left}" required>
        </label>
        <label>
          Right:
          <input type="text" name="rightKey" value="${controls.right}" required>
        </label>
        <label>
          Down:
          <input type="text" name="downKey" value="${controls.down}" required>
        </label>
        <label>
          Rotate:
          <input type="text" name="rotateKey" value="${controls.rotate}" required>
        </label>
      </fieldset>
      <hr>
    `;
    playersDiv.appendChild(playerDiv);
  }

  // Initially add one player configuration.
  addPlayerInput();

  addPlayerButton.addEventListener("click", () => {
    addPlayerInput();
  });

  // On form submit, build the configuration and launch the game.
  playerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    // Gather configurations from all player-config divs.
    const playerConfigs = [];
    document.querySelectorAll(".player-config").forEach(div => {
      const name = div.querySelector("input[name='playerName']").value;
      const controls = {
        left: div.querySelector("input[name='leftKey']").value,
        right: div.querySelector("input[name='rightKey']").value,
        down: div.querySelector("input[name='downKey']").value,
        rotate: div.querySelector("input[name='rotateKey']").value
      };

      playerConfigs.push({ name, controls });
    });

    // Hide the config form and show the game container.
    document.getElementById("configForm").style.display = "none";
    document.getElementById("gameContainer").style.display = "block";

    // Pass the player configurations to the multiplayer Tetris game.
    launchTetrisGame(playerConfigs);
  });
});

/**
 * A stub function representing the multiplayer Tetris game initialization.
 * In your actual application, this function should be defined in your tetris_multiplayer.js.
 */
function launchTetrisGame(playerConfigs) {
  console.log("Launching Tetris Game with configuration:");
  console.log(playerConfigs);

  // Here you would initialize your game. For example:
  // const canvas = document.getElementById('tetrisCanvas');
  // const game = new TetrisGame(canvas, playerConfigs);
  // game.start();

  // For demo purposes, we simply display a message.
  const canvas = document.getElementById('tetrisCanvas');
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = "16px sans-serif";
  context.fillText("Game started with " + playerConfigs.length + " player(s).", 10, 30);
}

export default App;
