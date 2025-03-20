let lastMessageTimestamp = null;
let currentUser = null;

async function getCurrentUser() {
    try {
        currentUser = await apiRequest('/me', 'GET', JWTs);
    } catch (error) {
        console.error('Error fetching current user:', error);
    }
}

async function loadMessages() {
    try {
        if (!currentUser) {
            await getCurrentUser();
        }
        
        const messages = await apiRequest('/chat/message', 'GET', JWTs);
        const chatMessages = document.getElementById('chatMessages');
        
        // Clear existing messages
        chatMessages.innerHTML = '';
        
        // Sort messages by timestamp (newest first)
        messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'mb-3';
            
            // Different styling for sent vs received messages
            const isMyMessage = msg.sender === currentUser.username;
            messageDiv.className = `message p-2 mb-2 ${isMyMessage ? 'text-end' : 'text-start'}`;
            
            // Format timestamp
            const timestamp = new Date(msg.timestamp).toLocaleString();
            
            // Create accept button if message has pong invite
            const acceptButton = msg.pongInvite && !isMyMessage ? 
                `<button class="btn btn-success btn-sm ms-2" onclick="createPuppetGrant(JWTs, '${msg.sender}')">Accept invite</button>` : '';
            
            messageDiv.innerHTML = `
                <div class="card ${isMyMessage ? 'bg-primary text-white float-end' : 'bg-light float-start'}" style="max-width: 70%;">
                    <div class="card-body p-2">
                        <div class="d-flex align-items-center">
                            <span class="card-text">${msg.message}</span>
                            ${acceptButton}
                        </div>
                        <small class="${isMyMessage ? 'text-white' : 'text-muted'}">
                            ${isMyMessage ? 'You' : msg.sender} to ${isMyMessage ? msg.recipient : 'you'} - ${timestamp}
                        </small>
                    </div>
                </div>
                <div class="clearfix"></div>
            `;
            
            chatMessages.appendChild(messageDiv);
        });
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

async function sendMessage(event) {
    event.preventDefault();
    
    const recipientInput = document.getElementById('recipient');
    const messageInput = document.getElementById('message');
    const pongInviteCheckbox = document.getElementById('pongInvite');
    
    const recipient = recipientInput.value.trim();
    const message = messageInput.value.trim();
    const pongInvite = pongInviteCheckbox.checked;
    
    if (!recipient || !message) {
        alert('Please fill in both recipient and message fields');
        return;
    }
    
    try {
        const response = await apiRequest('/chat/message', 'POST', JWTs, {
            recipient: recipient,
            message: message,
            pongInvite: pongInvite
        });
        
        // Clear the form and uncheck the checkbox
        messageInput.value = '';
        pongInviteCheckbox.checked = false;
        
        // Reload messages immediately
        await loadMessages();
        
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    }
}

async function chatStart() {
    // Get current user first
    await getCurrentUser();
    
    // Initial load of messages
    await loadMessages();
    
    // Set up form submission
    const messageForm = document.getElementById('messageForm');
    const sendButton = messageForm.querySelector('button[type="submit"]');
    sendButton.addEventListener('click', sendMessage);
    
    // Set up periodic refresh
    chatIntervalTimer = setInterval(loadMessages, 5000);
}

function stopChat() {
    clearInterval(chatIntervalTimer);
}