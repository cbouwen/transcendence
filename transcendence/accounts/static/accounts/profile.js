async function loadProfileData() {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');

    if (!username) {
        navigateTo('/');
        return;
    }

    try {
        // Get all users
        const users = await apiRequest('/users', 'GET', JWTs);
        
        if (!users || !Array.isArray(users)) {
            navigateTo('/');
            return;
        }

        // Find the specific user
        const user = users.find(u => u.username === username);
        
        if (!user) {
            navigateTo('/');
            return;
        }

        // Update the profile display
        updateProfileDisplay(user);
        // Update avatar separately
        updateProfileAvatar(username);
    } catch (error) {
        navigateTo('/');
    }
}

function updateProfileDisplay(user) {
    // Update username
    document.getElementById('profileUsername').textContent = user.username;
    
    // Update first name
    const firstNameElement = document.getElementById('profileFirstName');
    if (user.first_name) {
        firstNameElement.textContent = user.first_name;
        firstNameElement.style.display = 'block';
    } else {
        firstNameElement.style.display = 'none';
    }
}

async function updateProfileAvatar(username) {
    try {
        const users = await apiRequest('/users', 'GET', JWTs);
        console.log('Users API response:', users);
        
        const user = users.find(u => u.username === username);
        
        if (user && user.avatar) {
            const avatarImg = document.getElementById('profileAvatar');
            if (avatarImg) {
                console.log('Setting avatar URL:', user.avatar);
                avatarImg.src = user.avatar;
                // Add error handler for image loading
                avatarImg.onerror = function() {
                    console.error('Failed to load avatar image');
                    this.src = '/media/avatar_default.png';
                };
            } else {
                console.error('Avatar image element not found');
            }
        } else {
            console.log('No avatar URL found for user, using default');
            const avatarImg = document.getElementById('profileAvatar');
            if (avatarImg) {
                avatarImg.src = '/media/avatar_default.png';
            }
        }
    } catch (error) {
        console.error("Error fetching user avatar:", error);
        const avatarImg = document.getElementById('profileAvatar');
        if (avatarImg) {
            avatarImg.src = '/media/avatar_default.png';
        }
    }
}

// Initialize the profile page
function profilePageStart() {
    loadProfileData();
}
