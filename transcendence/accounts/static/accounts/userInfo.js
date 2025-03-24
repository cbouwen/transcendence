async function updateUserInfo() {
    let body = {};

    const displayName = document.getElementById("displayNameInput").value.trim();
    if (displayName) {
        body.first_name = displayName;
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
            return null;
        }

        if (file) {
            await uploadAvatar(JWTs, file);
        }
    } catch (error) {
        console.error("Error updating user info:", error);
        alert("An error occurred while updating user information.");
    }
}

async function updateOnlineFriends() {
    try {
        // Get all users and current user's blocked list
        const [allUsersResponse, userData, activePlayersResponse] = await Promise.all([
            apiRequest('/users', 'GET', JWTs),
            apiRequest('/me', 'GET', JWTs),
            apiRequest('/tetris/get_active_players', 'GET', JWTs)
        ]);
        // Log API responses for debugging
        console.log("All Users Response:", allUsersResponse);
        console.log("User Data Response:", userData); 
        console.log("Active Players Response:", activePlayersResponse);

        // Add null checks and proper data access
        if (!allUsersResponse || !userData || !activePlayersResponse) {
            console.log("One or more API responses were null");
            return;
        }

        const allUsers = Array.isArray(allUsersResponse) ? allUsersResponse : [];
        const blockedUsers = Array.isArray(userData.blocked) ? userData.blocked : [];
        const onlinePlayers = Array.isArray(activePlayersResponse.active_players) ? 
            activePlayersResponse.active_players : [];
        
        // Filter out blocked users to get friends list
        const friends = allUsers.filter(user => 
            user && user.username && // Check if user object is valid
            !blockedUsers.some(blocked => blocked && blocked.username === user.username) && 
            user.username !== userData.username // Also filter out current user
        );
        
        // Update the display
        const onlineFriendsList = document.getElementById('onlineFriendsList');
        if (!onlineFriendsList) {
            console.log("Could not find onlineFriendsList element");
            return;
        }
        
        onlineFriendsList.innerHTML = ''; // Clear current list
        
        if (friends.length === 0) {
            const friendElement = document.createElement('div');
            friendElement.classList.add('list-group-item', 'formTextInputSettingsInner');
            friendElement.innerHTML = `No friends online`;
			onlineFriendsList.appendChild(friendElement);
            return;
        }
        
        friends.forEach(friend => {
            const friendElement = document.createElement('div');
            friendElement.classList.add('list-group-item', 'formTextInputSettingsInner');
            const isOnline = onlinePlayers.includes(friend.username);
            const statusBadge = isOnline ? 
                '<span class="badge badge-success">Online</span>' : 
                '<span class="badge badge-secondary">Offline</span>';
            friendElement.innerHTML = `${statusBadge} ${friend.username}`;
            onlineFriendsList.appendChild(friendElement);
        });
    } catch (error) {
        console.log("Error updating online friends:", error);
    }
}

async function addFriend() {
    const friendUsername = document.getElementById("friendUsername").value.trim();
    if (!friendUsername) {
        alert("Please enter a username");
        return;
    }

    try {
        // Use the Friends API endpoint to unblock (add friend)
        const response = await apiRequest("/me/friends", "POST", JWTs, { 
            username: friendUsername 
        });
        
        if (response) {
            alert("Friend added successfully");
            document.getElementById("friendUsername").value = ""; // Clear input
            updateOnlineFriends(); // Update the online friends list
        }
    } catch (error) {
        console.error("Error adding friend:", error);
        alert("Failed to add friend. Please check the username and try again.");
    }
}

async function removeFriend() {
    const friendUsername = document.getElementById("friendUsername").value.trim();
    if (!friendUsername) {
        alert("Please enter a username");
        return;
    }

    try {
        // Use the Friends API endpoint to block (remove friend)
        const response = await apiRequest("/me/friends", "DELETE", JWTs, { 
            username: friendUsername 
        });
        
        if (response) {
            alert("Friend removed successfully");
            document.getElementById("friendUsername").value = ""; // Clear input
            updateOnlineFriends(); // Update the online friends list
        }
    } catch (error) {
        console.error("Error removing friend:", error);
        alert("Failed to remove friend. Please check the username and try again.");
    }
}

async function logout() {
	console.log("F U C K");
    try {
        // Remove player from active players
        const response = await apiRequest("/tetris/remove-player", "DELETE", JWTs);
        JWTs = null;
        navigateTo('/');
        start();
    } catch (error) {
        console.error("Error during logout:", error);
        alert("An error occurred during logout. Please try again.");
    }
}

function accountsPageStart() {
    fillInCurrentUserInfo();
    const puppet = document.getElementById("puppetGrantSubmitButton");
	if (puppet)
		puppet.addEventListener("click", puppetGrantSubmitButtonHandler);
	const addFriendButton = document.getElementById("addFriendButton");
	if (addFriendButton)
		addFriendButton.addEventListener("click", addFriend);
	const removeFriendButton = document.getElementById("removeFriendButton");
	if (removeFriendButton)
		removeFriendButton.addEventListener("click", removeFriend);
	const logoutButton = document.getElementById("logoutButton");
	if (logoutButton)
		logoutButton.addEventListener("click", logout);
    
    updateOnlineFriends();
    
    setInterval(updateOnlineFriends, 30000);
}

async function fillInCurrentUserInfo() {
    const userdata = await apiRequest('/me', 'GET', JWTs, undefined);
    if (!userdata) return;
    queryAndReplacePlaceholder("#displayNameInput", userdata.first_name);
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
