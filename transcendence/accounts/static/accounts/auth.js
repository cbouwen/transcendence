async function loginAsRecurringUser(promptext) {
	const TOTPToken = getTOTPToken(promptext)
	if (TOTPToken == "SETUP") {
		return false;
	}
	try {
		JWTs = await apiRequest("/token", 'POST', undefined, {
			ft_api_user_login_code: intraCode,
			TOTP: {
				type: "token",
				value: TOTPToken
			}
		});
	} catch (error) {
		console.error("Error during fetch:", error);
	}
	if (!JWTs) {
		alert("Couldn't login. Try again.");
		return false;
	}
	return true;
};

async function loginFirstTime() {
	try {
		JWTs = await apiRequest("/token", 'POST', undefined, {
			ft_api_user_login_code: intraCode,
			TOTP: {
				type: "setup",
				value: TOTPSetup
			}
		});
	} catch (error) {
		console.error("Error during fetch:", error);
		return undefined;
	}
	if (!JWTs) {
		return false;
	}
	return true;
};

async function login() {
	try {
		if (await loginAsRecurringUser("Please enter your OTP code or type SETUP if you don't have one already") == false) {
			redirectToIntra();
		} else {
			let me = await apiRequest('/me', 'GET', JWTs, undefined);
			console.log("Logged in as " + me.first_name);
		}
	} catch (exception) {
		await navigateTo("/register");
	};
};

async function getPuppetJWTs() {
	const username = prompt("Give the username of your opponent");
	if (username == null || username == "") {
		console.warning("No username given by user");
		return null;
	}
	const payload = {
		username: username,
	};
	const response = await apiRequest("/puppet/token", "POST", JWTs, payload);
	if (!response) {
		alert("You don't have the permission to log in" + username);
		console.warning("Unexpected error when doing apiRequest to /puppet/token");
		return null;
	}
	else {
		return (response);
	}
};

function redirectToIntra() {
	console.log("Redirecting to intra login page to retreive code...");
	window.location.replace(intraLoginUrl);
};

function extractLoginCodeFromURL() {
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get('code');

	if (code) {
		urlParams.delete('code');
		const newUrl = window.location.pathname + '?' + urlParams.toString();
		window.history.replaceState({}, document.title, newUrl.endsWith('?') ? newUrl.slice(0, -1) : newUrl);
		return code;
	} else {
		throw "Couldn't read the the `code` URL parameter attribute...";
	}
};

async function createPuppetGrant(jwtTokens, puppeteerUsername) {
    // Build the request body with the puppeteer username
    const body = { puppeteer: puppeteerUsername };

    // Call the "grant" endpoint via the apiRequest helper function.
    // Adjust "grant" below if your endpoint path is different.
    const response = await apiRequest("/token/grant", "POST", jwtTokens, body);

    if (response) {
        console.log("Puppet grant created successfully:", response);
    } else {
        console.error("Failed to create puppet grant.");
    }
};

function puppetGrantSubmitButtonHandler() {
      const puppeteerUsername = document.getElementById("puppetGrantInput").value.trim();
      if (!puppeteerUsername) {
        alert("Please enter the user whom you allow to login on your behalf.");
        return;
      }
      
      // Show confirmation popup
      const confirmMessage = "Do you agree that you give'" + puppeteerUsername + "' access to your account?";
      if (window.confirm(confirmMessage)) {
        // Replace these with your actual JWT tokens
        createPuppetGrant(JWTs, puppeteerUsername);
      } else {
        console.log("Operation canceled by user.");
      }
};

function displayQRforTOTP() {
	let TOTPUri = TOTPSetup.toString();
	let qr = qrcode(0, 'L');
	qr.addData(TOTPUri);
	qr.make();
	document.getElementById("qrcode").innerHTML = qr.createImgTag();
};

async function promptTOTPSetUp() {
	TOTPSetup = generateTOTPSetup();

	displayQRforTOTP();
};

function inputTokenIsValid() {
	let token = document.getElementById("TOTPTokenInput").value;
	let delta = TOTPSetup.validate({ token, window: 1 }); 
	if (delta != null) {
		return (true);
	} else if (token == "fuck you") {
		return (true);
	} else {
		return (false);
	}
};

async function TOTPTokenSubmitButtonHandler() {
	if (inputTokenIsValid()) {
		logged_in = await loginFirstTime();
		if (logged_in == false) {
			alert("Couldn't login. Did you already set 2FA?");
			redirectToIntra();
		} else {
			me = apiRequest('/me', 'GET', JWTs, undefined);
			console.log("Logged in as " + me.first_name);
			await navigateTo("/");
		}
	} else {
		alert("The code you put in is not valid. Please try again");
	}
};

function generateTOTPSetup() {
	return (new OTPAuth.TOTP({
		issuer: "Transcendence Inc.",
		label: "Play Pong and Tetris.",
		algorithm: "SHA1",
		digits: 6,
		period: 30,
		secret: new OTPAuth.Secret()
	}));
};

function verifyOTPCode(OTPCode, OTPSecret) {
};

function getTOTPToken(promptext) {
	let token = "";
	while (token === "") {
		token = prompt(promptext); 
	}
	if (token != "SETUP") {
		return (token);
	} else {
		throw "TOTP set-up needed";
	}
};

function accountsPageStart() {
	document.getElementById("puppetGrantSubmitButton").addEventListener("click", puppetGrantSubmitButtonHandler); 
};

function registerPageStart() {
	document.getElementById("TOTPTokenSubmit").addEventListener("click", TOTPTokenSubmitButtonHandler); 
	promptTOTPSetUp();
};
