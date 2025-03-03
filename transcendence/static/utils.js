function queryAndReplace(query, newContent) {
	const nodes = document.querySelectorAll(query);
	nodes.forEach(node => {
		node.textContent = newContent;
	});
};

async function fillInFirstNamePlaceholders() {
	const userdata = await apiRequest('/me', 'GET', JWTs, null);
	console.log(userdata);
	queryAndReplace("#firstName", userdata.first_name);
};

