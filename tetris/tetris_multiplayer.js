function launchTetrisGame(playerConfigs) {
    console.log("launchTetrisGame called with:", playerConfigs);
    
    // Create and inject styles
    const style = document.createElement('style');
    style.textContent = `
        .game-container {
            display: inline-block;
            margin: 10px;
            vertical-align: top;
            font-family: Arial, sans-serif;
        }
        .score, .level {
            font-size: 20px;
            margin-top: 10px;
        }
        body {
            background-color: #f0f0f0;
            text-align: center;
            padding-top: 20px;
        }
        .player-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
    `;
    document.head.appendChild(style);

    class TetrisGame {
        constructor(containerId, controls) {
            console.log(`Initializing TetrisGame for container: ${containerId}`);
            this.container = document.getElementById(containerId);

            this.canvas = document.createElement('canvas');
            this.canvas.width = 200;
            this.canvas.height = 440;
            this.canvas.style.border = '1px solid black';
            this.canvas.style.backgroundColor = '#eee';
            this.context = this.canvas.getContext('2d');
            this.container.appendChild(this.canvas);

            // Initialize game state
            this.score = 0;
            this.linesCleared = 0;
            this.gameOver = false;
            this.grid = 20;
            this.rows = 22;
            this.cols = 10;
            this.dropCounter = 0;
            this.dropInterval = 1000;
            this.lastTime = 0;
            this.tetrominoSequence = [];
            this.controls = controls;

            // Key states for handling continuous movement
            this.keysState = {
                left: { pressed: false, timeout: null, interval: null },
                right: { pressed: false, timeout: null, interval: null },
                down: { pressed: false, timeout: null, interval: null },
                rotate: { pressed: false, timeout: null, interval: null }
            };
            this.initialDelay = 750;
            this.repeatInterval = 50;

            // Display elements
            this.scoreElement = document.createElement('div');
            this.scoreElement.classList.add('score');
            this.scoreElement.textContent = 'Score: ' + this.score;
            this.container.appendChild(this.scoreElement);

            this.levelDisplay = document.createElement('div');
            this.levelDisplay.classList.add('level');
            this.updateLevelDisplay();
            this.container.appendChild(this.levelDisplay);

            // Initialize playfield
            this.playfield = [];
            for (let row = 0; row < this.rows; row++) {
                this.playfield[row] = [];
                for (let col = 0; col < this.cols; col++) {
                    this.playfield[row][col] = 0;
                }
            }

            // Tetromino definitions
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
                'cyan', 'yellow', 'purple', 'green', 'red', 'blue', 'orange'
            ];

            this.currentTetromino = this.getNextTetromino();
            this.update();
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
                this.gameOver = true;
                this.draw();
                alert("Game Over!");
                return null;
            }
            return tetromino;
        }

        rotate(matrix) {
            const transposed = matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
            return transposed.map(row => row.reverse());
        }

        updateLevelDisplay() {
            const level = Math.floor(this.linesCleared / 10) + 1;
            this.levelDisplay.textContent = `Level: ${level}`;
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
            for (let y = 0; y < this.currentTetromino.matrix.length; y++) {
                for (let x = 0; x < this.currentTetromino.matrix[y].length; x++) {
                    if (this.currentTetromino.matrix[y][x]) {
                        const newY = this.currentTetromino.row + y;
                        const newX = this.currentTetromino.col + x;
                        if (newY >= 0 && newY < this.rows && newX >= 0 && newX < this.cols) {
                            this.playfield[newY][newX] = this.currentTetromino.type;
                        }
                    }
                }
            }
            let lines = 0;
            for (let y = this.rows - 1; y >= 0; ) {
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
                // Calculate base points
                let points = this.calculateScore(lines);

                // Apply level-based multiplier
                const level = Math.floor(this.linesCleared / 10) + 1;
                const multiplier = 1 + (level - 1) * 0.1; // starts at 1 for level 1, 1.1 for level 2, etc.
                points = points * multiplier;

                this.score += points;
                this.scoreElement.textContent = 'Score: ' + this.score;

                if (this.linesCleared % 10 === 0 && this.dropInterval > 200) {
                    this.dropInterval -= 100;
                }
                this.updateLevelDisplay();
            }

            this.currentTetromino = this.getNextTetromino();
        }

        update(time = 0) {
            if (this.gameOver) return;

            const deltaTime = time - this.lastTime;
            this.lastTime = time;
            this.dropCounter += deltaTime;
            if (this.dropCounter > this.dropInterval) {
                this.dropCounter = 0;
                if (this.currentTetromino && this.isValidMove(this.currentTetromino.matrix, this.currentTetromino.row + 1,
                    this.currentTetromino.col)) {
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
        }

        // Immediate movement action
        moveLeft() {
            if (this.currentTetromino && this.isValidMove(this.currentTetromino.matrix, this.currentTetromino.row, this.currentTetromino.col - 1)) {
                this.currentTetromino.col--;
                this.draw();
            }
        }

        moveRight() {
            if (this.currentTetromino && this.isValidMove(this.currentTetromino.matrix, this.currentTetromino.row, this.currentTetromino.col + 1)) {
                this.currentTetromino.col++;
                this.draw();
            }
        }

        moveDown() {
            if (this.currentTetromino && this.isValidMove(this.currentTetromino.matrix, this.currentTetromino.row + 1, this.currentTetromino.col)) {
                this.currentTetromino.row++;
                this.dropCounter = 0;
                this.draw();
            }
        }

        rotatePiece() {
            if (this.currentTetromino) {
                const rotatedMatrix = this.rotate(this.currentTetromino.matrix);
                if (this.isValidMove(rotatedMatrix, this.currentTetromino.row, this.currentTetromino.col)) {
                    this.currentTetromino.matrix = rotatedMatrix;
                    this.draw();
                }
            }
        }

        // Start auto-repeat after initial delay
        startKeyRepeat(direction) {
            if (!this.keysState[direction].pressed) return;

            // Clear any existing intervals (shouldn't be any if managed well)
            this.stopKeyRepeat(direction);

            this.keysState[direction].timeout = setTimeout(() => {
                // Start repeating movement
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

            // Check which direction this key corresponds to
            if (e.key === this.controls.left) {
                if (!this.keysState.left.pressed) {
                    this.keysState.left.pressed = true;
                    this.moveLeft(); // immediate move
                    this.startKeyRepeat('left');
                }
                e.preventDefault();
            } else if (e.key === this.controls.right) {
                if (!this.keysState.right.pressed) {
                    this.keysState.right.pressed = true;
                    this.moveRight(); // immediate move
                    this.startKeyRepeat('right');
                }
                e.preventDefault();
            } else if (e.key === this.controls.down) {
                if (!this.keysState.down.pressed) {
                    this.keysState.down.pressed = true;
                    this.moveDown(); // immediate move
                    this.startKeyRepeat('down');
                }
                e.preventDefault();
            } else if (e.key === this.controls.rotate) {
                // Rotate does not auto-repeat (typical Tetris behavior)
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
            // Rotate key up does nothing special
        }
    }

    // Create a main container for all games
    const mainContainer = document.createElement('div');
    mainContainer.id = 'tetris-main-container';
    document.body.appendChild(mainContainer);

    const games = [];

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

        games[index] = new TetrisGame(`player${index + 1}`, config.controls);
        console.log(`Initialized game for ${config.name}`);
    });

    // Global event listeners
    document.addEventListener('keydown', function(e) {
        games.forEach(game => {
            // Check if this key is relevant to the game
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
