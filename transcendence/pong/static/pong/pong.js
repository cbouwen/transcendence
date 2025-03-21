class PongGame {
	constructor() {
		// Initialize container and canvas
		this.pongContainer = document.getElementById('pong-wrapper');
		this.pongContainer = document.getElementById('pong-wrapper');
		this.pongCanvas = document.createElement('canvas');
		this.pongCanvas.id = 'pong-canvas';
		this.pongCanvas.style.cssText = "display: block; margin: auto; background: black;";
		this.pongContainer.appendChild(this.pongCanvas);
		this.context = this.pongCanvas.getContext('2d');

		this.pongCanvas.width = 1400;
		this.pongCanvas.height = 1000;

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
		if (this.player) this.context.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
		if (this.paddle) this.context.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
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
			this.player.score.toString(), (this.pongCanvas.width / 2) - 300, 200
		);
		this.context.fillText(
			this.paddle.score.toString(), (this.pongCanvas.width / 2) + 300, 200
		);

		// Draw rounds and text
		this.context.font = '30px Courier New';
		this.context.fillText(
			'First one who scores 5 wins!' , this.pongCanvas.width / 2, 35
		);  //change message to play till 5 or something
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
		this.player.score = this.paddle.score = 0;
		this.running = this.over = false;
		this.player.y = (this.pongCanvas.height / 2) - 35
		this.paddle.y = (this.pongCanvas.height / 2) - 35
		this.listen();
	}

	update() {
		// Update game state
		if (!this.over) {
			// Update the ball's position and check for collisions
			if (this.ball.x <= 0) this._resetTurn(this.paddle, this.player);
			if (this.ball.x >= this.pongCanvas.width - this.ball.width) this._resetTurn(this.player, this.paddle);

			if (this.ball.y <= 0) this.ball.moveY = this.DIRECTION.DOWN;
			if (this.ball.y >= this.pongCanvas.height - this.ball.height) this.ball.moveY = this.DIRECTION.UP;

			if (this.player.move === this.DIRECTION.UP) this.player.y -= this.player.speed;
			else if (this.player.move === this.DIRECTION.DOWN) this.player.y += this.player.speed;

			if (this._turnDelayIsOver() && this.turn) {
				this.ball.moveX = this.turn === this.player ? this.DIRECTION.LEFT : this.DIRECTION.RIGHT;
				this.ball.moveY = [this.DIRECTION.UP, this.DIRECTION.DOWN][Math.round(Math.random())];
				this.ball.y = Math.floor(Math.random() * this.pongCanvas.height - 200) + 200;
				this.turn = null;
			}

			if (this.player.y <= 0) this.player.y = 0;
			else if (this.player.y >= (this.pongCanvas.height - this.player.height)) this.player.y = (this.pongCanvas.height - this.player.height);

			if (this.ball.moveY === this.DIRECTION.UP) this.ball.y -= (this.ball.speed / 1.5);
			else if (this.ball.moveY === this.DIRECTION.DOWN) this.ball.y += (this.ball.speed / 1.5);
			if (this.ball.moveX === this.DIRECTION.LEFT) this.ball.x -= this.ball.speed;
			else if (this.ball.moveX === this.DIRECTION.RIGHT) this.ball.x += this.ball.speed;

			if (this.paddle.y > this.ball.y - (this.paddle.height / 2)) {
				if (this.ball.moveX === this.DIRECTION.RIGHT) this.paddle.y -= this.paddle.speed / 1.5;
				else this.paddle.y -= this.paddle.speed / 4;
			}
			if (this.paddle.y < this.ball.y - (this.paddle.height / 2)) {
				if (this.ball.moveX === this.DIRECTION.RIGHT) this.paddle.y += this.paddle.speed / 1.5;
				else this.paddle.y += this.paddle.speed / 4;
			}

			if (this.paddle.y >= this.pongCanvas.height - this.paddle.height) this.paddle.y = this.pongCanvas.height - this.paddle.height;
			else if (this.paddle.y <= 0) this.paddle.y = 0;

			if (this.ball.x - this.ball.width <= this.player.x && this.ball.x >= this.player.x - this.player.width) {
				if (this.ball.y <= this.player.y + this.player.height && this.ball.y + this.ball.height >= this.player.y) {
					this.ball.x = (this.player.x + this.ball.width);
					this.ball.moveX = this.DIRECTION.RIGHT;
					this.ball.speed += 0.2;
				}
			}

			if (this.ball.x - this.ball.width <= this.paddle.x && this.ball.x >= this.paddle.x - this.paddle.width) {
				if (this.ball.y <= this.paddle.y + this.paddle.height && this.ball.y + this.ball.height >= this.paddle.y) {
					this.ball.x = (this.paddle.x - this.ball.width);
					this.ball.moveX = this.DIRECTION.LEFT;
					this.ball.speed += 0.2;
				}
			}
		}

		if (this.player.score === this.rounds[this.round]) {
			this.over = true;
			this.publishScore();
			setTimeout(() => { this.endGameMenu('Winner! Press any key to play again'); }, 1000);
		//	this.player.score = this.paddle.score = 0;
		}
		else if (this.paddle.score === this.rounds[this.round]) {
			this.over = true;
			this.publishScore();
			setTimeout(() => { this.endGameMenu('You lost! Press any key to play again'); }, 1000);
		}
	}

	async publishScore() {
		let body = {};
		body["their_username"] = "";
		body["my_score"] = this.player.score;
		body["their_score"] = this.paddle.score;
		let response = await apiRequest('/pong/score', 'POST', JWTs, body);
		if (response) {
			console.log("score published", response);
		} else {
			console.log("failed to publish score");
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
			if (event.keyCode === 38 || event.keyCode === 87) this.player.move = this.DIRECTION.UP;
			if (event.keyCode === 40 || event.keyCode === 83) this.player.move = this.DIRECTION.DOWN;
		};

		this.keyUpHandler = (event) => {
			this.player.move = this.DIRECTION.IDLE;
		};

		document.addEventListener('keydown', this.keyDownHandler);
		document.addEventListener('keyup', this.keyUpHandler);
	}

	initialize() {
		this.player = this.createPaddle('left');
		this.paddle = this.createPaddle('right');
		this.ball = this.createBall();
		this.turn = this.paddle;

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
		this.paddle = null;
		this.ball = null;
		this.turn = null;

		// Clear the global reference
		window.currentPongGame = null;
	}
};
