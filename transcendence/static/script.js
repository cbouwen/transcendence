const urlRoot = "http://localhost:8000";
const apiPath = "/api";
const intraLoginUrl = "https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-c7b90fdbd60eb0dd8a054b64228d8bc2fe132bbf8e1acffb34dff74a314d8f74&redirect_uri=http%3A%2F%2Flocalhost%3A8000&response_type=code";

async function apiRequest(endpoint, method, jwtToken, body) {
	const url = urlRoot + apiPath + endpoint;
	const request = {
		method: method,
		headers: {
			'Authorization': 'Bearer ' + jwtToken,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body)
	};
	console.log("Sending request...");
	console.log(request);
	const response = await fetch(url, request);
	if (!response.ok) {
		console.error("Unexpected response");
		console.error(response);
		return undefined;
	}
	const responseData = response.json();
	return responseData; 
};

async function login(code) {
	try {
		const response = await apiRequest("/token", 'POST', undefined, {ft_api_user_login_code: code});
		if (!response) {
			console.error("Couldn't login using code");
			return;
		}

		return await response;
	} catch (error) {
		console.error("Error during fetch:", error);
		return undefined;
	};
};

function redirectToIntra() {
	console.log("Redirecting to intra login page to retreive code...");
	window.location.replace(intraLoginUrl);
};

function getLoginCode() {
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get('code');

	if (code) {
		return code;
	} else {
		console.log("Couldn't read the the `code` URL parameter attribute...");
		return undefined;
	}
};

function replace(query, newContent) {
	const nodes = document.querySelectorAll(query);
	nodes.forEach(node => {
		node.textContent = newContent;
	});
};

// all of our code is wrapped in async because we want to be able to use `await`
(async () => {
	// read the URL parameter called `code` that intra gave to us, or redirect to intra if we don't have one yet
	const code = getLoginCode();
	// stop execution to wait for the redirect to intra
	if (code == undefined) {
		redirectToIntra();
		return;
	}

	// obtain a refresh and an access JWT token using the `code` value we just obtained
	const jwtTokens = await login(code);
	if (!jwtTokens || !jwtTokens.access) {
		return;
	}
	console.log(jwtTokens.access);

	// get information about currently logged in user
	const response = await apiRequest("/me", 'GET', jwtTokens.access, undefined);
	console.log(response);

	// replace placeholder values with the first name of the user
	replace('span.player', response.first_name);
})();
