async function updateUserInfo() {
    let body = {};

    const displayName = document.getElementById("displayNameInput").value.trim();
    if (displayName) {
        body.first_name = displayName;
    }

    const friendsInput = document.getElementById("friendUsername").value.trim();
    if (friendsInput) {
        body.friends = friendsInput.split(" ").map(friend => friend.trim()).filter(friend => friend);
    }

    const avatarInput = document.getElementById('avatarInput');
    const file = avatarInput.files[0];

    if (Object.keys(body).length === 0 && !file) {
        alert("No information to update.");
        return;
    }

    try {
        const response = await apiRequest("/me", "POST", JWTs, body);
        if (response) {
            alert("User information updated successfully.");
        } else {
            alert("Failed to update user information.");
        }

        if (file) {
            await uploadAvatar(JWTs, file);
        }
    } catch (error) {
        console.error("Error updating user info:", error);
        alert("An error occurred while updating user information.");
    }
};

function accountsPageStart() {
	document.getElementById("puppetGrantSubmitButton").addEventListener("click", puppetGrantSubmitButtonHandler); 
        fillInCurrentUserInfo();
};


async function fillInCurrentUserInfo() {
    const userdata = await apiRequest('/me', 'GET', JWTs, undefined);
    queryAndReplacePlaceholder("#displayNameInput", userdata.first_name);
    queryAndReplacePlaceholder("#friendUsername", userdata.first_name);
    updateUserAvatar();
}

async function updateUserAvatar() {
    try {
        const response = await apiRequest('/me/avatar', 'GET', JWTs, undefined);
        console.log('Avatar API response:', response);
        if (response && response.avatar_url) {
            const avatarImg = document.querySelector('#avatarImg');
            if (avatarImg) {
                console.log('Setting avatar URL:', response.avatar_url);
                avatarImg.src = response.avatar_url;
                // Add error handler for image loading
                avatarImg.onerror = function() {
                    console.error('Failed to load avatar image');
                    this.src = '/media/avatar_default.png';
                };
            } else {
                console.error('Avatar image element not found');
            }
        } else {
            console.log('No avatar URL in response, using default');
            const avatarImg = document.querySelector('#avatarImg');
            if (avatarImg) {
                avatarImg.src = '/media/avatar_default.png';
            }
        }
    } catch (error) {
        console.error("Error fetching user avatar:", error);
        const avatarImg = document.querySelector('#avatarImg');
        if (avatarImg) {
            avatarImg.src = '/media/avatar_default.png';
        }
    }
}


async function uploadAvatar(jwtTokens, avatarFile) {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    const response = await apiRequest('/me/avatar', 'POST', jwtTokens, formData);
    if (await response) {
        alert('Avatar uploaded successfully:', response);
    } else {
        console.log('Failed to upload avatar.');
    }
}
