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
