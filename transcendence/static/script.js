
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

	fillInFirstNamePlaceholders();
})();

