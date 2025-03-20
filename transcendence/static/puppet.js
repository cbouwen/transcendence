async function puppet(username) {
	try {
		const secondJWTs = await apiRequest('/token/puppet', 'POST', JWTs, {username: username});
		if (!secondJWTs) {
			alert("Couldn't puppet " + username + ". Are you sure that they gave you permission?");
			return;
		}

		const userdata = await apiRequest('/me', 'GET', secondJWTs, null);
		if (!userdata) {
			alert("Couldn't retrieve user data for " + username);
			return;
		}

		console.log(userdata);
		alert("You are now puppeting " + userdata.first_name);
	} catch (err) {
		alert("Couldn't puppet " + username + ". Are you sure that they gave you permission?");
	}
};
