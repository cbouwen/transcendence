(async () => {
	try {
		intraCode = extractLoginCodeFromURL();
	} catch (exception) {
		console.log(exception);
		redirectToIntra();
		return;
	}
	await login();
	if (JWTs == null) {
		console.warn("JWTs not set.");
	} else {
		console.log("Obtained JWTs", JWTs);
	}
	let response = await apiRequest('/tetris/add-player', 'POST', JWTs, undefined);
	console.log(response);

	fillInFirstNamePlaceholders();
})();
