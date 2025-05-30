async function loginAsRecurringUser(promptext) {
	const TOTPToken = getTOTPToken(promptext)
	if (TOTPToken == "SETUP") {
		return false;
	}
	try {
		JWTs = await apiRequest("/token", 'POST', 'no auth', {
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
		JWTs = await apiRequest("/token", 'POST', 'no auth', {
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
			let me = await apiRequest('/me', 'GET', JWTs);
			if (!me) {
				return null;
			};
			console.log("Logged in as " + me.first_name);
		}
	} catch (exception) {
		await navigateTo("/register");
	};
};

async function getPuppetJWTs(username = null) {
	if (!username) {
		username = stripInvalidCharacters(prompt("Give the username of your opponent"));
		if (username == null || username == "") {
			console.warning("No username given by user");
			return null;
		}
	}
	const payload = {
		username: username,
	};
	const response = await apiRequest("/token/puppet", "POST", JWTs, payload);
	if (!response) {
		alert("You don't have the permission to log in " + username + ". Do they have an account?");
		console.warning("Unexpected error when doing apiRequest to /token/puppet");
		return null;
	}
	else {
		if (response.status == "failed") {
			alert("You don't have the permission to log in " + username + ". Did you send them an invite yet and did they accept?");
			console.warning("Unexpected error when doing apiRequest to /token/puppet");
			return null;
		}
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
    const totpCode = stripInvalidCharacters(prompt(`Please enter your TOTP code to authorize ${puppeteerUsername} access to your account`));
    if (!totpCode) {
        console.log("Operation canceled by user.");
        return;
    }

    const body = {
        puppeteer: puppeteerUsername,
        totp: totpCode
    };

    const response = await apiRequest("/token/grant", "POST", jwtTokens, body);

    if (response) {
        console.log("Puppet grant created successfully:", response);
    } else {
        console.error("Failed to create puppet grant. Did you enter the correct TOTP code?");
    }
};

function puppetGrantSubmitButtonHandler() {
      const puppeteerUsername = stripInvalidCharacters(document.getElementById("puppetGrantInput").value.trim());
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
	let token = stripInvalidCharacters(document.getElementById("TOTPTokenInput").value);
	let delta = TOTPSetup.validate({ token, window: 1 }); 
	if (delta != null) {
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
			me = await apiRequest('/me', 'GET', JWTs);
			if (!me) {
				return null;
			};
			console.log("Logged in as " + me.first_name);
			await navigateTo("/");
		}
		document.querySelectorAll("nav").forEach(navElement => {
			navElement.removeEventListener("click", TOTPTokenSubmitButtonHandler);
		});
	} else {
		alert("The code you put in is not valid. Please try again");
		navigateTo("/register");
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
		token = stripInvalidCharacters(prompt(promptext)); 
	}
	if (token != "SETUP") {
		return (token);
	} else {
		throw "TOTP set-up needed";
	}
};

function registerPageStart() {
	document.getElementById("TOTPTokenSubmit").addEventListener("click", TOTPTokenSubmitButtonHandler); 
	document.querySelectorAll("nav").forEach(navElement => {
		navElement.addEventListener("click", TOTPTokenSubmitButtonHandler);
	});
	promptTOTPSetUp();
};
