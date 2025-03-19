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
        // Get current user's friends
        const userData = await apiRequest('/me', 'GET', JWTs);
        const friends = userData.friends || [];
        
        // Get all online players
        const activePlayersResponse = await apiRequest('/tetris/get_active_players', 'GET', JWTs);
        const onlinePlayers = activePlayersResponse.active_players || [];
        
        // Find which friends are online
        const onlineFriends = friends.filter(friend => onlinePlayers.includes(friend.username));
        
        // Update the display
        const onlineFriendsList = document.getElementById('onlineFriendsList');
        onlineFriendsList.innerHTML = ''; // Clear current list
        
        if (onlineFriends.length === 0) {
            onlineFriendsList.innerHTML = '<div class="list-group-item">No friends online</div>';
            return;
        }
        
        onlineFriends.forEach(friend => {
            const friendElement = document.createElement('div');
            friendElement.className = 'list-group-item';
            friendElement.innerHTML = `<span class="badge badge-success">Online</span> ${friend.username}`;
            onlineFriendsList.appendChild(friendElement);
        });
    } catch (error) {
        console.error("Error updating online friends:", error);
    }
}

async function addFriend() {
    const friendUsername = document.getElementById("friendUsername").value.trim();
    if (!friendUsername) {
        alert("Please enter a username");
        return;
    }

    try {
        const response = await apiRequest("/me", "PUT", JWTs, { friend_username: friendUsername });
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
        const response = await apiRequest("/me", "DELETE", JWTs, { friend_username: friendUsername });
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

function accountsPageStart() {
    fillInCurrentUserInfo();
    document.getElementById("puppetGrantSubmitButton").addEventListener("click", puppetGrantSubmitButtonHandler);
    document.getElementById("addFriendButton").addEventListener("click", addFriend);
    document.getElementById("removeFriendButton").addEventListener("click", removeFriend);
    
    // Initial update of online friends
    updateOnlineFriends();
    
    // Update online friends list every 30 seconds
    setInterval(updateOnlineFriends, 30000);
}

async function fillInCurrentUserInfo() {
    const userdata = await apiRequest('/me', 'GET', JWTs, undefined);
    queryAndReplacePlaceholder("#displayNameInput", userdata.first_name);
    updateUserAvatar();
}

async function updateUserAvatar() {
    try {
        const response = await apiRequest('/me/avatar', 'GET', JWTs);
        if (response && response.avatar_url) {
            const avatarImg = document.querySelector('#avatarImg');
            if (avatarImg) {
                avatarImg.src = response.avatar_url;
            }
        }
    } catch (error) {
        console.error("Error fetching user avatar:", error);
    }
};

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
