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
	const contentElement = document.getElementById("content");
	if (contentElement) {
		contentElement.innerHTML = content;
	} else {
		console.warn("Element with id 'content' not found. Cannot update innerHTML.");
	}
};

async function navigateTo(url) {
	history.pushState(null, null, url);
	await router();
};

async function router() {
  console.log("router called");
  GlobalTetrisGames.forEach(game => {
    if (game.destroy) {
      game.destroy();
    }
  });
  if (JWTs) {
    const response = await apiRequest('/tetris/add-player', 'POST', JWTs, undefined);
    if (response) {
      console.log(response);
    } else {
      console.log("Failed to add player");
    }
  }
  GlobalTetrisGames.length = 0;
  chatPageLoaded = false;
  tetrisActive = false;
  tournamentActive = false;
  tetrisPageLoaded = false;
  ontournamentpage = false;
  clearInterval(chatIntervalTimer);
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
      }
    },
    {
      path: "/pong_single",
      view: async () => {
        await viewHTML("/static/pong/wrapper.html");
        const pongGame = new PongGame();
        pongGame.initialize();
      }
    },
    {
      path: "/pong_multi",
      view: async () => {
        await viewHTML("/static/pong/wrapper.html");
        await pongMultiStart();
      }
    },
    {
      path: "/pong_match",
      view: async () => {
        await viewHTML("/static/pong/wrapper.html");
        searching_for_game_match("pong");
      }
    },
    {
      path: "/tetris",
      view: async () => {
        tetrisPageLoaded = true;
        await viewHTML("/static/tetris/tetris.html");
      }
    },
    {
      path: "/tetris_start",
      view: async () => {
        tetrisActive = true;
        viewHTML("/static/tetris/1_player.html").then(() => {
          startTetrisGame();
        });
      }
    },
    {
      path: "/tournament",
      view: async () => {
        ontournamentpage = true;
        viewHTML("/static/tournament/tournament.html").then(async () => {
          response = await apiRequest('/tournament/get_game', 'GET', JWTs, null);
          if (!response) return;
          if (response === "tetris" || response === "pong") {
            updateGameName(response);
          }
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
      path: "/chat2",
      view: () => {
        viewHTML("/static/chat2/chat2.html", JWTs).then(() => {
			chatPageLoaded = true;
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
    },
    {
      path: "/tetris_tournament",
      view: async () => {}
    },
    {
      path: "/personalStats",
      view: async () => {
        await viewHTML("/static/accounts/personalStats.html");
        statsLoad();
      }
    },
    {
      path: "/leaderboard",
      view: async () => {
        await viewHTML("/static/accounts/leaderboard.html");
      }
    },
    {
      path: "/register",
      view: async () => {
        await viewHTML("/static/accounts/register.html");
        registerPageStart();
      }
    }
  ];
  const potentialMatches = routes.map(route => {
    return {
      route: route,
      isMatch: location.pathname === route.path
    };
  });

  const match = potentialMatches.find(potentialMatch => potentialMatch.isMatch);

  if (!match) {
    navigateTo("/");
  } else {
    await match.route.view();
  }
  fillInFirstNamePlaceholders();
}

window.addEventListener("popstate", router);

document.addEventListener("DOMContentLoaded", () => {
	const tetrisButton = document.querySelector("[data-tetris-start-button]");
	if (tetrisButton) {
		console.log("Tetris start button exists!");
	} else {
		console.log("Tetris start button does not exist yet.");
	}
	document.body.addEventListener("click", async e => {
	  if (e.target.matches("[data-link]")) {
		e.preventDefault();
		navigateTo(e.target.href);
	  } else if (e.target.matches("[data-tetris-start-button]")) {
		history.pushState(null, null, "/tetris_start");
		router();
	  } else if (e.target.matches("[data-send-chat-message]")) {
		ClickSendMessage();
	  } else if (e.target.matches("[find-match]")) {
		searching_for_game_match("tetris");
	  } else if (e.target.matches("[get-active-players]")) {
		const response = await apiRequest('/tetris/get_active_players', 'GET', JWTs, null);
		if (!response) return;
		console.log(response);
	  } else if (e.target.matches("[data-tournament-join]")) {
		const response = await apiRequest('/tournament/add_player', 'POST', JWTs, null);
		if (!response) return;
		console.log(response);
	  } else if (e.target.matches("[data-tetris]")) {
		const game_name = "tetris";
		const payload = { game_name };
		const response2 = await apiRequest('/tournament/declare_game', 'POST', JWTs, payload);
		if (!response2) return;
		const response = await apiRequest('/tournament/get_game', 'GET', JWTs, null);
		if (!response) return;
		if (response === "tetris" || response === "pong") {
		  updateGameName(response);
		}
		console.log(response2);
	  } else if (e.target.matches("[data-pong]")) {
		const game_name = "pong";
		const payload = { game_name };
		const response2 = await apiRequest('/tournament/declare_game', 'POST', JWTs, payload);
		if (!response2) return;
		const response = await apiRequest('/tournament/get_game', 'GET', JWTs, null);
		if (!response) return;
		if (response === "tetris" || response === "pong") {
		  updateGameName(response);
		}
		console.log(response2);
	  } else if (e.target.matches("[data-active-players]")) {
		const response = await apiRequest('/tournament/get_participants', 'GET', JWTs, null);
		if (!response) return;
		console.log(response);
	  } else if (e.target.matches("[data-start-tournament]")) {
		const response = await apiRequest('/tournament/start', 'POST', JWTs, null);
		if (!response) return;
		console.log(response);
		console.log("WORK HARDER Matisse");
	  } else if (e.target.matches("[data-next-match]")) {
		const response = await apiRequest('/tournament/get_current_match', 'GET', JWTs, null);
		if (!response) return;
		console.log(response);
		await tournament_get_next_match(response);
	  } else if (e.target.matches("#saveUserInfo")) {
		updateUserInfo();
		fillInCurrentUserInfo();
	  }
	});
	router();

});
