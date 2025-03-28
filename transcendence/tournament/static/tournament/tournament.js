let activePlayersList;
let roundData = {};

async function updateGameName(gameName) {
	try {
		if (gameName != "tetris" && gameName != "pong") {
			console.error("invalid game name");
			return;
		}
		if (ontournamentpage === false) return;

		// Get the element where the game name should be displayed
		const gameNameContainer = document.getElementById('screen4-content');
		gameNameContainer.innerHTML = '';
		if (!gameNameContainer) {
			console.error("Element with id 'screen4-content' not found.");
			return;
		}

		const ul = document.createElement('ul');
		ul.id = 'infoList'
		ul.className = 'list-group';

		const li = document.createElement('li');
		li.id = 'listItemTetris';
		li.className = 'list-group-item';
		li.textContent = gameName;
		ul.appendChild(li);

		gameNameContainer.appendChild(ul);
	} catch (error) {
		console.error('Error updating game name:', error);
	}
}

async function updateCurrentRound() {
	try {
		// Make sure the user is on the tournament page if needed (like your previous check)
		if (ontournamentpage === false) return;

		// Call the tournament round API endpoint
		const response = await apiRequest('/tournament/get_round', 'GET', JWTs, null);
		if (!response) return;

		// Expecting a JSON response with a "matches" key holding an array of match strings
		const roundMatches = response.matches;
		console.log("Current round matches =", roundMatches);

		// Find the container for current round info
		const roundContainer = document.getElementById('screen3-content');
		if (!roundContainer) {
			console.error("Element with id 'screen3-content' not found on the page.");
			return;
		}

		// Clear previous content
		roundContainer.innerHTML = '';

		if (roundMatches && roundMatches.length > 0) {
			// Optionally, create an unordered list to hold the match strings
			const ul = document.createElement('ul');
			ul.id = 'infoList'
			ul.className = 'list-group';

			roundMatches.forEach(matchStr => {
				const li = document.createElement('li');
				li.id = 'listItemTetris';
				li.className = 'list-group-item';
				li.textContent = matchStr;
				ul.appendChild(li);
			});

			roundContainer.appendChild(ul);
		} else {
			const ul = document.createElement('ul');
			ul.id = 'infoList'
			ul.className = 'list-group';

			const li = document.createElement('li');
			li.id = 'listItemTetris';
			li.className = 'list-group-item';
			li.textContent = 'No matches for the current round.';
			ul.appendChild(li);

			roundContainer.appendChild(ul);
		}
	} catch (error) {
		console.error('Error fetching current round matches:', error);
	}
}

window.addEventListener('DOMContentLoaded', () => {
	setInterval(updateCurrentRound, 5000);
});

async function updateTournamentPlayers() {
	try {
		if (ontournamentpage == false) return;
		const response = await apiRequest('/tournament/get_participants', 'GET', JWTs, null);
		if (!response) return;

		const tournamentUsers = response.tournament_users;
		console.log("tournament users =", tournamentUsers);
		if (!tournamentUsers) {
			console.error("No tournament_users key found in the API response.");
			return;
		}
		activePlayersList = document.getElementById('screen2-content');
		if (!activePlayersList) {
			console.error("Element with id 'screen2-content' not found on the page.");
			return;
		}
		activePlayersList.innerHTML = '';

		const ul = document.createElement('ul');
		ul.id = 'infoList'
		ul.className = 'list-group';

		tournamentUsers.forEach(username => {
			const li = document.createElement('li');
			li.id = 'listItemTetris';
			li.className = 'list-group-item';
			li.textContent = username;
			ul.appendChild(li);
		});

		activePlayersList.appendChild(ul);
	} catch (error) {
		console.error('Error fetching tournament users:', error);
	}
}

window.addEventListener('DOMContentLoaded', () => {
	setInterval(updateTournamentPlayers, 5000);
});

function clearElement(element) {
	while (element.firstChild) {
		element.removeChild(element.firstChild);
	}
}

function clearObject(obj) {
	Object.keys(obj).forEach(key => delete obj[key]);
}

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
					game_id: gameID,
				}
				response = await apiRequest('/tournament/ping', 'PATCH', JWTs, payload);
				if (!response) return;
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}
	}
}

async function tournament_get_next_match(data) {
	console.log("setting up next game", data);

	let player1, player2, gameid, game_name;
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
	if (player1 === undefined || player2 === undefined || gameid === undefined) {
		return;
	}

	let dominant = await apiRequest("/me", "GET", JWTs, null);
	if (!dominant) return;
	let token1, token2;

	if (dominant.username !== player1) {
		const response = await awaitingPupperResponse(player1);
		console.log(response);
		if (!response) {
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
	if (!data) return;

	ontournamentpage = false;
	tournamentActive = true;

	const screen2 = document.getElementById("screen2-content");
	const screen3 = document.getElementById("screen3-content");
	const screen4 = document.getElementById("screen4-content");

	if (screen2) screen2.style.display = "none";
	if (screen3) screen3.style.display = "none";
	if (screen4) screen4.style.display = "none";

	pingTournament(gameid);
	if (game_name === "tetris") {
		await launchCustomTetrisGameTwoPlayer([token1, token2], true, false, gameid);
		if (screen2) screen2.style.display = "block";
		if (screen3) screen3.style.display = "block";
		if (screen4) screen4.style.display = "block";
	} else if (game_name === "pong") {
		console.log("here is where you launch the pong game"); //TODO: Cedric
	}
	ontournamentpage = true;
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
		if (!responseWinner) return;
		if (responseWinner.error) {
			console.error("Error updating tournament for winner:", responseWinner.error);
		} else {
			console.log("Tournament match updated successfully for winner:", responseWinner);
		}

		const responseLoser = await apiRequest('/tournament/update_match', 'POST', loserToken, payloadLoser);
		if (!responseLoser) return;
		if (responseLoser.error) {
			console.error("Error updating tournament for loser:", responseLoser.error);
		} else {
			console.log("Tournament match updated successfully for loser:", responseLoser);
		}
	} catch (error) {
		console.error("Exception when sending tournament results:", error);
	}
}
