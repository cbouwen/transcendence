async function apiRequest(endpoint, method, jwtTokens, body) {
	if (!jwtTokens) {
		console.warn("JWT tokens are not set. Aborting API request.");
		return undefined;
	}

	const url = urlRoot + apiPath + endpoint;

	let headers = {
		'Authorization': 'Bearer ' + jwtTokens.access
	};

	let request;
	if (body instanceof FormData) {
		request = {
			method: method,
			headers: headers,
			body: body
		};
	} else {
		headers['Content-Type'] = 'application/json';
		request = {
			method: method,
			headers: headers,
			body: body ? JSON.stringify(body) : null
		};
	}

	console.log("Sending the following request to " + url + " with the following body:" + JSON.stringify(body) + " and the following headers:" + JSON.stringify(headers) + " and the following request:" + JSON.stringify(request) + " and the following jwtTokens:" + JSON.stringify(jwtTokens));
	console.log(request);
	const response = await fetch(url, request);
	const responseData = await response.json();
	if (!response.ok) {
		console.warn("Unexpected response from API:");
		console.warn(responseData);
		return undefined;
	}
	return responseData;
};
