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
	console.log(userdata);
	queryAndReplace("#firstName", userdata.first_name);
};

