const urlRoot = "http://localhost:8000";
const apiPath = "/api";
const staticDir = "/static";
const intraLoginUrl = "https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-106ab599e58a35bf00e2a4e2a3f6af8f27a450ca5e30e1c6643e1f78b68d65ae&redirect_uri=http%3A%2F%2Flocalhost%3A8000&response_type=code";

async function apiRequest(endpoint, method, jwtTokens, body) {
	const url = urlRoot + apiPath + endpoint;

	let headers = {
		'Content-Type': 'application/json',
	};
	if (jwtTokens && jwtTokens.access) {
		headers['Authorization'] = 'Bearer ' + jwtTokens.access
	}

	const request = {
		method: method,
		headers: headers,
		body: JSON.stringify(body)
	};

	console.log("Sending the following request:");
	console.log(request);
	const response = await fetch(url, request);
	if (!response.ok) {
		console.error("Unexpected response");
		console.error(response);
		return undefined;
	}
	const responseData = response.json();
	return responseData;
};

async function login(code) {
	try {
		const response = await apiRequest("/token", 'POST', undefined, { ft_api_user_login_code: code });
		if (!response) {
			console.error("Couldn't login using code");
			return;
		}

		return await response;
	} catch (error) {
		console.error("Error during fetch:", error);
		return undefined;
	};
};

function redirectToIntra() {
	console.log("Redirecting to intra login page to retreive code...");
	window.location.replace(intraLoginUrl);
};

function extractLoginCodeFromURL() {
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get('code');

	if (code) {
		urlParams.delete('code');
		const newUrl = window.location.pathname + '?' + urlParams.toString();
		window.history.replaceState({}, document.title, newUrl.endsWith('?') ? newUrl.slice(0, -1) : newUrl);
		return code;
	} else {
		throw "Couldn't read the the `code` URL parameter attribute...";
	}
};

function queryAndReplace(query, newContent) {
	const nodes = document.querySelectorAll(query);
	nodes.forEach(node => {
		node.textContent = newContent;
	});
};

async function viewStaticHTML(filePath) {
	const response = await fetch(urlRoot + staticDir + filePath);
	const content = await response.text();
	document.getElementById("content").innerHTML = content;
};

function navigateTo(url) {
	history.pushState(null, null, url);
	router();
};

async function router() {
	if (location.pathname !== "/tetris") {
		cleanupTetris();
	}
	if (location.pathname !== "/pong") {
		//cleanupPong();
		//document.body.innerHTML = '' // Clears the body
	}
	const routes = [
		{
			path: "/",
			view: async () => {
				await viewStaticHTML("/home.html");
			}
		},
		{
			path: "/pong",
			view: async () => {
				await viewStaticHTML("/pong/site.html");
				const pongGame = new PongGame();
				pongGame.initialize();
			}
		},
		{
			path: "/tetris",
			view: async () => {
				await viewStaticHTML("/tetris/1_player.html");
				const playerConfigs = [
					{
						name: "Alice",
						controls: {
							left: 'ArrowLeft',
							right: 'ArrowRight',
							down: 'ArrowDown',
							rotate: 'ArrowUp'
						}
					},
					{
						name: "Yannick",
						controls: {
							left: 'a',
							right: 'd',
							down: 's',
							rotate: 'w'
						}
					}
				]
				launchTetrisGame(playerConfigs);
			}
		},
	];

	const potentialMatches = routes.map(route => {
		return {
			route: route,
			isMatch: location.pathname === route.path
		};
	});

	let match = potentialMatches.find(potentialMatch => potentialMatch.isMatch);

	if (!match) {
		match = {
			route: routes[0],
			isMatch: true
		}
	}

	match.route.view();
};

// TETRIS JAVASCRIPT START

function launchTetrisGame(playerConfigs) {
	let game_id = 0;
	if (game_id == 0) {
		game_id = generateGameId();
	}
	console.log("launchTetrisGame called with:", playerConfigs);

	// Global variables to track game status
	const totalPlayers = playerConfigs.length;
	let playersDeadCount = 0;
	let games = [];

	function generateGameId() {
		const timestamp = Date.now();
		return `${timestamp}`
	}

	// Inject CSS (optional, but included here for completeness)
	const style = document.createElement('style');
	style.textContent = `
        .game-container {
            display: inline-block;
            margin: 10px;
            vertical-align: top;
            font-family: Arial, sans-serif;
        }
        .score, .level, .lines {
            font-size: 20px;
            margin-top: 10px;
            color: white;
        }
        body {
            background-color: black;
            text-align: center;
            padding-top: 20px;
        }
        .player-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
            color: white;
        }
        .scoreboard-overlay {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid white;
            padding: 20px;
            z-index: 9999;
            text-align: center;
            min-width: 300px;
            box-shadow: 0 0 10px rgba(255,255,255,0.5);
            color: white;
        }
        .scoreboard-title {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            color: white;
        }
        .scoreboard-entry {
            font-size: 20px;
            margin: 5px 0;
            color: white;
        }
    `;
	document.head.appendChild(style);

	class TetrisGame {
		constructor(containerId, controls, name) {
			console.log(`Initializing TetrisGame for container: ${containerId}`);
			this.container = document.getElementById(containerId);
			this.name = name;

			this.canvas = document.createElement('canvas');
			this.canvas.width = 200;
			this.canvas.height = 440;
			this.canvas.style.border = '2px solid white';
			this.canvas.style.backgroundColor = 'black';
			this.context = this.canvas.getContext('2d');
			document.body.appendChild(this.canvas);

			// Initialize game state
			this.score = 0;
			this.linesCleared = 0;
			this.gameOver = false;
			this.losingTetromino = null;
			this.lastPlacedPositions = []; // Store last placed piece positions and type
			this.grid = 20;
			this.rows = 22;
			this.cols = 10;
			this.dropCounter = 0;
			this.lastTime = 0;

			// Initial drop interval (speed)
			this.dropInterval = 1000;

			this.tetrominoSequence = [];
			this.controls = controls;

			// Key states for handling continuous movement
			this.keysState = {
				left: { pressed: false, timeout: null, interval: null },
				right: { pressed: false, timeout: null, interval: null },
				down: { pressed: false, timeout: null, interval: null },
				rotate: { pressed: false, timeout: null, interval: null }
			};
			this.initialDelay = 300;
			this.repeatInterval = 50;

			// Display elements
			this.scoreElement = document.createElement('div');
			this.scoreElement.classList.add('score');
			this.scoreElement.textContent = 'Score: ' + this.score;
			this.container.appendChild(this.scoreElement);

			// New: lines cleared display
			this.linesElement = document.createElement('div');
			this.linesElement.classList.add('lines');
			this.linesElement.textContent = 'Lines: ' + this.linesCleared;
			this.container.appendChild(this.linesElement);

			this.levelDisplay = document.createElement('div');
			this.levelDisplay.classList.add('level');
			this.updateLevelDisplay();
			this.container.appendChild(this.levelDisplay);

			// Initialize playfield
			this.playfield = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));

			// Tetromino definitions
			this.tetrominoes = [
				[[1], [1], [1], [1]],     // I
				[[2, 2], [2, 2]],         // O
				[[0, 3, 0], [3, 3, 3]],     // T
				[[0, 4, 4], [4, 4, 0]],     // S
				[[5, 5, 0], [0, 5, 5]],     // Z
				[[6, 0, 0], [6, 6, 6]],     // J
				[[0, 0, 7], [7, 7, 7]]      // L
			];

			// Extra colors: grey (8), white (9)
			this.colors = [
				null,
				'cyan', 'yellow', 'purple', 'green', 'red', 'blue', 'orange',
				'grey', 'white'
			];

			// Grab the first tetromino
			this.currentTetromino = this.getNextTetromino();
			this.update();
		}

		destroy() {
			// Cancel the animation frame to stop the game loop
			if (this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
			}
			// If you have set timeouts/intervals (for key repeats), clear them here.
			// For each key in keysState:
			for (const key in this.keysState) {
				this.stopKeyRepeat(key);
			}
			// Optionally remove any event listeners specific to this instance.
			console.log(`Destroyed game for ${this.name}`);
		}

		generateSequence() {
			// Shuffle the 7 tetromino types
			const sequence = [0, 1, 2, 3, 4, 5, 6];
			while (sequence.length) {
				const rand = Math.floor(Math.random() * sequence.length);
				const piece = sequence.splice(rand, 1)[0];
				this.tetrominoSequence.push(piece);
			}
			console.log("Tetromino Sequence Generated:", this.tetrominoSequence);
		}

		getNextTetromino() {
			if (this.tetrominoSequence.length === 0) {
				this.generateSequence();
			}
			const tetrominoType = this.tetrominoSequence.pop();
			const matrix = this.tetrominoes[tetrominoType];
			const col = Math.floor(this.cols / 2) - Math.floor(matrix[0].length / 2);
			const row = 0;
			const tetromino = {
				matrix: matrix,
				row: row,
				col: col,
				type: tetrominoType + 1
			};
			console.log("Next Tetromino:", tetromino);

			// If we can't place the new tetromino, game over
			if (!this.isValidMove(tetromino.matrix, tetromino.row, tetromino.col)) {
				// Force-place the losing piece so we can see the overlap in grey/white
				for (let y = 0; y < matrix.length; y++) {
					for (let x = 0; x < matrix[y].length; x++) {
						if (matrix[y][x]) {
							this.currentTetromino = null;
							const newY = row + y;
							const newX = col + x;
							if (newY >= 0 && newY < this.rows && newX >= 0 && newX < this.cols) {
								if (this.playfield[newY][newX] !== 0) {
									// Overlap => white
									this.playfield[newY][newX] = 9;
								} else {
									// Empty => grey
									this.playfield[newY][newX] = 8;
								}
								this.draw();
							}
						}
					}
				}
				this.gameOver = true;
				this.losingTetromino = tetromino;
				playerLost(this);
				return null;
			}
			return tetromino;
		}

		rotate(matrix) {
			// Transpose + reverse each row
			const transposed = matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
			return transposed.map(row => row.reverse());
		}

		updateLevelDisplay() {
			const level = this.getLevel();
			this.levelDisplay.textContent = `Level: ${level}`;
		}

		getLevel() {
			return Math.floor(this.linesCleared / 10) + 1;
		}

		updateDropInterval() {
			// Increase the speed at higher levels
			const level = this.getLevel();
			this.dropInterval = Math.max(1000 - (level - 1) * 100, 50);
		}

		isValidMove(matrix, row, col) {
			for (let y = 0; y < matrix.length; y++) {
				for (let x = 0; x < matrix[y].length; x++) {
					if (matrix[y][x]) {
						const newX = col + x;
						const newY = row + y;
						if (
							newX < 0 ||
							newX >= this.cols ||
							newY >= this.rows ||
							newY < 0 ||
							(newY >= 0 && this.playfield[newY][newX])
						) {
							return false;
						}
					}
				}
			}
			return true;
		}

		calculateScore(lines) {
			const lineScores = [0, 40, 100, 300, 1200];
			return lineScores[lines] || 0;
		}

		placeTetromino() {
			const placedPositions = [];
			for (let y = 0; y < this.currentTetromino.matrix.length; y++) {
				for (let x = 0; x < this.currentTetromino.matrix[y].length; x++) {
					if (this.currentTetromino.matrix[y][x]) {
						const newY = this.currentTetromino.row + y;
						const newX = this.currentTetromino.col + x;
						if (newY >= 0 && newY < this.rows && newX >= 0 && newX < this.cols) {
							this.playfield[newY][newX] = this.currentTetromino.type;
							placedPositions.push({ x: newX, y: newY, type: this.currentTetromino.type });
						}
					}
				}
			}

			this.lastPlacedPositions = placedPositions;

			// Check for completed lines
			let lines = 0;
			for (let y = this.rows - 1; y >= 0;) {
				if (this.playfield[y].every(value => value > 0)) {
					this.playfield.splice(y, 1);
					this.playfield.unshift(new Array(this.cols).fill(0));
					lines++;
				} else {
					y--;
				}
			}

			if (lines > 0) {
				this.linesCleared += lines;
				let points = this.calculateScore(lines);
				const level = this.getLevel();
				const multiplier = 1 + (level - 1) * 0.1;
				points = points * multiplier;

				this.score += points;

				// Update the displays
				this.scoreElement.textContent = 'Score: ' + this.score;
				this.linesElement.textContent = 'Lines: ' + this.linesCleared;
				this.updateLevelDisplay();
				this.updateDropInterval();
			}

			if (this.getLevel() >= 15) {
				this.currentTetromino = null;
				this.gameOver = true;
				playerLost(this);
				return;  // Stop here, no next tetromino
			}

			// Next tetromino
			this.currentTetromino = this.getNextTetromino();
		}

		update(time = 0) {
			if (this.gameOver) return;

			const deltaTime = time - this.lastTime;
			this.lastTime = time;
			this.dropCounter += deltaTime;

			if (this.dropCounter > this.dropInterval) {
				this.dropCounter = 0;
				if (this.currentTetromino &&
					this.isValidMove(this.currentTetromino.matrix, this.currentTetromino.row + 1, this.currentTetromino.col)) {
					this.currentTetromino.row++;
				} else {
					this.placeTetromino();
					if (this.gameOver) {
						return;
					}
				}
			}
			this.draw();
			requestAnimationFrame(this.update.bind(this));
		}

		draw() {
			this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

			// Draw placed blocks
			for (let y = 0; y < this.rows; y++) {
				for (let x = 0; x < this.cols; x++) {
					if (this.playfield[y][x]) {
						this.context.fillStyle = this.colors[this.playfield[y][x]];
						this.context.fillRect(
							x * this.grid,
							y * this.grid,
							this.grid - 1,
							this.grid - 1
						);
					}
				}
			}

			// Draw current falling tetromino
			if (this.currentTetromino) {
				for (let y = 0; y < this.currentTetromino.matrix.length; y++) {
					for (let x = 0; x < this.currentTetromino.matrix[y].length; x++) {
						if (this.currentTetromino.matrix[y][x]) {
							const drawY = this.currentTetromino.row + y;
							const drawX = this.currentTetromino.col + x;
							if (drawY >= 0) {
								this.context.fillStyle = this.colors[this.currentTetromino.type];
								this.context.fillRect(
									drawX * this.grid,
									drawY * this.grid,
									this.grid - 1,
									this.grid - 1
								);
							}
						}
					}
				}
			}

			// Draw grid lines (optional)
			this.context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
			this.context.lineWidth = 1;
			// Vertical lines
			for (let i = 1; i < this.cols; i++) {
				this.context.beginPath();
				this.context.moveTo(i * this.grid, 0);
				this.context.lineTo(i * this.grid, this.canvas.height);
				this.context.stroke();
			}
			// Horizontal lines
			for (let j = 1; j < this.rows; j++) {
				this.context.beginPath();
				this.context.moveTo(0, j * this.grid);
				this.context.lineTo(this.canvas.width, j * this.grid);
				this.context.stroke();
			}
		}

		moveLeft() {
			if (this.currentTetromino &&
				this.isValidMove(this.currentTetromino.matrix, this.currentTetromino.row, this.currentTetromino.col - 1)) {
				this.currentTetromino.col--;
				this.draw();
			}
		}

		moveRight() {
			if (this.currentTetromino &&
				this.isValidMove(this.currentTetromino.matrix, this.currentTetromino.row, this.currentTetromino.col + 1)) {
				this.currentTetromino.col++;
				this.draw();
			}
		}

		moveDown() {
			if (this.currentTetromino &&
				this.isValidMove(this.currentTetromino.matrix, this.currentTetromino.row + 1, this.currentTetromino.col)) {
				this.currentTetromino.row++;
				this.dropCounter = 0;
				this.draw();
			}
		}

		rotatePiece() {
			if (!this.currentTetromino) return;
			const rotatedMatrix = this.rotate(this.currentTetromino.matrix);
			if (this.isValidMove(rotatedMatrix, this.currentTetromino.row, this.currentTetromino.col)) {
				this.currentTetromino.matrix = rotatedMatrix;
				this.draw();
			}
		}

		startKeyRepeat(direction) {
			if (!this.keysState[direction].pressed) return;
			this.stopKeyRepeat(direction);

			this.keysState[direction].timeout = setTimeout(() => {
				this.keysState[direction].interval = setInterval(() => {
					if (!this.keysState[direction].pressed) {
						this.stopKeyRepeat(direction);
						return;
					}
					this.triggerMove(direction);
				}, this.repeatInterval);
			}, this.initialDelay);
		}

		stopKeyRepeat(direction) {
			if (this.keysState[direction].timeout) {
				clearTimeout(this.keysState[direction].timeout);
				this.keysState[direction].timeout = null;
			}
			if (this.keysState[direction].interval) {
				clearInterval(this.keysState[direction].interval);
				this.keysState[direction].interval = null;
			}
		}

		triggerMove(direction) {
			if (direction === 'left') this.moveLeft();
			if (direction === 'right') this.moveRight();
			if (direction === 'down') this.moveDown();
		}

		handleKeyDown(e) {
			if (this.gameOver || !this.currentTetromino) return;

			if (e.key === this.controls.left) {
				if (!this.keysState.left.pressed) {
					this.keysState.left.pressed = true;
					this.moveLeft();
					this.startKeyRepeat('left');
				}
				e.preventDefault();
			}
			else if (e.key === this.controls.right) {
				if (!this.keysState.right.pressed) {
					this.keysState.right.pressed = true;
					this.moveRight();
					this.startKeyRepeat('right');
				}
				e.preventDefault();
			}
			else if (e.key === this.controls.down) {
				if (!this.keysState.down.pressed) {
					this.keysState.down.pressed = true;
					this.moveDown();
					this.startKeyRepeat('down');
				}
				e.preventDefault();
			}
			else if (e.key === this.controls.rotate) {
				this.rotatePiece();
				e.preventDefault();
			}
		}

		handleKeyUp(e) {
			if (e.key === this.controls.left && this.keysState.left.pressed) {
				this.keysState.left.pressed = false;
				this.stopKeyRepeat('left');
			}
			else if (e.key === this.controls.right && this.keysState.right.pressed) {
				this.keysState.right.pressed = false;
				this.stopKeyRepeat('right');
			}
			else if (e.key === this.controls.down && this.keysState.down.pressed) {
				this.keysState.down.pressed = false;
				this.stopKeyRepeat('down');
			}
		}

		finalizeLosingBoard() {
			console.log(`Finalizing losing board for player: ${this.name}`);
			// Turn all existing placed blocks to grey
			for (let y = 0; y < this.rows; y++) {
				for (let x = 0; x < this.cols; x++) {
					if (this.playfield[y][x] > 0 && this.playfield[y][x] < 9) {
						this.playfield[y][x] = 8; // grey
					}
				}
			}

			this.draw();
		}
	}

	// Create a main container for all games
	const mainContainer = document.createElement('div');
	mainContainer.id = 'content';
	document.body.appendChild(mainContainer);

	// Initialize each player
	playerConfigs.forEach((config, index) => {
		const container = document.createElement('div');
		container.classList.add('game-container');
		container.id = `player${index + 1}`;

		const playerNameEl = document.createElement('div');
		playerNameEl.classList.add('player-name');
		playerNameEl.textContent = config.name;
		container.appendChild(playerNameEl);

		mainContainer.appendChild(container);

		const gameInstance = new TetrisGame(`player${index + 1}`, config.controls, config.name);
		games[index] = gameInstance;
		console.log(`Initialized game for ${config.name}`);
	});

	// Called when a player loses
	function playerLost(gameInstance) {
		playersDeadCount++;
		gameInstance.finalizeLosingBoard();

		// Single-player game => show scoreboard immediately
		if (totalPlayers === 1) {
			showFinalScoreboard();
		}
		else {
			// Multi-player => wait until all players are dead
			if (playersDeadCount === totalPlayers) {
				showFinalScoreboard();
			}
		}
	}

	function showFinalScoreboard() {
		// Sort players by score
		const sortedPlayers = games.slice().sort((a, b) => b.score - a.score);

		const scoreboardContainer = document.createElement('div');
		scoreboardContainer.classList.add('scoreboard-overlay');

		const title = document.createElement('div');
		title.classList.add('scoreboard-title');
		title.textContent = 'Game Over! Final Scores';
		scoreboardContainer.appendChild(title);

		sortedPlayers.forEach((player, rank) => {
			const entry = document.createElement('div');
			entry.classList.add('scoreboard-entry');
			entry.textContent = `${rank + 1}. ${player.name}: ${player.score} (Lines: ${player.linesCleared})`;
			scoreboardContainer.appendChild(entry);
		});

		// Append the scoreboard overlay to body
		document.body.appendChild(scoreboardContainer);

		// Prepare data to send to backend
		const gameData = sortedPlayers.map(player => ({
			gameid: game_id,
			name: player.name,
			score: player.score,
			lines_cleared: player.linesCleared,
			level: player.getLevel(), // Ensure getLevel is accessible or pass level separately
		}));

		// Send data to backend
		sendGameDataToBackend(gameData);
	}

	function sendGameDataToBackend(gameData) {
		fetch('/api/save-tetris-scores/', { // Ensure this URL matches your Django endpoint
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCookie('csrftoken'), // Handle CSRF token
			},
			body: JSON.stringify({ players: gameData }),
		})
			.then(response => {
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}
				return response.json();
			})
			.then(data => {
				console.log('Game data successfully sent to backend:', data);
			})
			.catch((error) => {
				console.error('Error sending game data:', error);
			});
	}

	// Helper function to get CSRF token from cookies
	function getCookie(name) {
		let cookieValue = null;
		if (document.cookie && document.cookie !== '') {
			const cookies = document.cookie.split(';');
			for (let cookie of cookies) {
				cookie = cookie.trim();
				// Does this cookie string begin with the name we want?
				if (cookie.startsWith(name + '=')) {
					cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
					break;
				}
			}
		}
		return cookieValue;
	}

	// Global key events for all Tetris games
	document.addEventListener('keydown', function (e) {
		games.forEach(game => {
			if (
				e.key === game.controls.left ||
				e.key === game.controls.right ||
				e.key === game.controls.down ||
				e.key === game.controls.rotate
			) {
				game.handleKeyDown(e);
			}
		});
	});

	document.addEventListener('keyup', function (e) {
		games.forEach(game => {
			if (
				e.key === game.controls.left ||
				e.key === game.controls.right ||
				e.key === game.controls.down ||
				e.key === game.controls.rotate
			) {
				game.handleKeyUp(e);
			}
		});
	});
}

function cleanupTetris() {
	const container = document.getElementById('tetris-main-container');
	if (container) {
		// Assuming you have stored your game instances in a global "games" array:
		if (games && games.length) {
			games.forEach(game => game.destroy());
		}
		container.remove();
		// Clear the global games array to avoid referencing the destroyed games.
		games = [];
	}
}

// TETRIS JAVASCRIPT END

// all of our code is wrapped in async because we want to be able to use `await`
(async () => {
	let code;

	try {
		code = extractLoginCodeFromURL();
	} catch (exception) {
		console.log(exception);
		redirectToIntra();
		return;
	}
	const JWTs = await login(code);
	console.log(JWTs.access);
})();

window.addEventListener("popstate", router);

document.addEventListener("DOMContentLoaded", () => {
	document.body.addEventListener("click", e => {
		if (e.target.matches("[data-link]")) {
			e.preventDefault();
			navigateTo(e.target.href);
		}
	});
	router();
});

// PONG JAVASCRIPT START

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

		this.rounds = [5, 5, 3, 3, 2];
		this.colors = ['#1abc9c', '#2ecc71', '#3498db', '#e74c3c', '#9b59b6'];

		// Default game properties
		this.running = this.over = false;
		this.timer = this.round = 0;
		this.color = '#2c3e50';
	}

	createBall(incrementedSpeed) {
		return {
			width: 18,
			height: 18,
			x: (this.pongCanvas.width / 2) - 9,
			y: (this.pongCanvas.height / 2) - 9,
			moveX: this.DIRECTION.IDLE,
			moveY: this.DIRECTION.IDLE,
			speed: incrementedSpeed || 9
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
			'Round ' + (this.round + 1), this.pongCanvas.width / 2, 35
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
		// End game screen
		this.context.font = '50px Courier New';
		this.context.fillStyle = this.color;
		this.context.fillRect(this.pongCanvas.width / 2 - 350, this.pongCanvas.height / 2 - 48, 700, 100);
		this.context.fillStyle = '#ffffff';
		this.context.fillText(text, this.pongCanvas.width / 2, this.pongCanvas.height / 2 + 15);
		setTimeout(() => { this.reset(); this.initialize(); }, 3000);
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
				}
			}

			if (this.ball.x - this.ball.width <= this.paddle.x && this.ball.x >= this.paddle.x - this.paddle.width) {
				if (this.ball.y <= this.paddle.y + this.paddle.height && this.ball.y + this.ball.height >= this.paddle.y) {
					this.ball.x = (this.paddle.x - this.ball.width);
					this.ball.moveX = this.DIRECTION.LEFT;
				}
			}
		}

		if (this.player.score === this.rounds[this.round]) {
			if (!this.rounds[this.round + 1]) {
				this.over = true;
				setTimeout(() => { this.endGameMenu('Winner!'); }, 1000);
			} else {
				this.color = this._generateRoundColor();
				this.player.score = this.paddle.score = 0;
				this.player.speed += 0.5;
				this.paddle.speed += 1;
				this.ball.speed += 1;
				this.round += 1;
			}
		}
		else if (this.paddle.score === this.rounds[this.round]) {
			this.over = true;
			setTimeout(() => { this.endGameMenu('Game Over!'); }, 1000);
		}
	}

	loop() {
		this.update();
		this.draw();

		if (!this.over) requestAnimationFrame(() => this.loop());
	}

	listen() {
		document.addEventListener('keydown', (event) => {
			if (!this.running) {
				this.running = true;
				window.requestAnimationFrame(() => this.loop());
			}
			if (event.keyCode === 38 || event.keyCode === 87) this.player.move = this.DIRECTION.UP;
			if (event.keyCode === 40 || event.keyCode === 83) this.player.move = this.DIRECTION.DOWN;
		});

		document.addEventListener('keyup', (event) => {
			this.player.move = this.DIRECTION.IDLE;
		});
	}

	initialize() {
		this.player = this.createPaddle('left');
		this.paddle = this.createPaddle('right');
		this.ball = this.createBall();
		this.paddle.speed = 8;
		this.turn = this.paddle;

		this.menu();
		this.listen();
	}

	_resetTurn(victor, loser) {
		this.ball = this.createBall(this.ball.speed);
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
};
