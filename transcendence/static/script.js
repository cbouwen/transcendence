
(async () => {
	try {
		intraCode = extractLoginCodeFromURL();
	} catch (exception) {
		console.log(exception);
		redirectToIntra();
		return;
	}
	await login();
})();

