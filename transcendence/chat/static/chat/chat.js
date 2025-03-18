async function chatStart() {
  const targetUsername = prompt("Enter the username of the person you want to chat with:");

  if (!targetUsername) {
    alert("You must enter a username to start a private chat.");
    return;
  }

  // display the target username element
  const targetUsernameElement = document.createElement("div");
  targetUsernameElement.id = "target-username";
  targetUsernameElement.innerHTML = `Chatting with: ${targetUsername}`;
  targetUsernameElement.style.fontWeight = "bold";
  targetUsernameElement.style.marginBottom = "1px";
  document.querySelector("#id_chat_item_container").prepend(targetUsernameElement);

  // buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.id = "buttons-container";
  buttonsContainer.style.marginBottom = "20px";
  buttonsContainer.style.marginTop = "1px"; // Decrease margin-top to reduce white space

  // profile button
  const profileButton = document.createElement("button");
  profileButton.innerHTML = "profile";
  profileButton.style.fontSize = "20px";
  profileButton.onclick = function() {
    window.location.href = `/profile/${targetUsername}`;
  };

  // invite button
  const inviteButton = document.createElement("button");
  inviteButton.innerHTML = "invite";
  inviteButton.style.fontSize = "20px";
  inviteButton.onclick = function() {
    window.location.href = `/invite/${targetUsername}`;
  };

  // Block button
  const blockButton = document.createElement("button");
  blockButton.innerHTML = "block";
  blockButton.style.fontSize = "20px";
  blockButton.onclick = function() {
    fetch('chat/block_user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': getCookie('csrftoken') // Ensure you include the CSRF token
      },
      body: `target_username=${encodeURIComponent(targetUsername)}`
    })
    .then(response => response.text()) // Get the response text
    .then(text => {
      console.log("Response text:", text); // Log the response text
      const data = JSON.parse(text); // Parse the response text as JSON
      if (data.status === 'success') {
        alert(data.message);
      } else {
        alert('Error: ' + data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
  };

  // Append buttons to the container
  buttonsContainer.appendChild(profileButton);
  buttonsContainer.appendChild(inviteButton);
  buttonsContainer.appendChild(blockButton);

  document.querySelector("#id_chat_item_container").insertBefore(buttonsContainer, document.querySelector("#id_message_send_input"));

  const chatSocket = new WebSocket("wss://" + window.location.host + "/");
  chatSocket.onopen = function (e) {
    console.log("The connection was setup successfully !");
  };
  chatSocket.onclose = function (e) {
    console.log("Something unexpected happened !");
  };
  document.querySelector("#id_message_send_input").focus();
  document.querySelector("#id_message_send_input").onkeyup = function (e) {
    if (e.keyCode == 13) {
      document.querySelector("#id_message_send_button").click();
    }
  };

  const userdata = await apiRequest('/me', 'GET', JWTs, null);
  console.log(userdata);  // Now it will print the actual data
  
  document.querySelector("#id_message_send_button").onclick = async function (e) {
    var messageInput = document.querySelector("#id_message_send_input").value.trim();

    if (messageInput === "") {
      return;
    }

    try {

      const messageData = {
        message: messageInput,
        username: userdata.username || "Unknown User",
        target: targetUsername
      };

      console.log("Target username:", targetUsername); // Log the target username
      console.log("Message target", messageData.target); // Log the target field in the receive

      chatSocket.send(JSON.stringify(messageData));

      // Display the sent message locally
      displayMessage(messageData);

    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  chatSocket.onmessage = function (e) {
    const data = JSON.parse(e.data);

    console.log("Received message:", data); // Log the received message
    console.log("username", userdata.username);
    console.log("Target username:", targetUsername); // Log the target username
    console.log("Message target", data.target); // Log the target field in the received messa

    if (data.target === userdata.username) {
      displayMessage(data);
    }
  };

  function displayMessage(data) {
    var div = document.createElement("div");

    // Create a span for the username and message
    var userSpan = document.createElement("span");
    userSpan.innerHTML = data.username + " : ";

    // Append the username span and message to the div
    div.appendChild(userSpan);
    div.appendChild(document.createTextNode(data.message));

    document.querySelector("#id_message_send_input").value = "";
    document.querySelector("#id_chat_item_container").appendChild(div);
  }
}

// Helper function to get the CSRF token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
