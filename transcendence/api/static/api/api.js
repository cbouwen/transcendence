async function apiRequest(endpoint, method, jwtTokens, body) {
	const url = urlRoot + apiPath + endpoint;

	let headers = {
		'Content-Type': 'application/json',
	};
	if (jwtTokens && jwtTokens.access) {
		headers['Authorization'] = 'Bearer ' + jwtTokens.access
	}

	let request;
	if (body) {
		request = {
			method: method,
			headers: headers,
			body: JSON.stringify(body)
		};
	} else {
		request = {
			method: method,
			headers: headers,
		};
	}

	console.log("Sending the following request:");
	console.log(request);
	const response = await fetch(url, request);
	if (!response.ok) {
		console.error("Unexpected response");
		console.error(response);
		return undefined;
	}
	const responseData = response.json();
	return responseData;
};

