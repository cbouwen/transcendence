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
    
    if (Object.keys(body).length === 0) {
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
    } catch (error) {
        console.error("Error updating user info:", error);
        alert("An error occurred while updating user information.");
    }
};
