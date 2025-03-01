
async function viewHTML(filePath, jwtTokens) {
	let headers = {};
	if (jwtTokens && jwtTokens.access) {
		headers['Authorization'] = 'Bearer ' + jwtTokens.access
	}
	const request = {
		method: 'GET',
		headers: headers,
	};
	const response = await fetch(urlRoot + filePath, request);
	const content = await response.text();
	document.getElementById("content").innerHTML = content;
};

function navigateTo(url) {
	history.pushState(null, null, url);
	router();
};

async function router() {
	if (location.pathname !== "/tetris") {
    }
	const routes = [
		{
			path: "/",
			view: async () => {
				await viewHTML("/static/home.html");
			}
		},
		{
			path: "/pong",
			view: async () => {
				await viewHTML("/static/pong/site.html");
				const pongGame = new PongGame();
				pongGame.initialize();
			}
		},
		{
			path: "/tetris",
			view: () => {
				viewHTML("/static/tetris/1_player.html").then(() => {
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
				});
			}
		},
		{
			path: "/chat",
			view: () => {
				viewHTML("/static/chat/chatPage.html", JWTs).then(() => {
					chatStart();
				});
			}
		}
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

(async () => {
	let code;

	try {
		code = extractLoginCodeFromURL();
	} catch (exception) {
		console.log(exception);
		redirectToIntra();
		return;
	}
	JWTs = await login(code);
	console.log(JWTs.access);
    
	fillInFirstNamePlaceholders();
})();

