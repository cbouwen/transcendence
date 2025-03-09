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
	let response = await apiRequest('/tetris/add-player', 'POST', JWTs, undefined);
	console.log(response);

	fillInFirstNamePlaceholders();
})();
