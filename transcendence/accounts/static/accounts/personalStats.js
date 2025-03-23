function statsLoad() {
	generateTable(document.getElementById("tab"), ["game", "opponent", "your score", "their score"], "pong")
	document.getElementById("pongStats").addEventListener("click", (event) => pongStatsHandler(event));
	document.getElementById("tetrisStats").addEventListener("click", (event) => tetrisStatsHandler(event));
};

function setActiveNav(oldNav, newNav) {
	if (oldNav && newNav) {
		oldNav.className = "nav-link inactiveNav";
		newNav.className = "nav-link active activeNav";
	}
}

function pongStatsHandler(event) {
	event.preventDefault();
	tetrisNav = document.getElementById("tetrisStats");
	pongNav = document.getElementById("pongStats")
	setActiveNav(tetrisNav, pongNav);

	generateTable(document.getElementById("tab"), ["game", "opponent", "your score", "their score"], "pong");
}

function tetrisStatsHandler(event) {
	event.preventDefault();
	tetrisNav = document.getElementById("tetrisStats");
	pongNav = document.getElementById("pongStats")
	setActiveNav(pongNav, tetrisNav);

	generateTable(document.getElementById("tab"), ["game", "level", "lines cleared", "score"], "tetris")
}

async function generateTable(navTab, tableHeaders, game) {
	destroyTable();

	let table = document.createElement("table");
	table.id = "statsTable";
	table.classList.add("mt-3", "tableItem");

	let thead = document.createElement("thead");
	let theadRow = document.createElement("tr");

	tableHeaders.forEach(headerText => {
		let th = document.createElement("th");
		th.textContent = headerText;
		theadRow.appendChild(th);
	});

	thead.appendChild(theadRow);
	table.appendChild(thead);

	let tbody = document.createElement("tbody");

	if (game === "pong")
		parsePongScores(tbody);
	else
		parseTetrisScores(tbody);

	table.appendChild(tbody);
	navTab.appendChild(table);
}

function destroyTable() {
	let existingTable = document.getElementById("statsTable");
	if (existingTable) {
		existingTable.remove();
	}
}

async function parsePongScores(tableBody)
{
	let scoreObject = await apiRequest("/pong/score", "GET", JWTs, undefined);

	scoreObject.forEach(scoreData => {
		let game = formatTimestamp(scoreData.timestamp);
		let opponent = scoreData.them ?? "AI opponent";
		let myScore = scoreData.my_score;
		let theirScore = scoreData.their_score;

		let row = document.createElement("tr");

		[game, opponent, myScore, theirScore].forEach(value => {
            let cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

		tableBody.appendChild(row);
	})
}

async function parseTetrisScores(tableBody) {
	let scoreObject = await apiRequest("/tetris/get_scores", "GET", JWTs, null);

	scoreObject.forEach(scoreData => {
		let game = formatTimestamp(scoreData.timestamp);
		let level = scoreData.level;
		let linesCleared = scoreData.lines_cleared;
		let score = scoreData.score;

		let row = document.createElement("tr");

		[game, level, linesCleared, score].forEach(value => {
            let cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

		tableBody.appendChild(row);

		console.log(scoreData.gameid);
	})
}

function formatTimestamp(timestamp) {
    let date = new Date(timestamp);
    
    let day = String(date.getDate()).padStart(2, '0');
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let year = date.getFullYear();
    
    let hours = String(date.getHours()).padStart(2, '0');
    let minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} - ${hours}:${minutes}`;
}
