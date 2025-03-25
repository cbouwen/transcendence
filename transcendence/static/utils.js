function queryAndReplace(query, newContent) {
	const nodes = document.querySelectorAll(query);
	nodes.forEach(node => {
		node.textContent = newContent;
	});
};

function queryAndReplacePlaceholder(selector, newPlaceholder) {
    document.querySelectorAll(selector).forEach(element => {
        if (element.placeholder !== undefined) {
            element.placeholder = newPlaceholder;
        }
    });
}

async function fillInFirstNamePlaceholders() {
	const userdata = await apiRequest('/me', 'GET', JWTs, null);
	if (userdata === undefined) {
		console.warn("apiRequest returned undefined. Aborting queryAndReplace.");
		return;
	}
	console.log(userdata);
	queryAndReplace("#firstName", userdata.first_name);
};

function stripInvalidCharacters(inputString) {
  return inputString.replace(/[^a-zA-Z0-9_@-]/g, '');
}
