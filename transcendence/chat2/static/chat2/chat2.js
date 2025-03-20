async function loadSystemMessages() {
	if (chatPageLoaded == false)
		return ;
	const response = await apiRequest('/system/messages', 'GET', JWTs);
	if (response) {
    console.log("Messages loaded:", response);
    const chatWindow = document.getElementById('systemMessages');
    chatWindow.innerHTML = '';

    response.forEach(msg => {
      const messageElement = document.createElement('div');
      const time = new Date(msg.timestamp).toLocaleTimeString();
      messageElement.textContent = `[${time}] ${msg.sender}: ${msg.message}`;
      chatWindow.appendChild(messageElement);
    });
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

async function sendMessage(messageText, recipients) {
  const body = {
    message: messageText,
    recipients: recipients
  };

  const response = await apiRequest('/chat/send/', 'POST', JWTs, body);
  if (response) {
    console.log("Message sent:", response);
    loadMessages();
  }
}

async function loadMessages() {
  if (chatPageLoaded == false)
	return ;
  const response = await apiRequest('/chat/messages/', 'GET', JWTs);
  if (response) {
    console.log("Messages loaded:", response);
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.innerHTML = '';

    response.forEach(msg => {
      const messageElement = document.createElement('div');
      const time = new Date(msg.timestamp).toLocaleTimeString();
      messageElement.textContent = `[${time}] ${msg.sender}: ${msg.message}`;
      chatWindow.appendChild(messageElement);
    });
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

async function ClickSendMessage() {
  console.log("sending message");
  const messageInput = document.getElementById('messageInput');
  const recipientsInput = document.getElementById('recipientsInput');

  const messageText = messageInput.value.trim();
  // Split the comma-separated usernames, trim spaces, and filter out empty entries.
  const recipients = recipientsInput.value.split(',')
    .map(username => username.trim())
    .filter(username => username.length > 0);

  if(messageText && recipients.length > 0){
    await sendMessage(messageText, recipients);
    messageInput.value = '';
  }
};

window.addEventListener('DOMContentLoaded', () => {
  setInterval(loadMessages, 5000);
  setInterval(loadSystemMessages, 5000);
});
