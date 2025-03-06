async function loginAsRecurringUser() {
	try {
		const TOTPToken = getTOTPToken()
		try {
			JWTs = await apiRequest("/token", 'POST', undefined, {
				ft_api_user_login_code: intraCode,
				TOTP: {
					type: "token",
					value: TOTPToken
				}
			});
			if (!response) {
				console.error("Couldn't login using code");
				return;
			}
		} catch (error) {
			console.error("Error during fetch:", error);
		}
	} catch (exception) {
		throw ("needs set-up");
	};
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
		if (!response) {
			console.error("Couldn't login for the first time");
			return;
		}
	} catch (error) {
		console.error("Error during fetch:", error);
		return undefined;
	}
};

async function login() {
	try {
		loginAsRecurringUser();
	} catch (exception) {
		promptTOTPSetUp();
	};
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
	new QRCode(document.getElementById("qrcode"), TOTPUri);
};

function promptTOTPSetUp() {
	TOTPSetup = generateTOTPSetup();

	navigateTo("/register");
	displayQRforTOTP();
};

function TOTPTokenSubmitButtonHandler() {
	if (inputTokenIsValid()) {
		loginFirstTime();
	} else {
		alert("The code you put in is not valid. Please try again");
	}
};

function generateTOTP() {
	let totp = new OTPAuth.TOTP({
		issuer: "Transcendence Inc.",
		label: "Play Pong and Tetris.",
		algorithm: "SHA1",
		digits: 6,
		period: 30,
		secret: new OTPAuth.Secret()
	});
	return totp;
};

function verifyOTPCode(OTPCode, OTPSecret) {
};

function getTOTPToken() {
	let token = "";
	while (token === "") {
		token = prompt("Please enter your OTP code or type SETUP if you don't have one already"); 
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
};
