
(async () => {
	try {
		intraCode = extractLoginCodeFromURL();
	} catch (exception) {
		console.log(exception);
		redirectToIntra();
		return;
	}
	JWTs = await login();
	console.log(JWTs.access);

	fillInFirstNamePlaceholders();
})();

