// -----------------------------------------------------------------------------
// Function to launch a custom two-player Tetris game
// -----------------------------------------------------------------------------
async function launchCustomTetrisGameTwoPlayer(jwtTokens, tournament = false, ranked = false) {
    const playerConfigs = [
        {
            user: jwtTokens[0], // Token for player 1
            controls: {
                left: "a",       // Move left
                right: "d",      // Move right
                down: "s",       // Move down
                rotate: "w"      // Rotate piece
            },
            name: "Player 1"
        },
        {
            user: jwtTokens[1], // Token for player 2
            controls: {
                left: "ArrowLeft",   // Move left
                right: "ArrowRight", // Move right
                down: "ArrowDown",   // Move down
                rotate: "ArrowUp"    // Rotate piece
            },
            name: "Player 2"
        }
    ];

    const matchConfig = {
        ranked: ranked,
        tournament: tournament
    };

    tetrisActive = true;
    await launchTetrisGame(playerConfigs, matchConfig);
}

// -----------------------------------------------------------------------------
// Other helper functions (addPlayer, awaitingPupperResponse, searching_for_game_match, etc.)
// -----------------------------------------------------------------------------
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
            if (response.status === "failed") {
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
    if (gameName != "tetris" && gameName != "pong") {
        console.error("wrong game name sent to function searching for game");
        return;
    }
    const response = await apiRequest('/tetris/next-match', 'GET', JWTs, null);
    console.log(response);
    if (response) {
        console.log(response.player2);
        console.log(response.player1);
    }
    if (!response || !response.player1?.trim() || !response.player2?.trim()) return;

    const puppetToken = await awaitingPupperResponse(response.player2);
    console.log("PRINTING PUPPET TOKEN", puppetToken);
    if (puppetToken && puppetToken.status == 401) return;
    console.log(await apiRequest("/me", "GET", puppetToken.value, null));
    console.log("LAUNCHING TETRIS GAME ", JWTs, puppetToken.value);
    if (gameName == "tetris") {
        await launchCustomTetrisGameTwoPlayer([JWTs, puppetToken.value], false, true);
    }
    console.log(puppetToken);
}

async function startTetrisGame() {
    const matchConfig = {
        tournament: false,
        ranked: false,
    };
    const playerConfigs = [
        {
            user: JWTs,
            controls: {
                left: 'ArrowLeft',
                right: 'ArrowRight',
                down: 'ArrowDown',
                rotate: 'ArrowUp'
            },
            name: "Player"
        }
    ];
    await launchTetrisGame(playerConfigs, matchConfig);
}

// -----------------------------------------------------------------------------
// Main function to launch a Tetris game for the provided players
// -----------------------------------------------------------------------------
async function launchTetrisGame(playerConfigs, matchConfig) {
    GlobalMatchConfig = matchConfig;
    let game_id = generateGameId();
    console.log("launchTetrisGame called with:", playerConfigs);

    const totalPlayers = playerConfigs.length;
    let playersDeadCount = 0;
    let games = [];

    function generateGameId() {
        return `${Date.now()}`;
    }

    // Append game styles
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
            color: black;
        }
        body {
            text-align: center;
            padding-top: 20px;
        }
        .player-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
            color: black;
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
            color: black;
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

    // Create the main container for games
    const mainContainer = document.createElement('div');
    mainContainer.id = 'tetris-main-container';
    const contentElement = document.getElementById("content");
    contentElement.appendChild(mainContainer);

    // Define onGameOver callback function
    const playerLost = async () => {
        playersDeadCount++;
        // Optionally, call a function like finalizeLosingBoard() if needed.
        if (totalPlayers === 1 || playersDeadCount === totalPlayers) {
            await showFinalScoreboard();
        }
    };

    // Create each player's game instance
    for (let index = 0; index < playerConfigs.length; index++) {
        const config = playerConfigs[index];
        const container = document.createElement('div');
        container.classList.add('game-container');
        container.id = `player${index + 1}`;

        const playerNameEl = document.createElement('div');
        console.log("printing the token off ", config.user);
        const data = await apiRequest("/me", "GET", config.user, null);
        console.log(data);
        playerNameEl.classList.add('player-name');
        playerNameEl.textContent = data.username;
        container.appendChild(playerNameEl);

        mainContainer.appendChild(container);

        // Pass the onGameOver callback to the TetrisGame instance.
        const gameInstance = new TetrisGame(`player${index + 1}`, config.controls, config.name, playerLost);
        gameInstance.user = config.user;  // attach the JWT token as a property
        games[index] = gameInstance;
        console.log(`Initialized game for ${config.name}`);
    }

	async function showFinalScoreboard() {
		// Finalize every game board so all tetrominoes become gray (or white where needed)
		games.forEach(game => game.finalizeLosingBoard());

		// Build the scoreboard UI
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
		
		// Create and add a close button
		const closeButton = document.createElement('button');
		closeButton.textContent = 'Close';
		closeButton.style.marginTop = '10px';
		closeButton.style.padding = '10px 20px';
		closeButton.style.fontSize = '16px';
		closeButton.addEventListener('click', () => {
			// Remove the scoreboard overlay from the document
			document.body.removeChild(scoreboardContainer);
		});
		scoreboardContainer.appendChild(closeButton);

		document.body.appendChild(scoreboardContainer);

		// Send each player's data as a separate API call.
		for (const player of sortedPlayers) {
			const payload = {
				ranked: GlobalMatchConfig.ranked,
				is_tournament: GlobalMatchConfig.tournament,
				gameid: game_id,
				score: player.score,
				lines_cleared: player.linesCleared,
				level: player.getLevel(),
			};
			await sendGameDataToBackend(payload, player.user);
		}
	}

    async function sendGameDataToBackend(playerData, playerJWT) {
        try {
            console.log(playerData);
            console.log("sending data");
            const data = await apiRequest("/tetris/save_tetris_scores", "POST", playerJWT, playerData);
            if (data.error) {
                throw new Error(`Server error: ${data.error}`);
            }
            console.log("Score processed successfully:", data);
        } catch (error) {
            console.error("Error processing score:", error);
        }
    }

    // Global key event listeners for all games.
    document.addEventListener('keydown', function(e) {
        if (!tetrisActive) return;
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

    document.addEventListener('keyup', function(e) {
        if (!tetrisActive) return;
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

// -----------------------------------------------------------------------------
// TetrisGame class with onGameOver callback support
// -----------------------------------------------------------------------------
class TetrisGame {
    constructor(containerId, controls, name, onGameOver = null) {
        console.log(`Initializing TetrisGame for container: ${containerId}`);
        this.container = document.getElementById(containerId);
        this.name = name;
        this.onGameOver = onGameOver; // Store the callback

        this.canvas = document.createElement('canvas');
        this.canvas.width = 200;
        this.canvas.height = 440;
        this.canvas.style.border = '2px solid white';
        this.canvas.style.backgroundColor = 'black';
        this.context = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.score = 0;
        this.linesCleared = 0;
        this.gameOver = false;
        this.losingTetromino = null;
        this.lastPlacedPositions = [];
        this.grid = 20;
        this.rows = 22;
        this.cols = 10;
        this.dropCounter = 0;
        this.lastTime = 0;
        this.dropInterval = 1000; 

        this.tetrominoSequence = [];
        this.controls = controls;
        this.keysState = {
            left: { pressed: false, timeout: null, interval: null },
            right: { pressed: false, timeout: null, interval: null },
            down: { pressed: false, timeout: null, interval: null },
            rotate: { pressed: false, timeout: null, interval: null }
        };
        this.initialDelay = 300;
        this.repeatInterval = 50;

        this.scoreElement = document.createElement('div');
        this.scoreElement.classList.add('score');
        this.scoreElement.textContent = 'Score: ' + this.score;
        this.container.appendChild(this.scoreElement);

        this.linesElement = document.createElement('div');
        this.linesElement.classList.add('lines');
        this.linesElement.textContent = 'Lines: ' + this.linesCleared;
        this.container.appendChild(this.linesElement);

        this.levelDisplay = document.createElement('div');
        this.levelDisplay.classList.add('level');
        this.updateLevelDisplay();
        this.container.appendChild(this.levelDisplay);

        this.playfield = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));

        this.tetrominoes = [
            [[1],[1],[1],[1]],     // I
            [[2,2],[2,2]],         // O
            [[0,3,0],[3,3,3]],     // T
            [[0,4,4],[4,4,0]],     // S
            [[5,5,0],[0,5,5]],     // Z
            [[6,0,0],[6,6,6]],     // J
            [[0,0,7],[7,7,7]]      // L
        ];

        this.colors = [
            null,
            'cyan', 'yellow', 'purple', 'green', 'red', 'blue', 'orange',
            'grey', 'white'
        ];

        this.currentTetromino = this.getNextTetromino();
        this.update();
    }

    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        for (const key in this.keysState) {
            this.stopKeyRepeat(key);
        }
        console.log(`Destroyed game for ${this.name}`);
    }

    generateSequence() {
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
        if (!this.isValidMove(tetromino.matrix, tetromino.row, tetromino.col)) {
            for (let y = 0; y < matrix.length; y++) {
                for (let x = 0; x < matrix[y].length; x++) {
                    if (matrix[y][x]) {
                        this.currentTetromino = null;
                        const newY = row + y;
                        const newX = col + x;
                        if (newY >= 0 && newY < this.rows && newX >= 0 && newX < this.cols) {
                            this.playfield[newY][newX] = (this.playfield[newY][newX] !== 0) ? 9 : 8;
                            this.draw();
                        }
                    }
                }
            }
            this.gameOver = true;
			this.currentTetromino = null;
            this.losingTetromino = tetromino;
            if (this.onGameOver) this.onGameOver();
            return null;
        }
        return tetromino;
    }

    rotate(matrix) {
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

            this.scoreElement.textContent = 'Score: ' + this.score;
            this.linesElement.textContent = 'Lines: ' + this.linesCleared;
            this.updateLevelDisplay();
            this.updateDropInterval();
        }

        if (this.getLevel() >= 15) {
            this.currentTetromino = null;
            this.gameOver = true;
            if (this.onGameOver) this.onGameOver();
            return;
        }

        this.currentTetromino = this.getNextTetromino();
    }

    update(time = 0) {
		if (!tetrisActive) return;
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
                if (this.gameOver) return;
            }
        }
        this.draw();
        requestAnimationFrame(this.update.bind(this));
    }

    draw() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the playfield
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

        // Draw the current tetromino
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

        // Draw grid lines for clarity
        this.context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.context.lineWidth = 1;
        for (let i = 1; i < this.cols; i++) {
            this.context.beginPath();
            this.context.moveTo(i * this.grid, 0);
            this.context.lineTo(i * this.grid, this.canvas.height);
            this.context.stroke();
        }
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
        } else if (e.key === this.controls.right) {
            if (!this.keysState.right.pressed) {
                this.keysState.right.pressed = true;
                this.moveRight();
                this.startKeyRepeat('right');
            }
            e.preventDefault();
        } else if (e.key === this.controls.down) {
            if (!this.keysState.down.pressed) {
                this.keysState.down.pressed = true;
                this.moveDown();
                this.startKeyRepeat('down');
            }
            e.preventDefault();
        } else if (e.key === this.controls.rotate) {
            this.rotatePiece();
            e.preventDefault();
        }
    }

    handleKeyUp(e) {
        if (e.key === this.controls.left && this.keysState.left.pressed) {
            this.keysState.left.pressed = false;
            this.stopKeyRepeat('left');
        } else if (e.key === this.controls.right && this.keysState.right.pressed) {
            this.keysState.right.pressed = false;
            this.stopKeyRepeat('right');
        } else if (e.key === this.controls.down && this.keysState.down.pressed) {
            this.keysState.down.pressed = false;
            this.stopKeyRepeat('down');
        }
    }

    finalizeLosingBoard() {
		if (!tetrisActive) return;
        console.log(`Finalizing losing board for player: ${this.name}`);
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.playfield[y][x] > 0 && this.playfield[y][x] < 9) {
                    this.playfield[y][x] = 8; // grey out the board
                }
            }
        }
        this.draw();
    }
}
