async function tournament_get_next_match(data) {
    console.log("setting up next game", data);
    
    // Declare player1 and player2 outside the conditional block
    let player1, player2;
    if (data.Message && data.Message.length >= 2) {
        player1 = data.Message[0];
        player2 = data.Message[1];
        console.log("Player 1:", player1);
        console.log("Player 2:", player2);
    } else {
        console.log("is it the winner of the tournament?", data);
        // You might want to handle this case, for example:
        return; // or assign default values
    }
    
    // Declare variables with let
    let dominant = await apiRequest("/me", "GET", JWTs, null);
	console.log(dominant);
    let token1 = undefined;
    let token2 = undefined;
    
    if (dominant.username != player1) {
        const response = await awaitingPupperResponse(player1);
		console.log(response);
		if (!response)
		{
			console.log(getRandomSillyString());
			return ;
		}
		token1 = response.value;

    } else {
        token1 = JWTs;
    }
    
    if (dominant.username != player2) {
        const response = await awaitingPupperResponse(player2);
		console.log(response);
		if (!response)
		{
			return ;
		}
		token2 = response.value;
    } else {
        token2 = JWTs;
    }
    
    console.log("Tokens:", token1, token2);
	data = await apiRequest("/tournament/get_game", "GET", JWTs, null);
	if (data.game_name == "tetris") {
    	await launchCustomTetrisGameTwoPlayer([token1, token2], true, false);
	} else if (data.game_name == "pong") {
		console.log("here is were you launch the pong game");
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
        const responseWinner = await apiRequest('/tournament/update_match', 'POST', winnerToken, payloadWinner);
        if (responseWinner.error) {
            console.error("Error updating tournament for winner:", responseWinner.error);
        } else {
            console.log("Tournament match updated successfully for winner:", responseWinner);
        }

        const responseLoser = await apiRequest('/tournament/update_match', 'POST', loserToken, payloadLoser);
        if (responseLoser.error) {
            console.error("Error updating tournament for loser:", responseLoser.error);
        } else {
            console.log("Tournament match updated successfully for loser:", responseLoser);
        }
    } catch (error) {
        console.error("Exception when sending tournament results:", error);
    }
}
