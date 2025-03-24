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

// Function to clear tournament data when navigating away
function clearTournamentData() {
    tournamentPlayers = [];
    currentMatchup = [];
    bracketRound = 0;
    primaryPlayerAdded = false;
    
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
    
    // Add current user to tournament players list
    tournamentPlayers.push({
        username: myUser.username,
        JWT: JWTs,
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
	});

	// Event delegation for invite and remove buttons
	playerList.addEventListener('click', async (event) => {
		const target = event.target;
		
		// Invite button
		if (target.classList.contains('invite-btn')) {
			const username = target.getAttribute('data-username');
			await sendPongInvite(username);
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
    // Count active players
    const activePlayers = tournamentPlayers.filter(p => !p.eliminated);
    
    // If only one player remains, they're the champion
    if (activePlayers.length === 1) {
        alert(`Tournament completed! ${activePlayers[0].username} is the champion!`);
        endTournament();
        return;
    }
    
    // Start a new round if needed
    if (currentMatchup.length === 0) {
        bracketRound++;
        console.log(`Starting bracket round ${bracketRound}`);
        
        // Get the first two non-eliminated players for the next match
        const nextPlayers = activePlayers.slice(0, 2);
        currentMatchup = nextPlayers;
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
		const message = "Let's play pong!";
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

class PongGameTournament {
	constructor(matchupPlayers) {
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

	endGameMenu(text) {
		this.context.font = '50px Courier New';
		this.context.fillStyle = this.color;
		this.context.fillRect(this.pongCanvas.width / 2 - 350, this.pongCanvas.height / 2 - 48, 700, 100);
		this.context.fillStyle = '#ffffff';
		this.context.fillText(text, this.pongCanvas.width / 2, this.pongCanvas.height / 2 + 15);
		this.leftPaddle.score = this.rightPaddle.score = 0;
		this.running = this.over = false;
		this.leftPaddle.y = (this.pongCanvas.height / 2) - 35;
		this.rightPaddle.y = (this.pongCanvas.height / 2) - 35;

		// Determine winner and loser based on scores
        let winnerIndex, loserIndex;
        if (this.leftPaddle.score > this.rightPaddle.score) {
            winnerIndex = 0; // Left player (players[0]) won
            loserIndex = 1;  // Right player (players[1]) lost
        } else {
            winnerIndex = 1; // Right player (players[1]) won
            loserIndex = 0;  // Left player (players[0]) lost
        }
        
        console.log(`Winner: ${this.players[winnerIndex].username}, Loser: ${this.players[loserIndex].username}`);
        
        // Mark loser as eliminated
        const loserPlayerIndex = tournamentPlayers.findIndex(p => p.username === this.players[loserIndex].username);
        if (loserPlayerIndex !== -1) {
            tournamentPlayers[loserPlayerIndex].eliminated = true;
        }
        
		// Use promises to handle score publishing
		const publishLeftScore = new Promise((resolve) => {
			this.publishScore(this.players[0].JWT, this.players[1].username, this.leftPaddle.score, this.rightPaddle.score);
			resolve();
		});

		const publishRightScore = new Promise((resolve) => {
			this.publishScore(this.players[1].JWT, this.players[0].username, this.rightPaddle.score, this.leftPaddle.score);
			resolve();
		});

		Promise.all([publishLeftScore, publishRightScore]).then(() => {
			// Add event listener for key press to continue tournament
			const keyPressGameEnd = () => {
				document.removeEventListener('keydown', keyPressGameEnd);
				
				// Clear current matchup to setup next match
                currentMatchup = [];
                
                // Setup next matchup
                setupNextRound();
                
                // Clean up current game
                this.cleanup();
                
                // Start next match if there are players left
                if (currentMatchup.length === 2) {
                    setTimeout(() => {
                        let pongGame = new PongGameTournament(currentMatchup);
                        pongGame.initialize();
                    }, 500);
                } else {
                    // End tournament if no more matches
                    endTournament();
                }
			};
			
			document.addEventListener('keydown', keyPressGameEnd);
			document.removeEventListener('keyup', this.keyUpHandler);
			document.removeEventListener('keydown', this.keyDownHandler);
		});
	}

	update() {
		// Update game state
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
		}

		if (this.leftPaddle.score === this.rounds[this.round]) {
			this.over = true;
			setTimeout(() => { 
				this.endGameMenu(this.players[0].username + ' wins! Press any key to continue'); 
			}, 1000);
		}
		else if (this.rightPaddle.score === this.rounds[this.round]) {
			this.over = true;
			setTimeout(() => { 
				this.endGameMenu(this.players[1].username + ' wins! Press any key to continue'); 
			}, 1000);
		}
	}

	async publishScore(token, their_username, my_score, their_score) {
		let body = {};
		body["their_username"] = their_username;
		body["my_score"] = my_score;
		body["their_score"] = their_score;
		
		let response = await apiRequest('/pong/score', 'POST', token, body);
		if (response) {
			console.log("Score published successfully", response);
		} else {
			console.log("Failed to publish score");
		}
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
		this.ball = this.createBall();
		this.turn = loser;
		this.timer = (new Date()).getTime();

		victor.score++;
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
