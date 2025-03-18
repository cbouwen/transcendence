function statsLoad() {
	generateTable(document.getElementById("tab"), ["game", "opponent", "your score", "their score"], ["1", "ik", "19", "19"])
	document.getElementById("pongStats").addEventListener("click", (event) => pongStatsHandler(event));
	document.getElementById("tetrisStats").addEventListener("click", (event) => tetrisStatsHandler(event));
};

function setActiveNav(oldNav, newNav) {
	if (oldNav && newNav) {
		oldNav.className = "";
		newNav.className = "active";
	}
}

function pongStatsHandler(event) {
	event.preventDefault();
	tetrisNav = document.getElementById("tetrisStats");
	pongNav = document.getElementById("pongStats")
	setActiveNav(tetrisNav, pongNav);

	generateTable(document.getElementById("tab"), ["game", "opponent", "your score", "their score"], ["1", "ik", "19", "19"]);
}

function tetrisStatsHandler(event) {
	event.preventDefault();
	tetrisNav = document.getElementById("tetrisStats");
	pongNav = document.getElementById("pongStats")
	setActiveNav(pongNav, tetrisNav);

	generateTable(document.getElementById("tab"), ["game", "level", "lines cleared", "score"], ["1", "12", "123", "1234"])
}

function generateTable(navTab, tableHeaders, gameData) {
	destroyTable();

	let table = document.createElement("table");
	table.id = "statsTable";
	table.classList.add("table", "table-striped", "mt-3");

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

	let sampleData =
		[
			{ rank: 1, player: "Bert", score: 5, oppScore: 4},
			{ rank: 2, player: "Bart", score: 3, oppScore: 5},
			{ rank: 3, player: "Ward", score: 2, oppScore: 5}
		];

	sampleData.forEach((data) => {
		let row = document.createElement("tr");
		Object.values(data).forEach(value => {
			let td = document.createElement("td");
			td.textContent = value;
			row.appendChild(td);
		});
		tbody.appendChild(row);
	});

	table.appendChild(tbody);
	navTab.appendChild(table);
}

function destroyTable() {
	let existingTable = document.getElementById("statsTable");
	if (existingTable) {
		existingTable.remove();
	}
}