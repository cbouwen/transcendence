async function login(code) {
	try {
		const response = await apiRequest("/token", 'POST', undefined, { ft_api_user_login_code: code });
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

