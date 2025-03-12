
async function chatStart() {
  const targetUsername = prompt("Enter the username of the person you want to chat with:");

  if (!targetUsername) {
    alert("You must enter a username to start a private chat.");
    return;
  }

  const chatSocket = new WebSocket("ws://" + window.location.host + "/");
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
      alert("You cannot send an empty message.");
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

    // Create buttons
    var button1 = document.createElement("button");
    button1.innerHTML = "profile";
    button1.style.fontSize = "8px";
    button1.onclick = function() {
      window.location.href = `/profile/${data.username}`;
    };

    var button2 = document.createElement("button");
    button2.innerHTML = "invite";
    button2.style.fontSize = "8px";
    button2.onclick = function() {
      window.location.href = `/invite/${data.username}`;
    };

    // Create a span for the username and buttons
    var userSpan = document.createElement("span");
    userSpan.innerHTML = data.username + " ";
    userSpan.appendChild(button1);
    userSpan.appendChild(button2);
    userSpan.appendChild(document.createTextNode(" : "));

    // Append the username span and message to the div
    div.appendChild(userSpan);
    div.appendChild(document.createTextNode(data.message));

    document.querySelector("#id_message_send_input").value = "";
    document.querySelector("#id_chat_item_container").appendChild(div);
  }
}
