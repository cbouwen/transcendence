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
	const response = await fetch(url, request);
	if (!response.ok) {
		return undefined;
	}
	const responseData = response.json();
	return responseData; 
};

async function login(code) {
	try {
		const response = await apiRequest("/token", 'POST', 'kak', {ft_api_user_login_code: code});
		if (!response) {
			redirectToIntra();
			return;
		}

		return await response;
	} catch (error) {
		console.error("Error during fetch:", error);
		return undefined;
	};
};

function redirectToIntra() {
	console.log("Authentication failed, redirecting to intra login page to try again");
	window.location.replace(intraLoginUrl);
};

function getLoginCode() {
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get('code');

	if (code) {
		return code;
	} else {
		redirectToIntra();
		return undefined;
	}
};

(async () => {
	const code = getLoginCode();
	if (!code) {
		return;
	}

	const jwtTokens = await login(code);
	if (!jwtTokens || !jwtTokens.access) {
		return;
	}
	const response = await apiRequest("/test", 'GET', jwtTokens.access, undefined);
	console.log(response.message);
})();
