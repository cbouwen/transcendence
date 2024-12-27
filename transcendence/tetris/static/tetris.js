const canvas = document.createElement('canvas');
canvas.id = 'gameCanvas';
canvas.width = 200;
canvas.height = 400;
canvas.style.border = '1px solid black';
canvas.style.backgroundColor = '#eee';
document.body.appendChild(canvas);
let score = 0;
let linesCleared = 0;

const scoreElement = document.createElement('div');
scoreElement.id = 'score';
scoreElement.style.fontFamily = 'Arial, sans-serif';
scoreElement.style.fontSize = '20px';
scoreElement.style.marginTop = '10px';
scoreElement.textContent = 'Score: ' + score;
document.body.appendChild(scoreElement);

const levelDisplay = document.createElement('div');
levelDisplay.style.fontFamily = 'Arial, sans-serif';
levelDisplay.style.fontSize = '20px';
levelDisplay.style.marginTop = '10px';
document.body.appendChild(levelDisplay);

const context = canvas.getContext('2d');

const grid = 20;
const tetrominoes = [
    [[1], [1], [1], [1]], 		// I
    [[2, 2], [2, 2]],			// O
    [[0, 3, 0], [3, 3, 3]], 	// T
    [[0, 4, 4], [4, 4, 0]], 	// S
    [[5, 5, 0], [0, 5, 5]], 	// Z
    [[6, 0, 0], [6, 6, 6]], 	// J
    [[0, 0, 7], [7, 7, 7]]  	// L
];

const colors =
[
    null,
    'cyan', 'yellow', 'purple', 'green', 'red', 'blue', 'orange'
];

const rows = 22;
const cols = 10;
let playfield = [];

for (let row = 0; row < rows; row++)
{
    playfield[row] = [];
    for (let col = 0; col < cols; col++)
	{
        playfield[row][col] = 0;
    }
}

let tetrominoSequence = [];

function generateSequence()
{
    const sequence = [0, 1, 2, 3, 4, 5, 6];
    while (sequence.length)
	{
        const rand = Math.floor(Math.random() * sequence.length);
        const piece = sequence.splice(rand, 1)[0];
        tetrominoSequence.push(piece);
    }
}

function getNextTetromino()
{
    if (tetrominoSequence.length === 0)
	{
        generateSequence();
    }
    const tetrominoType = tetrominoSequence.pop();
    const matrix = tetrominoes[tetrominoType];
    const col = Math.floor(cols / 2) - Math.floor(matrix[0].length / 2);
    const row = 0;
    const tetromino =
	{
        matrix: matrix,
        row: row,
        col: col,
        type: tetrominoType + 1
    };
    if (!isValidMove(tetromino.matrix, tetromino.row, tetromino.col))
	{
        gameOver = true;
        return null;
    }
    return tetromino;
}

let currentTetromino = getNextTetromino();
let gameOver = false;

function rotate(matrix)
{
    const transposed = matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
    return transposed.map(row => row.reverse());
}

function updateLevelDisplay() {
    const level = Math.floor(linesCleared / 10) + 1;
    levelDisplay.textContent = `Level: ${level}`;
}

function isValidMove(matrix, row, col)
{
    for (let y = 0; y < matrix.length; y++)
	{
        for (let x = 0; x < matrix[y].length; x++)
		{
            if (matrix[y][x]) {
                const newX = col + x;
                const newY = row + y;
                if (
                    newX < 0 ||
                    newX >= cols ||
                    newY >= rows ||
                    (newY >= 0 && playfield[newY][newX])
                ) {
                    return false;
                }
            }
        }
    }
    return true;
}

function calculateScore(lines) {
    const lineScores = [0, 40, 100, 300, 1200];
    return lineScores[lines];
}

function placeTetromino() {
    for (let y = 0; y < currentTetromino.matrix.length; y++) {
        for (let x = 0; x < currentTetromino.matrix[y].length; x++) {
            if (currentTetromino.matrix[y][x]) {
                const newY = currentTetromino.row + y;
                const newX = currentTetromino.col + x;
                if (newY >= 0 && newY < rows && newX >= 0 && newX < cols) {
                    playfield[newY][newX] = currentTetromino.type;
                }
            }
        }
    }
    let lines = 0;
    for (let y = rows - 1; y >= 0; ) {
        if (playfield[y].every(value => value > 0)) {
            playfield.splice(y, 1);
            playfield.unshift(new Array(cols).fill(0));
            lines++;
        } else {
            y--;
        }
    }
    if (lines > 0) {
        linesCleared += lines;
        const points = calculateScore(lines);
        score += points;
        scoreElement.textContent = 'Score: ' + score;
        if (linesCleared % 10 === 0 && dropInterval > 200) {
            dropInterval -= 100;
        }
        updateLevelDisplay();
    }

    currentTetromino = getNextTetromino();
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0)
{
    if (gameOver)
	{
        alert("Game Over!");
        return;
    }
	updateLevelDisplay();
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval)
	{
        dropCounter = 0;
        if (isValidMove(currentTetromino.matrix, currentTetromino.row + 1, currentTetromino.col))
		{
            currentTetromino.row++;
        }
		else
		{
            placeTetromino();
            if (gameOver)
			{
                alert("Game Over!");
                return;
            }
        }
    }
    draw();
    requestAnimationFrame(update);
}

function draw()
{
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 2; y < playfield.length; y++) {
        for (let x = 0; x < playfield[y].length; x++) {
            if (playfield[y][x]) {
                context.fillStyle = colors[playfield[y][x]];
                context.fillRect(x * grid, (y - 2) * grid, grid - 1, grid - 1);
            }
        }
    }
    for (let y = 0; y < currentTetromino.matrix.length; y++) {
        for (let x = 0; x < currentTetromino.matrix[y].length; x++) {
            if (currentTetromino.matrix[y][x]) {
                const drawY = currentTetromino.row + y - 2;
                if (drawY >= 0) {
                    context.fillStyle = colors[currentTetromino.type];
                    context.fillRect(
                        (currentTetromino.col + x) * grid,
                        drawY * grid,
                        grid - 1,
                        grid - 1
                    );
                }
            }
        }
    }
    context.fillStyle = 'black';
    context.font = '20px Arial';
    context.fillText('Score: ' + score, 10, 30);
}

document.addEventListener('keydown', function(e)
{
    if (gameOver)
		return;
    if (e.key === 'ArrowLeft' || e.key === 'a')
	{
        const col = currentTetromino.col - 1;
        if (isValidMove(currentTetromino.matrix, currentTetromino.row, col))
		{
            currentTetromino.col = col;
        }
    }
	else if (e.key === 'ArrowRight' || e.key === 'd')
	{
        const col = currentTetromino.col + 1;
        if (isValidMove(currentTetromino.matrix, currentTetromino.row, col))
		{
            currentTetromino.col = col;
        }
    }
	else if (e.key === 'ArrowDown' || e.key === 's')
	{
        const row = currentTetromino.row + 1;
        if (isValidMove(currentTetromino.matrix, row, currentTetromino.col))
		{
            currentTetromino.row = row;
        }
    }
	else if (e.key === 'ArrowUp' || e.key === 'w')
	{
        const matrix = rotate(currentTetromino.matrix);
        if (isValidMove(matrix, currentTetromino.row, currentTetromino.col))
		{
            currentTetromino.matrix = matrix;
        }
    }
});

update();
