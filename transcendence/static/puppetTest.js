async function puppetTest(username) {
	try {
		const secondJWTs = await apiRequest('/token/puppet', 'POST', JWTs, {username: username});

		const userdata = await apiRequest('/me', 'GET', secondJWTs, null);
		console.log(userdata);
		alert("You are now puppeting " + userdata.first_name);
	} catch (err) {
		alert("Couldn't puppet " + username + ". Are you sure that they gave you permission?");
	}
};

