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

async function navigateTo(url) {
	history.pushState(null, null, url);
	await router();
	fillInFirstNamePlaceholders();
};

async function router()
{
  GlobalTetrisGames.forEach(game =>
	  {
		  if (game.destroy)
		  {
			  game.destroy();
		  }
	  });
  GlobalTetrisGames.length = 0;
  tetrisActive = false;
  tournamentActive = false;
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
        const pongGame = new PongGameMultiPlayer();
        pongGame.initialize();
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
		  		  viewHTML("/static/tetris/tetris.html")
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
        viewHTML("/static/tournament/tournament.html").then(() => {
          console.log("going to tournament");
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

  let match = potentialMatches.find(potentialMatch => potentialMatch.isMatch);

  if (!match) {
    navigateTo("/");
  } else {
    match.route.view();
  }
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
        } else if (e.target.matches("[find-match]")) {
			searching_for_game_match("tetris");
		} else if (e.target.matches("[get-active-players]")) {
			const response = await apiRequest('/tetris/get_active_players', 'GET', JWTs, null);
			console.log(response);
		}
    });
	    document.body.addEventListener("click", async e => {
        if (e.target.matches("[data-link]")) {
            e.preventDefault();
            navigateTo(e.target.href);
        } else if (e.target.matches("[data-tournament-join]")) {
            const response = await apiRequest('/tournament/add_player', 'POST', JWTs, null);
			console.log(response);
			console.log(getRandomSillyString());
		} else if (e.target.matches("[data-tetris]")) {
			const game_name = "tetris";
			const payload = { game_name }; 
            const response = await apiRequest('/tournament/declare_game', 'POST', JWTs, payload);
			console.log(response);
		} else if (e.target.matches("[data-pong]")) {
			const game_name = "pong";
			const payload = { game_name }; 
            const response = await apiRequest('/tournament/declare_game', 'POST', JWTs, payload);
			console.log(response);
		} else if (e.target.matches("[data-active-players]")) {
            const response = await apiRequest('/tournament/get_participants', 'GET', JWTs, null);
			console.log(response);
		} else if (e.target.matches("[data-start-tournament]")) {
			const response = await apiRequest('/tournament/start', 'POST', JWTs, null);
			console.log(response);
			console.log("WORK HARDER Matisse");
		} else if (e.target.matches("[data-next-match]")) {
			const response = await apiRequest('/tournament/get_current_match', 'GET', JWTs, null);
			console.log(response);
			console.log(getRandomSillyString());
			await tournament_get_next_match(response);
		}
    });
    router();
});
