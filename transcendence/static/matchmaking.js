async function addPlayer(jwtToken) {
    const jwtTokens = { access: jwtToken };
    // Ensure that 'body' is defined or passed as needed.
    const response = await apiRequest('/tetris/add-player', 'POST', jwtTokens, body);
    if (response.status < 200 || response.status >= 300) {
        console.error('Error adding player');
        return;
    }
    console.log('Player added:', response.message);
}

async function awaitingPupperResponse(player2) {
    let counter = 0;
    while (true) {
        const txt = "awaiting response from puppeteering from " + player2;
        if (confirm(txt)) {
            const payload = {
                username: player2,
            };
            const response = await apiRequest('/token/puppet', 'POST', JWTs, payload);
            if (!response || response.status === "failed") {
                counter++;
                if (counter === 5) return;
                console.log("printing status", response.status);
                continue;
            } else if (response.status === "succes") {
                console.log("printing puppet token request response ", response);
                return response;
            }
        } else {
            return;
        }
    }
}

async function searching_for_game_match(gameName) {
	if (gameName != "tetris" && gameName != "pong")
	{
		console.error("wrong game name sent to function searching for game");
		return ;
	}
    const response = await apiRequest('/tetris/next-match', 'GET', JWTs, null);
	if (!response)
		return ;

    console.log(response);
    if (response) {
        console.log(response.player2);
        console.log(response.player1);
    }

    if (!response || !response.player1?.trim() || !response.player2?.trim()) 
        return; // Handles undefined, null, or empty strings safely

    const puppetToken = await awaitingPupperResponse(response.player2);
    console.log("PRINTING PUPPET TOKEN", puppetToken);
    if (puppetToken && puppetToken.status == 401) return;
    console.log(await apiRequest("/me", "GET", puppetToken.value, null));
    console.log("LAUNCHING TETRIS GAME ", JWTs, puppetToken.value);
	if (gameName == "tetris") {
    	await launchCustomTetrisGameTwoPlayer([JWTs, puppetToken.value], false, true);
	} else if (gameName == "pong") {
		console.log("here is were you launch the pong game");
	}
	console.log(puppetToken);
}
