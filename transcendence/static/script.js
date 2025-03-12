(async () => {
	try {
		intraCode = extractLoginCodeFromURL();
	} catch (exception) {
		console.log(exception);
		redirectToIntra();
		return;
	}
	await login();
	console.log(JWTs.access);
	let response = await apiRequest('/tetris/add-player', 'POST', JWTs, undefined);
	console.log(response);

	fillInFirstNamePlaceholders();
})();
