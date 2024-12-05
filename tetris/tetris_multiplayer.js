// Ensure the script runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
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
    `;
    document.head.appendChild(style);

    class TetrisGame {
        constructor(containerId, controls) {
            // Create game container
            this.container = document.getElementById(containerId);

            // Create canvas
            this.canvas = document.createElement('canvas');
            this.canvas.width = 200;
            this.canvas.height = 440; // Increased to accommodate score and level
            this.canvas.style.border = '1px solid black';
            this.canvas.style.backgroundColor = '#eee';
            this.context = this.canvas.getContext('2d');
            this.container.appendChild(this.canvas);

            // Initialize game variables
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

            // Controls
            this.controls = controls;

            // Score display
            this.scoreElement = document.createElement('div');
            this.scoreElement.classList.add('score');
            this.scoreElement.textContent = 'Score: ' + this.score;
            this.container.appendChild(this.scoreElement);

            // Level display
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

            // Tetrominoes and colors
            this.tetrominoes = [
                [[1], [1], [1], [1]],      // I
                [[2, 2], [2, 2]],          // O
                [[0, 3, 0], [3, 3, 3]],    // T
                [[0, 4, 4], [4, 4, 0]],    // S
                [[5, 5, 0], [0, 5, 5]],    // Z
                [[6, 0, 0], [6, 6, 6]],    // J
                [[0, 0, 7], [7, 7, 7]]     // L
            ];

            this.colors = [
                null,
                'cyan', 'yellow', 'purple', 'green', 'red', 'blue', 'orange'
            ];

            // Get the first tetromino
            this.currentTetromino = this.getNextTetromino();

            // Start the game loop
            this.update();
        }

        generateSequence() {
            const sequence = [0, 1, 2, 3, 4, 5, 6];
            while (sequence.length) {
                const rand = Math.floor(Math.random() * sequence.length);
                const piece = sequence.splice(rand, 1)[0];
                this.tetrominoSequence.push(piece);
            }
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
            if (!this.isValidMove(tetromino.matrix, tetromino.row, tetromino.col)) {
                this.gameOver = true;
                this.draw(); // To display the last state
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
            return lineScores[lines];
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
                const points = this.calculateScore(lines);
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
            if (this.gameOver) {
                return;
            }
            const deltaTime = time - this.lastTime;
            this.lastTime = time;
            this.dropCounter += deltaTime;
            if (this.dropCounter > this.dropInterval) {
                this.dropCounter = 0;
                if (this.isValidMove(this.currentTetromino.matrix, this.currentTetromino.row + 1, this.currentTetromino.col)) {
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
            // Clear canvas
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw playfield
            for (let y = 0; y < this.rows; y++) {
                for (let x = 0; x < this.cols; x++) {
                    if (this.playfield[y][x]) {
                        this.context.fillStyle = this.colors[this.playfield[y][x]];
                        this.context.fillRect(x * this.grid, y * this.grid, this.grid - 1, this.grid - 1);
                    }
                }
            }

            // Draw current tetromino
            if (this.currentTetromino) {
                for (let y = 0; y < this.currentTetromino.matrix.length; y++) {
                    for (let x = 0; x < this.currentTetromino.matrix[y].length; x++) {
                        if (this.currentTetromino.matrix[y][x]) {
                            const drawY = this.currentTetromino.row + y;
                            const drawX = this.currentTetromino.col + x;
                            if (drawY >= 0) { // Don't draw above the playfield
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

        handleKeyPress(e) {
            if (this.gameOver || !this.currentTetromino) return;

            if (e.key === this.controls.left) {
                const newCol = this.currentTetromino.col - 1;
                if (this.isValidMove(this.currentTetromino.matrix, this.currentTetromino.row, newCol)) {
                    this.currentTetromino.col = newCol;
                    this.draw();
                }
            } else if (e.key === this.controls.right) {
                const newCol = this.currentTetromino.col + 1;
                if (this.isValidMove(this.currentTetromino.matrix, this.currentTetromino.row, newCol)) {
                    this.currentTetromino.col = newCol;
                    this.draw();
                }
            } else if (e.key === this.controls.down) {
                const newRow = this.currentTetromino.row + 1;
                if (this.isValidMove(this.currentTetromino.matrix, newRow, this.currentTetromino.col)) {
                    this.currentTetromino.row = newRow;
                    this.dropCounter = 0; // Reset drop counter for faster drop
                    this.draw();
                }
            } else if (e.key === this.controls.rotate) {
                const rotatedMatrix = this.rotate(this.currentTetromino.matrix);
                if (this.isValidMove(rotatedMatrix, this.currentTetromino.row, this.currentTetromino.col)) {
                    this.currentTetromino.matrix = rotatedMatrix;
                    this.draw();
                }
            }
        }
    }

    // Key mappings for each player
    const playerControls = [
        // Player 1 Controls: Arrow Keys
        {
            left: 'ArrowLeft',
            right: 'ArrowRight',
            down: 'ArrowDown',
            rotate: 'ArrowUp'
        },
        // Player 2 Controls: WASD
        {
            left: 'a',
            right: 'd',
            down: 's',
            rotate: 'w'
        },
        // Player 3 Controls: IJKL
        {
            left: 'j',
            right: 'l',
            down: 'k',
            rotate: 'i'
        }
    ];

    // Create a main container for all games
    const mainContainer = document.createElement('div');
    mainContainer.id = 'tetris-main-container';
    document.body.appendChild(mainContainer);

    // Create game containers and initialize games
    const games = [];
    for (let i = 0; i < playerControls.length; i++) {
        const container = document.createElement('div');
        container.classList.add('game-container');
        container.id = `player${i + 1}`;
        mainContainer.appendChild(container);
        games[i] = new TetrisGame(`player${i + 1}`, playerControls[i]);
    }

    // Global keydown event listener
    document.addEventListener('keydown', function(e) {
        // Prevent default behavior for controlled keys to avoid scrolling
        games.forEach(game => {
            if (
                e.key === game.controls.left ||
                e.key === game.controls.right ||
                e.key === game.controls.down ||
                e.key === game.controls.rotate
            ) {
                e.preventDefault();
            }
        });

        games.forEach(game => game.handleKeyPress(e));
    });
});
