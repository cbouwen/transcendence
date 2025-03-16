async function pingTournament(gameID) {
  while (tetrisActive) {
    // Perform your action here
    console.log("Action performed at", new Date().toLocaleTimeString());

    // Instead of waiting 30 seconds at once, break it into 30 one-second intervals
    for (let i = 0; i < 300; i++) {
      // Check if we should stop
      if (tournamentActive == false) {
        console.log("tetrisActive is false. Exiting loop.");
		payload = {
			game_id : gameID,
		}
		response = await apiRequest('/tournament/ping', 'PATCH', JWTs, payload);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

async function tournament_get_next_match(data) {
    console.log("setting up next game", data);

    let player1, player2, gameid;
    if (data.Message && typeof data.Message === 'object') {
        player1 = data.Message.player1;
        player2 = data.Message.player2;
        gameid = data.Message.gameid;
		game_name = data.Message.game_name;
        console.log("Player 1:", player1);
        console.log("Player 2:", player2);
        console.log("Game ID:", gameid);
    } else {
        console.log("Unexpected message format", data);
        return;
    }
    
    let dominant = await apiRequest("/me", "GET", JWTs, null);
    console.log(dominant);
    let token1, token2;
    
    if (dominant.username !== player1) {
        const response = await awaitingPupperResponse(player1);
        console.log(response);
        if (!response) {
            console.log(getRandomSillyString());
            return;
        }
        token1 = response.value;
    } else {
        token1 = JWTs;
    }
    
    if (dominant.username !== player2) {
        const response = await awaitingPupperResponse(player2);
        console.log(response);
        if (!response) {
            return;
        }
        token2 = response.value;
    } else {
        token2 = JWTs;
    }
    
    console.log("Tokens:", token1, token2);
    data = await apiRequest("/tournament/get_game", "GET", JWTs, null);

	tournamentActive = true;
	pingTournament(gameid);
    if (game_name === "tetris") {
        await launchCustomTetrisGameTwoPlayer([token1, token2], true, false, gameid);
    } else if (game_name === "pong") {
        console.log("here is where you launch the pong game"); //TODO: Cedric
    }
}

async function sendTournamentResults(gameid, winnerToken, loserToken) {
    const payloadWinner = {
		status: "winner",
        gameid: gameid,
        packetnumber: 1,
        packetamount: 2,
    };

    const payloadLoser = {
		status: "loser",
        gameid: gameid,
        packetnumber: 2,
        packetamount: 2,
    };

    try {
        const responseWinner = await apiRequest('/tournament/update_match', 'POST',
			winnerToken, payloadWinner);
        if (responseWinner.error) {
            console.error("Error updating tournament for winner:", responseWinner.error);
        } else {
            console.log("Tournament match updated successfully for winner:", responseWinner);
        }

        const responseLoser = await apiRequest('/tournament/update_match', 'POST',
			loserToken, payloadLoser);
        if (responseLoser.error) {
            console.error("Error updating tournament for loser:", responseLoser.error);
        } else {
            console.log("Tournament match updated successfully for loser:", responseLoser);
        }
    } catch (error) {
        console.error("Exception when sending tournament results:", error);
    }
}
