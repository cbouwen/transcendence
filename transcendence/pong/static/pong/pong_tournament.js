// Add this at the top of the file, after the variable declarations
// Function that can be called from the router to ensure cleanup when navigating away
function cleanupPongTournament() {
    clearTournamentData();
    
    const pongWrapper = document.getElementById('pong-wrapper');
    if (pongWrapper) {
        pongWrapper.innerHTML = '';
    }
    
    // Clean up any running game
    if (window.currentPongGame) {
        window.currentPongGame.cleanup();
    }
}

async function pongTournamentStart() {
	// Clear any existing tournament data
    clearTournamentData();
    
	// Initialize tournament setup interface
	setupTournamentUI();
    
    // Add the primary (logged in) player automatically
    addPrimaryPlayer();
};

// Tournament players list and bracket
let tournamentPlayers = [];
let currentMatchup = [];
let bracketRound = 0;
let primaryPlayerAdded = false;
let winners = []; // Track winners of each match

// Add global lock to prevent multiple game instances
let gameInstanceLock = false;

// Function to clear tournament data when navigating away
function clearTournamentData() {
    tournamentPlayers = [];
    currentMatchup = [];
    bracketRound = 0;
    primaryPlayerAdded = false;
    winners = [];
    
    // Clear the player list UI if it exists
    const playerList = document.getElementById('player-list');
    if (playerList) {
        playerList.innerHTML = '';
    }
}

// Function to add the primary player (current logged in user)
async function addPrimaryPlayer() {
    if (primaryPlayerAdded) return;
    
    // Get current user info
    const myUser = await apiRequest("/me", "GET", JWTs, undefined);
    if (!myUser) {
        console.log("Failed to get current user info");
        return;
    }
    
    // Make sure we have a proper JWT structure for the primary player
    let primaryJWT = {};
    if (typeof JWTs === 'object') {
        // Copy JWTs to ensure we don't lose it
        if (JWTs.access) {
            primaryJWT.access = JWTs.access;
        } else if (JWTs.value && JWTs.value.access) {
            primaryJWT.access = JWTs.value.access;
        }
    }
    
    console.log("Primary player JWT set:", primaryJWT);
    
    // Add current user to tournament players list
    tournamentPlayers.push({
        username: myUser.username,
        JWT: primaryJWT,
        eliminated: false,
        isPrimary: true // Mark as primary player
    });
    
    // Add to UI
    const playerList = document.getElementById('player-list');
    if (playerList) {
        const playerItem = document.createElement('li');
        playerItem.classList.add('primary-player');
        playerItem.innerHTML = `
            <span>${myUser.username} (You)</span>
            <span class="primary-badge">Primary Player</span>
        `;
        playerList.appendChild(playerItem);
    }
    
    primaryPlayerAdded = true;
}

function setupTournamentUI() {
	const pongWrapper = document.getElementById('pong-wrapper');
	const tournamentSetup = document.getElementById('tournament-setup');
	const addUserBtn = document.getElementById('add-user-btn');
	const usernameInput = document.getElementById('username-input');
	const playerList = document.getElementById('player-list');
	const startTournamentBtn = document.getElementById('start-tournament-btn');

	// Add user button functionality
	addUserBtn.addEventListener('click', () => {
		const username = usernameInput.value.trim();
		if (!username) return;

		// Check if user already exists in the tournament
		if (tournamentPlayers.some(player => player.username === username)) {
			alert('This user is already in the tournament!');
			return;
		}
        
        // Check if this is the primary user trying to be added again
        const primaryPlayer = tournamentPlayers.find(p => p.isPrimary);
        if (primaryPlayer && primaryPlayer.username === username) {
            alert('You are already in the tournament as the primary player!');
            return;
        }

		// Add user to tournament players list (no API calls)
		tournamentPlayers.push({
			username: username,
			JWT: null, // Will be populated when tournament starts
            eliminated: false,
            isPrimary: false
		});

		// Create list item for player
		const playerItem = document.createElement('li');
		playerItem.innerHTML = `
			<span>${username}</span>
			<button class="invite-btn" data-username="${username}">Invite</button>
			<button class="remove-btn" data-username="${username}">Remove</button>
		`;
		playerList.appendChild(playerItem);

		// Clear input
		usernameInput.value = '';
		// Hide start tournament button until all invites are sent
		startTournamentBtn.style.display = 'none';

	});

	// Event delegation for invite and remove buttons
	playerList.addEventListener('click', async (event) => {
		const target = event.target;
		
		// Invite button
		if (target.classList.contains('invite-btn')) {
			const username = target.getAttribute('data-username');
			await sendPongInvite(username);
			target.style.display = 'none'; // Hide the invite button after sending invite
			
			// Check if all invite buttons are hidden
			const inviteButtons = document.querySelectorAll('.invite-btn');
			const allHidden = Array.from(inviteButtons).every(btn => btn.style.display === 'none');
			
			if (allHidden) {
				// Show the start tournament button
				document.getElementById('start-tournament-btn').style.display = '';
			}
		}
		
		// Remove button
		if (target.classList.contains('remove-btn')) {
			const username = target.getAttribute('data-username');
            
            // Prevent removing the primary player
            const playerToRemove = tournamentPlayers.find(p => p.username === username);
            if (playerToRemove && playerToRemove.isPrimary) {
                alert('You cannot remove yourself from the tournament!');
                return;
            }
            
			tournamentPlayers = tournamentPlayers.filter(player => player.username !== username);
			const listItem = target.closest('li');
			listItem.remove();
		}
	});

	// Start tournament button
	startTournamentBtn.addEventListener('click', async () => {
		if (tournamentPlayers.length < 2) {
			alert('Please add at least 2 players to start a tournament');
			return;
		}

		// Get JWT tokens for all other players
		const tokenPromises = tournamentPlayers
            .filter(player => !player.isPrimary) // Skip primary player as they already have JWTs
            .map(async (player) => {
			    const jwt = await getPuppetJWTs(player.username);
			    if (jwt) {
				    player.JWT = jwt;
				    return true;
			    }
			    return false;
		    });

		const results = await Promise.all(tokenPromises);
		
		// Check if all tokens were retrieved successfully
		if (results.includes(false)) {
			alert('Failed to get authentication tokens for all players. Please try again.');
			return;
		}

        // Shuffle the players array for random matchups
        tournamentPlayers = shuffleArray([...tournamentPlayers]);
        
        // Create pong canvas
        createPongCanvas();
        
        // Set up the first round of matches
        setupNextRound();
        
		// Start the tournament
		tournamentSetup.style.display = 'none';
		pongWrapper.style.display = 'block';
		
		// Initialize the game with current matchup
        if (currentMatchup.length === 2) {
		    let pongGame = new PongGameTournament(currentMatchup);
		    await pongGame.initialize();
		    console.log("pong init finished");
        }
	});
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function createPongCanvas() {
    // Clear pong wrapper
    const pongWrapper = document.getElementById('pong-wrapper');
    pongWrapper.innerHTML = '';
    
    // Create game container
    const pongGame = document.createElement('div');
    pongGame.id = 'pong-game';
    
    // Create canvas
    const pongCanvas = document.createElement('canvas');
    pongCanvas.id = 'pong-canvas';
    
    // Add to DOM
    pongGame.appendChild(pongCanvas);
    pongWrapper.appendChild(pongGame);
}

function setupNextRound() {
    // Prevent multiple setups running simultaneously
    if (gameInstanceLock) {
        console.log("Game setup locked, skipping duplicate setup");
        return;
    }
    
    // Count active players
    const activePlayers = tournamentPlayers.filter(p => !p.eliminated);
    console.log('Setting up next round with active players:', activePlayers.map(p => p.username));
    
    // If only one player remains, they're the champion
    if (activePlayers.length === 1) {
        const champion = activePlayers[0];
        console.log(`Tournament champion determined: ${champion.username}`);
        alert(`Tournament completed! ${champion.username} is the champion!`);
        endTournament();
        return;
    }
    
    // Start a new round if needed
    if (currentMatchup.length === 0) {
        console.log(`Setting up matches. Current bracket round: ${bracketRound}`);
        
        // If this is the first round, pair players randomly
        if (bracketRound === 0) {
            bracketRound = 1;
            console.log(`Starting bracket round ${bracketRound}`);
            
            // Shuffle active players for random first round matchups
            const shuffledPlayers = shuffleArray([...activePlayers]);
            
            // Pair players up
            for (let i = 0; i < shuffledPlayers.length; i += 2) {
                if (i + 1 < shuffledPlayers.length) {
                    winners.push({
                        player1: shuffledPlayers[i],
                        player2: shuffledPlayers[i + 1],
                        winner: null
                    });
                } else {
                    // This player gets a "bye" in the first round and goes straight to round 2
                    console.log(`Player ${shuffledPlayers[i].username} gets a bye in round 1`);
                    // Store this player as a "bye" for the next round
                    winners.push({
                        player1: shuffledPlayers[i],
                        player2: null, // No opponent in this round (bye)
                        winner: shuffledPlayers[i] // Auto-advance this player
                    });
                }
            }
            
            // Get the first matchup (only for non-bye matches)
            const firstMatch = winners.find(match => match.player2 !== null);
            if (firstMatch) {
                currentMatchup = [firstMatch.player1, firstMatch.player2];
                console.log(`First round matchup: ${currentMatchup[0].username} vs ${currentMatchup[1].username}`);
            }
        } else {
            // Check if we have first-round matches that haven't been played yet
            const unplayedFirstRoundMatches = winners.filter(match => match.winner === null && match.player2 !== null);
            
            if (unplayedFirstRoundMatches.length > 0) {
                // Play the next unplayed match from the first round
                const nextMatch = unplayedFirstRoundMatches[0];
                currentMatchup = [nextMatch.player1, nextMatch.player2];
                console.log(`Next first round matchup: ${currentMatchup[0].username} vs ${currentMatchup[1].username}`);
            } else {
                // All first-round matches are completed
                bracketRound++;
                console.log(`Starting bracket round ${bracketRound}`);
                
                // Get all winners so far (including "bye" players)
                const roundWinners = winners.filter(match => match.winner !== null).map(match => match.winner);
                console.log(`Round winners: ${roundWinners.map(w => w.username).join(', ')}`);
                
                // If we have exactly 2 winners (common in 3-player tournaments), create the final match
                if (roundWinners.length === 2) {
                    winners.push({
                        player1: roundWinners[0],
                        player2: roundWinners[1],
                        winner: null
                    });
                    
                    currentMatchup = [roundWinners[0], roundWinners[1]];
                    console.log(`Final matchup: ${currentMatchup[0].username} vs ${currentMatchup[1].username}`);
                } else {
                    // Pair winners for the next round
                    for (let i = 0; i < roundWinners.length; i += 2) {
                        if (i + 1 < roundWinners.length) {
                            winners.push({
                                player1: roundWinners[i],
                                player2: roundWinners[i + 1],
                                winner: null
                            });
                        } else if (roundWinners.length % 2 === 1) {
                            // Handle odd number of winners - give last player a bye
                            console.log(`Player ${roundWinners[i].username} gets a bye in round ${bracketRound}`);
                            winners.push({
                                player1: roundWinners[i],
                                player2: null,
                                winner: roundWinners[i]
                            });
                        }
                    }
                    
                    // Get the first matchup of the new round (only for non-bye matches)
                    const newRoundMatches = winners.filter(match => match.winner === null && match.player2 !== null);
                    if (newRoundMatches.length > 0) {
                        const nextMatch = newRoundMatches[0];
                        currentMatchup = [nextMatch.player1, nextMatch.player2];
                        console.log(`Next round matchup: ${currentMatchup[0].username} vs ${currentMatchup[1].username}`);
                    }
                }
            }
        }
    }
    
    // If we have a valid matchup, start the game
    if (currentMatchup.length === 2) {
        console.log(`Starting match between ${currentMatchup[0].username} and ${currentMatchup[1].username}`);
        // Set game instance lock to prevent multiple instances
        gameInstanceLock = true;
        let pongGame = new PongGameTournament(currentMatchup);
        pongGame.initialize();
    } else {
        console.error('No valid matchup was created, ending tournament');
        endTournament();
    }
}

function endTournament() {
    // Reset tournament display
    document.getElementById('pong-wrapper').style.display = 'none';
    document.getElementById('tournament-setup').style.display = 'block';
    
    // Clear tournament data completely
    clearTournamentData();
    
    // Clear the canvas and state
    const pongWrapper = document.getElementById('pong-wrapper');
    if (pongWrapper) {
        pongWrapper.innerHTML = '';
    }
}

async function sendPongInvite(recipient) {
	try {
		const message = "A tournament is starting! Join me in a game of pong!";
		const pongInvite = true;
		
		const response = await apiRequest('/chat/message', 'POST', JWTs, {
			recipient: recipient,
			message: message,
			pongInvite: pongInvite
		});
		
		if (response) {
			alert(`Invitation sent to ${recipient}!`);
		} else {
			alert('Failed to send invitation. Please try again.');
		}
	} catch (error) {
		console.error('Error sending invitation:', error);
		alert('Error sending invitation. Please try again.');
	}
}

async function publishScore(token, my_username, their_username, my_score, their_score) {
    // Ensure we have a valid token string
    if (!token || typeof token !== 'string') {
        console.error('Invalid token provided:', token);
        return;
    }

    let body = {
        "their_username": their_username,
        "my_score": my_score,
        "their_score": their_score
    };
    
    // Create the proper token object format expected by apiRequest
    const tokenObj = {
        access: token
    };
    
    let response = await apiRequest('/pong/score', 'POST', tokenObj, body);
    if (response) {
        console.log("Score published successfully", response);
    } else {
        console.log("Failed to publish score");
    }
}

class PongGameTournament {
	constructor(matchupPlayers) {
		// Check if there's already a game instance
        if (window.currentPongGame) {
            console.log("Game already exists, cleaning up old instance");
            window.currentPongGame.cleanup();
        }
        
		// Create canvas if it doesn't exist
        if (!document.getElementById('pong-canvas')) {
            createPongCanvas();
        }
        
        // Get references to DOM elements
		this.pongCanvas = document.getElementById('pong-canvas');
		this.context = this.pongCanvas.getContext('2d');

		// Set canvas dimensions
		this.pongCanvas.width = 1400;
		this.pongCanvas.height = 1000;
		this.pongCanvas.style.cssText = "display: block; margin: auto; background: black;";
		this.pongCanvas.style.width = (this.pongCanvas.width / 2) + 'px';
		this.pongCanvas.style.height = (this.pongCanvas.height / 2) + 'px';

		this.DIRECTION = {
			IDLE: 0,
			UP: 1,
			DOWN: 2,
			LEFT: 3,
			RIGHT: 4
		};

		this.rounds = [5];
		this.colors = ['#2c3e50'];

		// Default game properties
		this.running = this.over = false;
		this.timer = this.round = 0;
		this.color = '#2c3e50';
        this.scorePublished = false; // Flag to prevent multiple score publications
        this.gameEndInProgress = false; // Flag to prevent multiple game over events

		// Store matchup players
		this.players = matchupPlayers;
        console.log("Current matchup:", this.players[0].username, "vs", this.players[1].username);
		
		this.keyDownHandler = null;
		this.keyUpHandler = null;
		this.animationFrameId = null;

		// Store the game instance globally
		window.currentPongGame = this;
	}

	createBall(incrementedSpeed) {
		return {
			width: 18,
			height: 18,
			x: (this.pongCanvas.width / 2) - 9,
			y: (this.pongCanvas.height / 2) - 9,
			moveX: this.DIRECTION.IDLE,
			moveY: this.DIRECTION.IDLE,
			speed: incrementedSpeed || 10
		};
	}

	createPaddle(side) {
		return {
			width: 18,
			height: 70,
			x: side === 'left' ? 150 : this.pongCanvas.width - 150,
			y: (this.pongCanvas.height / 2) - 35,
			score: 0,
			move: this.DIRECTION.IDLE,
			speed: 10
		};
	}

	draw() {
		// Clear canvas
		this.context.clearRect(0, 0, this.pongCanvas.width, this.pongCanvas.height);

		// Set background
		this.context.fillStyle = this.color;
		this.context.fillRect(0, 0, this.pongCanvas.width, this.pongCanvas.height);

		// Set the fill style to white for paddles and ball
		this.context.fillStyle = '#ffffff';

		// Draw paddles and ball with checks
		if (this.leftPaddle) this.context.fillRect(this.leftPaddle.x, this.leftPaddle.y, this.leftPaddle.width, this.leftPaddle.height);
		if (this.rightPaddle) this.context.fillRect(this.rightPaddle.x, this.rightPaddle.y, this.rightPaddle.width, this.rightPaddle.height);
		if (this.ball && this._turnDelayIsOver()) this.context.fillRect(this.ball.x, this.ball.y, this.ball.width, this.ball.height);

		// Draw the net (Line in the middle)
		this.context.beginPath();
		this.context.setLineDash([7, 15]);
		this.context.moveTo((this.pongCanvas.width / 2), this.pongCanvas.height - 140);
		this.context.lineTo((this.pongCanvas.width / 2), 140);
		this.context.lineWidth = 10;
		this.context.strokeStyle = '#ffffff';
		this.context.stroke();
		// Set the default canvas font and align it to the center
		this.context.font = '100px Courier New';
		this.context.textAlign = 'center';

		// Draw scores and text
		this.context.fillText(
			this.leftPaddle.score.toString(), (this.pongCanvas.width / 2) - 300, 200
		);
		this.context.fillText(
			this.rightPaddle.score.toString(), (this.pongCanvas.width / 2) + 300, 200
		);

		// Draw rounds and text
		this.context.font = '30px Courier New';
		this.context.fillText(
			this.players[0].username + ' VS ' + this.players[1].username, this.pongCanvas.width / 2, 35
		);
		this.context.font = '40px Courier';
		this.context.fillText(
			this.rounds[this.round] ? this.rounds[this.round] : this.rounds[this.round - 1], this.pongCanvas.width / 2, 100
		);
	}

	menu() {
		// Setup menu
		this.draw();
		this.context.font = '50px Courier New';
		this.context.fillStyle = this.color;
		this.context.fillRect(this.pongCanvas.width / 2 - 350, this.pongCanvas.height / 2 - 48, 700, 100);
		this.context.fillStyle = '#ffffff';
		this.context.fillText('Press any key to begin', this.pongCanvas.width / 2, this.pongCanvas.height / 2 + 15);
	}

	endGameMenu() {
        // If scores already published, don't do it again
        if (this.scorePublished) {
            console.log("Scores already published, skipping publication");
            return;
        }
        
        console.log("Showing end game menu");
        
        // Set the scores published flag immediately to prevent multiple calls
        this.scorePublished = true;
        
        // Use the captured final scores from when the game ended
        const finalLeftScore = this.finalLeftScore;
        const finalRightScore = this.finalRightScore;
        
        if (finalLeftScore === undefined || finalRightScore === undefined) {
            console.error("Final scores are undefined, cannot publish scores");
            gameInstanceLock = false; // Release lock
            return;
        }
        
        // Determine winner and loser based on actual paddle scores
        const winner = finalLeftScore > finalRightScore ? this.players[0] : this.players[1];
        const loser = finalLeftScore > finalRightScore ? this.players[1] : this.players[0];
        
        console.log(`Match ended: ${winner.username} (${finalLeftScore > finalRightScore ? finalLeftScore : finalRightScore}) vs ${loser.username} (${finalLeftScore > finalRightScore ? finalRightScore : finalLeftScore})`);
        
        // Mark the loser as eliminated in the tournament players array
        const loserIndex = tournamentPlayers.findIndex(p => p.username === loser.username);
        if (loserIndex !== -1) {
            tournamentPlayers[loserIndex].eliminated = true;
        }
        
        // Record the winner in the current match in the winners array
        // Handle both regular matches and final-round matches with possible null player2
        let currentMatchIndex = -1;
        
        // First try to find a match with both player1 and player2 matching our players
        for (let i = 0; i < winners.length; i++) {
            const match = winners[i];
            if (match.player2 === null) continue; // Skip matches with null player2
            
            if ((match.player1.username === this.players[0].username && match.player2.username === this.players[1].username) ||
                (match.player1.username === this.players[1].username && match.player2.username === this.players[0].username)) {
                currentMatchIndex = i;
                break;
            }
        }
        
        // If no match found, look for a match in the final round format
        if (currentMatchIndex === -1) {
            for (let i = 0; i < winners.length; i++) {
                const match = winners[i];
                if (match.winner !== null) continue; // Skip matches that already have a winner
                
                // Check if this is a final round match by checking if either player1 or player2 matches our players
                if (match.player1 && match.player2 && 
                    ((match.player1.username === this.players[0].username || match.player1.username === this.players[1].username) &&
                     (match.player2.username === this.players[0].username || match.player2.username === this.players[1].username))) {
                    currentMatchIndex = i;
                    break;
                }
            }
        }
        
        if (currentMatchIndex !== -1) {
            winners[currentMatchIndex].winner = winner;
            console.log(`Recorded winner for match ${currentMatchIndex}: ${winner.username}`);
        } else {
            console.warn("Could not find a matching match in the winners array");
        }
        
        // Get JWT tokens from the stored player objects with better checks
        let publishScores = true;
        let winnerToken, loserToken;
        
        // Check winner token
        if (winner.JWT && typeof winner.JWT === 'object') {
            winnerToken = winner.JWT.access || (winner.JWT.value && winner.JWT.value.access);
        }
        
        // Check loser token
        if (loser.JWT && typeof loser.JWT === 'object') {
            loserToken = loser.JWT.access || (loser.JWT.value && loser.JWT.value.access);
        }
        
        // Log token status
        console.log(`Winner token status: ${winnerToken ? 'valid' : 'invalid'}, Loser token status: ${loserToken ? 'valid' : 'invalid'}`);
        
        if (!winnerToken || !loserToken) {
            console.error('Invalid JWT tokens:', { winnerToken, loserToken });
            publishScores = false;
        }
        
        // Continue with the tournament even if we can't publish scores
        const continueToNextMatch = () => {
            // Reset paddle scores
            this.leftPaddle.score = 0;
            this.rightPaddle.score = 0;
            
            // Clear current matchup
            currentMatchup = [];
            
            // Display end game message
            this.context.font = '50px Courier New';
            this.context.fillStyle = this.color;
            this.context.fillRect(this.pongCanvas.width / 2 - 350, this.pongCanvas.height / 2 - 48, 700, 100);
            this.context.fillStyle = '#ffffff';
            this.context.fillText('Press SPACE to continue', this.pongCanvas.width / 2, this.pongCanvas.height / 2 + 15);
            
            // Add key press handler for continuing
            const keyPressHandler = (event) => {
                if (event.code === 'Space') {
                    document.removeEventListener('keydown', keyPressHandler);
                
                // Clean up current game
                this.cleanup();
                
                // Release game instance lock
                gameInstanceLock = false;
                
                // Setup next matchup
                setupNextRound();
            }
        };
        
        document.addEventListener('keydown', keyPressHandler);
    };
    
    // Publish scores if tokens are valid, otherwise just continue
    if (publishScores) {
        console.log("Publishing scores:", finalLeftScore, finalRightScore);
        
        Promise.all([
            publishScore(winnerToken, winner.username, loser.username, finalLeftScore > finalRightScore ? finalLeftScore : finalRightScore, finalLeftScore > finalRightScore ? finalRightScore : finalLeftScore),
            publishScore(loserToken, loser.username, winner.username, finalLeftScore > finalRightScore ? finalRightScore : finalLeftScore, finalLeftScore > finalRightScore ? finalLeftScore : finalRightScore)
        ]).then(() => {
            continueToNextMatch();
        }).catch(error => {
            console.error('Error publishing scores:', error);
            continueToNextMatch(); // Continue anyway
        });
    } else {
        console.log("Skipping score publication due to invalid tokens");
        continueToNextMatch();
    }
}

update() {
	// Don't update gameplay if the game is over
	if (!this.over) {
		// Update the ball's position and check for collisions
		if (this.ball.x <= 0) this._resetTurn(this.rightPaddle, this.leftPaddle);
		if (this.ball.x >= this.pongCanvas.width - this.ball.width) this._resetTurn(this.leftPaddle, this.rightPaddle);

		if (this.ball.y <= 0) this.ball.moveY = this.DIRECTION.DOWN;
		if (this.ball.y >= this.pongCanvas.height - this.ball.height) this.ball.moveY = this.DIRECTION.UP;

		if (this.leftPaddle.move === this.DIRECTION.UP) this.leftPaddle.y -= this.leftPaddle.speed;
		else if (this.leftPaddle.move === this.DIRECTION.DOWN) this.leftPaddle.y += this.leftPaddle.speed;

		if (this.rightPaddle.move === this.DIRECTION.UP) this.rightPaddle.y -= this.rightPaddle.speed;
		else if (this.rightPaddle.move === this.DIRECTION.DOWN) this.rightPaddle.y += this.rightPaddle.speed;

		if (this._turnDelayIsOver() && this.turn) {
			this.ball.moveX = this.turn === this.leftPaddle ? this.DIRECTION.LEFT : this.DIRECTION.RIGHT;
			this.ball.moveY = [this.DIRECTION.UP, this.DIRECTION.DOWN][Math.round(Math.random())];
			this.ball.y = Math.floor(Math.random() * this.pongCanvas.height - 200) + 200;
			this.turn = null;
		}

		if (this.leftPaddle.y <= 0) this.leftPaddle.y = 0;
		else if (this.leftPaddle.y >= (this.pongCanvas.height - this.leftPaddle.height)) this.leftPaddle.y = (this.pongCanvas.height - this.leftPaddle.height);

		if (this.ball.moveY === this.DIRECTION.UP) this.ball.y -= (this.ball.speed / 1.5);
		else if (this.ball.moveY === this.DIRECTION.DOWN) this.ball.y += (this.ball.speed / 1.5);
		if (this.ball.moveX === this.DIRECTION.LEFT) this.ball.x -= this.ball.speed;
		else if (this.ball.moveX === this.DIRECTION.RIGHT) this.ball.x += this.ball.speed;

		if (this.rightPaddle.y >= this.pongCanvas.height - this.rightPaddle.height) this.rightPaddle.y = this.pongCanvas.height - this.rightPaddle.height;
		else if (this.rightPaddle.y <= 0) this.rightPaddle.y = 0;

		if (this.ball.x - this.ball.width <= this.leftPaddle.x && this.ball.x >= this.leftPaddle.x - this.leftPaddle.width) {
			if (this.ball.y <= this.leftPaddle.y + this.leftPaddle.height && this.ball.y + this.ball.height >= this.leftPaddle.y) {
				this.ball.x = (this.leftPaddle.x + this.ball.width);
				this.ball.moveX = this.DIRECTION.RIGHT;
				this.ball.speed += 0.2;
			}
		}

		if (this.ball.x - this.ball.width <= this.rightPaddle.x && this.ball.x >= this.rightPaddle.x - this.rightPaddle.width) {
			if (this.ball.y <= this.rightPaddle.y + this.rightPaddle.height && this.ball.y + this.ball.height >= this.rightPaddle.y) {
				this.ball.x = (this.rightPaddle.x - this.ball.width);
				this.ball.moveX = this.DIRECTION.LEFT;
				this.ball.speed += 0.2;
			}
		}
		
		// Check if either player has reached the target score - only do this if the game is not already over
		const targetScore = this.rounds[this.round];
		if (this.leftPaddle.score >= targetScore || this.rightPaddle.score >= targetScore) {
			this.gameOver();
		}
	}
}

// New dedicated method to handle game over state
gameOver() {
    // If game over already in progress, don't run again
    if (this.over || this.gameEndInProgress) return;
    
    console.log("Game over triggered");
    
    // Set flag to prevent multiple calls
    this.gameEndInProgress = true;
    
    // Freeze the game state
    this.over = true;
    
    // Stop ball movement
    this.ball.moveX = this.DIRECTION.IDLE;
    this.ball.moveY = this.DIRECTION.IDLE;
    
    // Stop paddle movement
    this.leftPaddle.move = this.DIRECTION.IDLE;
    this.rightPaddle.move = this.DIRECTION.IDLE;
    
    // Cancel any animation frames
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }
    
    // Capture final scores immediately
    this.finalLeftScore = this.leftPaddle.score;
    this.finalRightScore = this.rightPaddle.score;
    
    // Show end game menu after a short delay
    setTimeout(() => {
        this.endGameMenu();
    }, 1000);
}

loop() {
	this.update();
	this.draw();

	if (!this.over) {
		this.animationFrameId = requestAnimationFrame(() => this.loop());
	}
}

listen() {
	this.keyDownHandler = (event) => {
		if (!this.running) {
			this.running = true;
			window.requestAnimationFrame(() => this.loop());
		}
		if (event.keyCode === 87) this.leftPaddle.move = this.DIRECTION.UP;
		if (event.keyCode === 83) this.leftPaddle.move = this.DIRECTION.DOWN;
		if (event.keyCode === 38) this.rightPaddle.move = this.DIRECTION.UP;
		if (event.keyCode === 40) this.rightPaddle.move = this.DIRECTION.DOWN;
	};

	this.keyUpHandler = (event) => {
		this.leftPaddle.move = this.DIRECTION.IDLE;
		this.rightPaddle.move = this.DIRECTION.IDLE;
	};

	document.addEventListener('keydown', this.keyDownHandler);
	document.addEventListener('keyup', this.keyUpHandler);
}

async initialize() {
	console.log("Starting match initialization");
	
	// Create paddles and ball
	this.leftPaddle = this.createPaddle('left');
	this.rightPaddle = this.createPaddle('right');
	this.ball = this.createBall();
	this.turn = this.rightPaddle;

	this.menu();
	this.listen();
}

_resetTurn(victor, loser) {
    // Increment the score first before any other changes
    victor.score++;
    
    // Create a completely new ball with default state
    this.ball = this.createBall();
    
    // Set the turn but don't change the ball's movement yet
    this.turn = loser;
    
    // Reset the timer to ensure proper delay before the ball moves
    this.timer = (new Date()).getTime();
}

_turnDelayIsOver() {
	return ((new Date()).getTime() - this.timer >= 1000);
}

_generateRoundColor() {
	let newColor = this.colors[Math.floor(Math.random() * this.colors.length)];
	if (newColor === this.color) return this._generateRoundColor();
	return newColor;
}

cleanup() {
	// Cancel any pending animation frame
	if (this.animationFrameId) {
		cancelAnimationFrame(this.animationFrameId);
	}

	// Remove event listeners
	if (this.keyDownHandler) {
		document.removeEventListener('keydown', this.keyDownHandler);
	}
	if (this.keyUpHandler) {
		document.removeEventListener('keyup', this.keyUpHandler);
	}

	// Clear the canvas
	if (this.context) {
		this.context.clearRect(0, 0, this.pongCanvas.width, this.pongCanvas.height);
	}

	// Reset game state
	this.running = false;
	this.over = true;
	this.leftPaddle = null;
	this.rightPaddle = null;
	this.ball = null;
	this.turn = null;

	// Clear the global reference
	window.currentPongGame = null;
}
};
