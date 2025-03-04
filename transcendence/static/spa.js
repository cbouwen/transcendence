
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
	tetrisActive = false
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
			path:"/tetris",
			view: () => viewHTML("/static/tetris/tetris.html").then(() => {})
		},
		{
			path: "/tetris_start",
			view: () => {
				tetrisActive = true
				viewHTML("/static/tetris/1_player.html").then(() => {
					const matchConfig = {
						tournament : false,
						ranked : true,
					};
					const playerConfigs = [
						{
							name: "Alice",
							controls: {
								left: 'ArrowLeft',
								right: 'ArrowRight',
								down: 'ArrowDown',
								rotate: 'ArrowUp'
							}
						}
					]
					launchTetrisGame(playerConfigs, matchConfig);
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
		},
		{
			path: "/account",
			view: async () => {
				await viewHTML("/static/accounts/account.html");
				accountsPageStart();
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
    const tetrisButton = document.querySelector("[data-tetris-start-button]");
    if (tetrisButton) {
        console.log("Tetris start button exists!");
    } else {
        console.log("Tetris start button does not exist yet.");
    }

    document.body.addEventListener("click", e => {
        if (e.target.matches("[data-link]")) {
            e.preventDefault();
            navigateTo(e.target.href);
        } else if (e.target.matches("[data-tetris-start-button]")) {
            history.pushState(null, null, "/tetris_start");
            router();
        }
    });
    router();
});

