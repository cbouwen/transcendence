const urlRoot = "http://localhost:8000";
const apiPath = "/api";
const intraLoginUrl = "https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-c7b90fdbd60eb0dd8a054b64228d8bc2fe132bbf8e1acffb34dff74a314d8f74&redirect_uri=http%3A%2F%2Flocalhost%3A8000&response_type=code";

function hideAllViews() {
	let views = document.getElementByClassName("view");
	views.forEach(view => view.style.display = 'none');
};

function changeView(id) {
	hideAllViews();
	let view = document.getElementById(id);
	view.style.display = 'block';
};

async function apiRequest(endpoint, method, jwtTokens, body) {
	const url = urlRoot + apiPath + endpoint;

	let headers = {
		'Content-Type': 'application/json',
	};
	if (jwtTokens && jwtTokens.access) {
		headers['Authorization'] = 'Bearer ' + jwtTokens.access
	}

	const request = {
		method: method,
		headers: headers,
		body: JSON.stringify(body)
	};

	console.log("Sending the following request:");
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

function extractLoginCodeFromURL() {
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get('code');

	if (code) {
		urlParams.delete('code');
		const newUrl = window.location.pathname + '?' + urlParams.toString();
		window.history.replaceState({}, document.title, newUrl.endsWith('?') ? newUrl.slice(0, -1) : newUrl);
		return code;
	} else {
		throw "Couldn't read the the `code` URL parameter attribute...";
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
	let code;

	try {
		code = extractLoginCodeFromURL();
	} catch (exception) {
		console.log(exception);
		redirectToIntra();
		return ;
	}
	const JWTs = await login(code);
	console.log(JWTs.access);
})();
