class PongGame {
	constructor(gameMode = 'single') {
		// Game mode: 'single' for AI opponent, 'multi' for multiplayer
		this.gameMode = gameMode;
		
		// Initialize container and canvas
		this.pongContainer = document.getElementById('pong-wrapper');
		this.pongCanvas = document.createElement('canvas');
		this.pongCanvas.id = 'pong-canvas';
		this.pongCanvas.style.cssText = "display: block; margin: auto; background: black;";
		this.pongContainer.appendChild(this.pongCanvas);
		this.context = this.pongCanvas.getContext('2d');

		// Canvas setup
		this.pongCanvas.width = 1400;
		this.pongCanvas.height = 1000;
		this.pongCanvas.style.width = (this.pongCanvas.width / 2) + 'px';
		this.pongCanvas.style.height = (this.pongCanvas.height / 2) + 'px';

		// Direction constants
		this.DIRECTION = {
			IDLE: 0,
			UP: 1,
			DOWN: 2,
			LEFT: 3,
			RIGHT: 4
		};

		// Game settings
		this.rounds = [5];
		this.colors = ['#2c3e50'];

		// Default game properties
		this.running = this.over = false;
		this.timer = this.round = 0;
		this.color = '#2c3e50';

		// Event handler references for cleanup
		this.keyDownHandler = null;
		this.keyUpHandler = null;
		this.animationFrameId = null;

		// Multiplayer specific
		if (this.gameMode === 'multi') {
			this.myUser = null;
			this.theirUser = null;
		}

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

		// Draw player paddle
		if (this.player) this.context.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
		
		// Draw opponent/AI paddle (with the right variable name based on mode)
		if (this.gameMode === 'single') {
			if (this.paddle) this.context.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
		} else {
			if (this.opponent) this.context.fillRect(this.opponent.x, this.opponent.y, this.opponent.width, this.opponent.height);
		}
		
		// Draw ball
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

		// Draw scores
		this.context.fillText(
			this.player.score.toString(), (this.pongCanvas.width / 2) - 300, 200
		);
		
		if (this.gameMode === 'single') {
			this.context.fillText(
				this.paddle.score.toString(), (this.pongCanvas.width / 2) + 300, 200
			);
		} else {
			this.context.fillText(
				this.opponent.score.toString(), (this.pongCanvas.width / 2) + 300, 200
			);
		}

		// Draw header text
		this.context.font = '30px Courier New';
		
		// Different header text based on game mode
		if (this.gameMode === 'single') {
			this.context.fillText(
				'First one who scores 5 wins!', this.pongCanvas.width / 2, 35
			);
		} else if (this.myUser && this.theirUser) {
			this.context.fillText(
				this.myUser.first_name + ' VS ' + this.theirUser.first_name, this.pongCanvas.width / 2, 35
			);
		}
		
		// Draw round indicator
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
		// End game screen
		this.context.font = '50px Courier New';
		this.context.fillStyle = this.color;
		this.context.fillRect(this.pongCanvas.width / 2 - 350, this.pongCanvas.height / 2 - 48, 700, 100);
		this.context.fillStyle = '#ffffff';
		this.context.fillText(text, this.pongCanvas.width / 2, this.pongCanvas.height / 2 + 15);
		
		// Reset scores
		this.player.score = 0;
		
		if (this.gameMode === 'single') {
			this.paddle.score = 0;
			this.paddle.y = (this.pongCanvas.height / 2) - 35;
		} else {
			this.opponent.score = 0;
			this.opponent.y = (this.pongCanvas.height / 2) - 35;
		}
		
		this.running = this.over = false;
		this.player.y = (this.pongCanvas.height / 2) - 35;
		this.listen();
	}

	update() {
		// Update game state
		if (!this.over) {
			// Get reference to opponent paddle (AI or multiplayer opponent)
			const opponentPaddle = this.gameMode === 'single' ? this.paddle : this.opponent;
			
			// Update the ball's position and check for collisions
			if (this.ball.x <= 0) this._resetTurn(opponentPaddle, this.player);
			if (this.ball.x >= this.pongCanvas.width - this.ball.width) this._resetTurn(this.player, opponentPaddle);

			if (this.ball.y <= 0) this.ball.moveY = this.DIRECTION.DOWN;
			if (this.ball.y >= this.pongCanvas.height - this.ball.height) this.ball.moveY = this.DIRECTION.UP;

			// Update player paddle position based on input
			if (this.player.move === this.DIRECTION.UP) this.player.y -= this.player.speed;
			else if (this.player.move === this.DIRECTION.DOWN) this.player.y += this.player.speed;

			// For multiplayer: update opponent paddle based on input 
			if (this.gameMode === 'multi' && this.opponent) {
				if (this.opponent.move === this.DIRECTION.UP) this.opponent.y -= this.opponent.speed;
				else if (this.opponent.move === this.DIRECTION.DOWN) this.opponent.y += this.opponent.speed;
			}

			// Check if turn delay is over to start moving the ball
			if (this._turnDelayIsOver() && this.turn) {
				this.ball.moveX = this.turn === this.player ? this.DIRECTION.LEFT : this.DIRECTION.RIGHT;
				this.ball.moveY = [this.DIRECTION.UP, this.DIRECTION.DOWN][Math.round(Math.random())];
				this.ball.y = Math.floor(Math.random() * this.pongCanvas.height - 200) + 200;
				this.turn = null;
			}

			// Keep player paddle in bounds
			if (this.player.y <= 0) this.player.y = 0;
			else if (this.player.y >= (this.pongCanvas.height - this.player.height)) this.player.y = (this.pongCanvas.height - this.player.height);

			// Update ball position
			if (this.ball.moveY === this.DIRECTION.UP) this.ball.y -= (this.ball.speed / 1.5);
			else if (this.ball.moveY === this.DIRECTION.DOWN) this.ball.y += (this.ball.speed / 1.5);
			if (this.ball.moveX === this.DIRECTION.LEFT) this.ball.x -= this.ball.speed;
			else if (this.ball.moveX === this.DIRECTION.RIGHT) this.ball.x += this.ball.speed;

			// AI movement logic (only in single player mode)
			if (this.gameMode === 'single' && this.paddle) {
				if (this.paddle.y > this.ball.y - (this.paddle.height / 2)) {
					if (this.ball.moveX === this.DIRECTION.RIGHT) this.paddle.y -= this.paddle.speed / 1.5;
					else this.paddle.y -= this.paddle.speed / 4;
				}
				if (this.paddle.y < this.ball.y - (this.paddle.height / 2)) {
					if (this.ball.moveX === this.DIRECTION.RIGHT) this.paddle.y += this.paddle.speed / 1.5;
					else this.paddle.y += this.paddle.speed / 4;
				}
			}

			// Keep opponent/AI paddle in bounds
			if (this.gameMode === 'single') {
				if (this.paddle.y >= this.pongCanvas.height - this.paddle.height) this.paddle.y = this.pongCanvas.height - this.paddle.height;
				else if (this.paddle.y <= 0) this.paddle.y = 0;
			} else {
				if (this.opponent.y >= this.pongCanvas.height - this.opponent.height) this.opponent.y = this.pongCanvas.height - this.opponent.height;
				else if (this.opponent.y <= 0) this.opponent.y = 0;
			}

			// Ball collision with player paddle
			if (this.ball.x - this.ball.width <= this.player.x && this.ball.x >= this.player.x - this.player.width) {
				if (this.ball.y <= this.player.y + this.player.height && this.ball.y + this.ball.height >= this.player.y) {
					this.ball.x = (this.player.x + this.ball.width);
					this.ball.moveX = this.DIRECTION.RIGHT;
					this.ball.speed += 0.2;
				}
			}

			// Ball collision with opponent/AI paddle
			if (this.gameMode === 'single') {
				if (this.ball.x - this.ball.width <= this.paddle.x && this.ball.x >= this.paddle.x - this.paddle.width) {
					if (this.ball.y <= this.paddle.y + this.paddle.height && this.ball.y + this.ball.height >= this.paddle.y) {
						this.ball.x = (this.paddle.x - this.ball.width);
						this.ball.moveX = this.DIRECTION.LEFT;
						this.ball.speed += 0.2;
					}
				}
			} else {
				if (this.ball.x - this.ball.width <= this.opponent.x && this.ball.x >= this.opponent.x - this.opponent.width) {
					if (this.ball.y <= this.opponent.y + this.opponent.height && this.ball.y + this.ball.height >= this.opponent.y) {
						this.ball.x = (this.opponent.x - this.ball.width);
						this.ball.moveX = this.DIRECTION.LEFT;
						this.ball.speed += 0.2;
					}
				}
			}
		}

		// Check win conditions
		const opponentPaddle = this.gameMode === 'single' ? this.paddle : this.opponent;
		
		if (this.player.score === this.rounds[this.round]) {
			this.over = true;
			
			if (this.gameMode === 'single') {
				this.publishScore();
				setTimeout(() => { this.endGameMenu('Winner! Press any key to play again'); }, 1000);
			} else {
				// Store a reference to the JWT to ensure it's preserved in scope
				const myJWT = JWTs;
				const theirJWT = window.opponentJWTs;
				
				if (!theirJWT) {
					console.error("Global opponent JWT is undefined");
				}
				
				this.publishScore(myJWT, this.theirUser.username, this.player.score, this.opponent.score);
				this.publishScore(theirJWT, this.myUser.username, this.opponent.score, this.player.score);
				setTimeout(() => { this.endGameMenu(this.myUser.first_name + ' wins! Press any key to play again'); }, 1000);
			}
		}
		else if (opponentPaddle.score === this.rounds[this.round]) {
			this.over = true;
			
			if (this.gameMode === 'single') {
				this.publishScore();
				setTimeout(() => { this.endGameMenu('You lost! Press any key to play again'); }, 1000);
			} else {
				// Store a reference to the JWT to ensure it's preserved in scope
				const myJWT = JWTs;
				const theirJWT = window.opponentJWTs;
				
				if (!theirJWT) {
					console.error("Global opponent JWT is undefined");
				}
				
				this.publishScore(myJWT, this.theirUser.username, this.player.score, this.opponent.score);
				this.publishScore(theirJWT, this.myUser.username, this.opponent.score, this.player.score);
				setTimeout(() => { this.endGameMenu(this.theirUser.first_name + ' wins! Press any key to play again'); }, 1000);
			}
		}
	}

	async publishScore(token = JWTs, their_username = "", my_score = this.player.score, their_score = this.gameMode === 'single' ? this.paddle.score : this.opponent.score) {
		let body = {};
		body["their_username"] = their_username;
		body["my_score"] = my_score;
		body["their_score"] = their_score;
		
		// Defensive check to ensure token is defined
		if (!token) {
			console.error("Token is undefined in publishScore", { gameMode: this.gameMode });
			
			// For opponent token, try to get it from global storage
			if (this.gameMode === 'multi' && their_username === this.myUser?.username) {
				console.log("Using global opponent JWT");
				token = window.opponentJWTs;
				
				if (!token) {
					console.error("Global opponent JWT is undefined");
					return;
				}
			} else {
				return;
			}
		}
		
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
		// Different key handlers based on game mode
		if (this.gameMode === 'single') {
			this.keyDownHandler = (event) => {
				if (!this.running) {
					this.running = true;
					window.requestAnimationFrame(() => this.loop());
				}
				if (event.keyCode === 38 || event.keyCode === 87) this.player.move = this.DIRECTION.UP;
				if (event.keyCode === 40 || event.keyCode === 83) this.player.move = this.DIRECTION.DOWN;
			};

			this.keyUpHandler = (event) => {
				this.player.move = this.DIRECTION.IDLE;
			};

			document.addEventListener('keydown', this.keyDownHandler);
			document.addEventListener('keyup', this.keyUpHandler);
		} else {
			this.keyDownHandler = (event) => {
				if (!this.running) {
					this.running = true;
					window.requestAnimationFrame(() => this.loop());
				}
				if (event.keyCode === 87) this.player.move = this.DIRECTION.UP;
				if (event.keyCode === 83) this.player.move = this.DIRECTION.DOWN;
				if (event.keyCode === 38) this.opponent.move = this.DIRECTION.UP;
				if (event.keyCode === 40) this.opponent.move = this.DIRECTION.DOWN;
			};

			this.keyUpHandler = (event) => {
				this.player.move = this.DIRECTION.IDLE;
				this.opponent.move = this.DIRECTION.IDLE;
			};

			document.addEventListener('keydown', this.keyDownHandler);
			document.addEventListener('keyup', this.keyUpHandler);
		}
	}

	async initialize() {
		// For multiplayer: fetch user information
		if (this.gameMode === 'multi') {
			console.log("Starting init of multiplayer pong");
			console.log("Initialize: opponentJWTs exists:", !!window.opponentJWTs);
			
			this.myUser = await apiRequest("/me", "GET", JWTs, undefined);
			if (!this.myUser) {
				const error = new Error("Failed to get my user information");
				console.log(error);
				throw error;
			}
			
			this.theirUser = await apiRequest("/me", "GET", window.opponentJWTs, undefined);
			if (!this.theirUser) {
				const error = new Error("Failed to get opponent user information");
				console.log(error);
				throw error;
			}
			
			this.player = this.createPaddle('left');
			this.opponent = this.createPaddle('right');
			this.ball = this.createBall();
			this.turn = this.opponent;
		} else {
			// Single player setup
			this.player = this.createPaddle('left');
			this.paddle = this.createPaddle('right');
			this.ball = this.createBall();
			this.turn = this.paddle;
		}

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
		this.player = null;
		
		if (this.gameMode === 'single') {
			this.paddle = null;
		} else {
			this.opponent = null;
			// Clear multiplayer-specific global state
			window.opponentJWTs = null;
		}
		
		this.ball = null;
		this.turn = null;

		// Clear the global reference
		window.currentPongGame = null;
	}
}

// Helper function for multiplayer initialization
async function pongMultiStart() {
	try {
        debugger;
		window.opponentJWTs = await getPuppetJWTs();
        console.log("opponentJWTs", window.opponentJWTs);
		if (window.opponentJWTs == null) {
			console.error("Failed to get opponent JWT - aborting pong game");
			navigateTo("/");
			return;
		}

		
		// Create and initialize the game
		window.currentPongGame = new PongGame('multi');
		
		// Try to initialize, which might fail
		await window.currentPongGame.initialize();
		
		// If we made it here, initialization succeeded
		console.log("Pong multiplayer initialized successfully");
	} catch (error) {
		// Log the error
		console.log("Failed to initialize pong game:", error);
		
		// Clean up any partial game state
		if (window.currentPongGame) {
			window.currentPongGame.cleanup();
		} else {
			// Ensure global state is cleared
			window.opponentJWTs = null;
			window.currentPongGame = null;
		}
		
		// Navigate back to home
        alert("Failed to initialize pong game");
		navigateTo("/");
	}
} 