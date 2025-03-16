async function apiRequest(endpoint, method, jwtTokens, body) {
	const url = urlRoot + apiPath + endpoint;

	let headers = {
		'Content-Type': 'application/json',
	};
	if (jwtTokens && jwtTokens.access) {
		headers['Authorization'] = 'Bearer ' + jwtTokens.access
	}

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

	console.log("Sending the following request:");
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

