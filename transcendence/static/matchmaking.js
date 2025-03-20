async function showError(message) {
  return new Promise((resolve) => {
    // Create the overlay container for the error box
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.zIndex = '1000';

    // Create the error box element
    const errorBox = document.createElement('div');
    errorBox.style.backgroundColor = 'white';
    errorBox.style.padding = '20px';
    errorBox.style.border = '2px solid red';
    errorBox.style.borderRadius = '5px';
    errorBox.style.textAlign = 'center';

    // Create the message element and set its text
    const messageEl = document.createElement('p');
    messageEl.textContent = message;

    // Create the OK button
    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.addEventListener('click', () => {
      // Remove the container from the document and resolve the promise
      document.body.removeChild(container);
      resolve();
    });

    // Append message and button to the error box, then the box to the container
    errorBox.appendChild(messageEl);
    errorBox.appendChild(okButton);
    container.appendChild(errorBox);

    // Append the container to the body
    document.body.appendChild(container);
  });
}

async function addPlayer(jwtToken) {
    // Ensure that 'body' is defined or passed as needed.
    const response = await apiRequest('/tetris/add-player', 'POST', jwtToken, body);
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
    console.log("test");
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
        console.log("printing player names");
        console.log(response.player2);
        console.log(response.player1);
    }
    if (!response || !response.player1?.trim() || !response.player2?.trim())
	{
	    console.log("A error happened during matchmaking");
        return;
	}
    console.log("hello world");
    const puppetToken = await awaitingPupperResponse(response.player2);
    if (puppetToken && puppetToken.status == 401 || !puppetToken) return;
    const userInfo = await apiRequest("/me", "GET", puppetToken.value, null);
    if (!userInfo) return;
    console.log("PRINTING PUPPET TOKEN", puppetToken);
    console.log(userInfo);
    console.log("LAUNCHING TETRIS GAME ", JWTs, puppetToken.value);
	if (gameName == "tetris") {
    	await launchCustomTetrisGameTwoPlayer([JWTs, puppetToken.value], false, true);
	} else if (gameName == "pong") {
		const pongGame = new PongGameMatchMaker();
        pongGame.initialize();
	}
	console.log(puppetToken);
}
