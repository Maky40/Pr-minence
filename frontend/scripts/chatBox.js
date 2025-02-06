// Liste des amis et historique des messages
let friends = [
  {
    name: "Alice",
    online: true,
    messages: [{ text: "Salut !", sender: "Alice" }],
    blocked: false,
  },
  {
    name: "Bob",
    online: false,
    messages: [{ text: "Hello", sender: "Bob" }],
    blocked: false,
  },
];

let currentChatFriend = null;

function showChat(chatType) {
  const chatContainer = document.getElementById("chat-container");
  const privateChatContainer = document.getElementById(
    "private-chat-container"
  );
  const chatBox = document.getElementById("chat-box");

  if (!chatContainer || !privateChatContainer || !chatBox) {
    console.error("Chat elements not found");
    return;
  }

  chatContainer.style.display = "block";
  if (chatType === "tournament") {
    privateChatContainer.style.display = "none";
    chatBox.innerHTML = "<h4>Tournament Chat</h4>";
  } else {
    privateChatContainer.style.display = "block";
    chatBox.innerHTML = "";
    updateFriendsList();
  }
}

function updateFriendsList() {
  const friendsList = document.getElementById("friends-list");

  if (!friendsList) {
    console.error("Friends list element not found");
    return;
  }

  friendsList.innerHTML = ""; // On réinitialise la liste pour ne pas avoir de doublons

  // On parcourt chaque ami de la liste 'friends'
  friends.forEach((friend) => {
    const friendItem = document.createElement("li");
    friendItem.classList.add(
      "list-group-item",
      "d-flex",
      "justify-content-between",
      "align-items-center"
    );

    // Créer l'élément pour le prénom
    const friendName = document.createElement("span");
    friendName.classList.add("friend-name"); // Classe pour styliser le prénom
    friendName.textContent = friend.name;

    // Ajouter le badge "En ligne" ou "Hors ligne"
    const onlineStatus = document.createElement("span");
    onlineStatus.classList.add(
      "badge",
      friend.online ? "bg-success" : "bg-secondary"
    );
    onlineStatus.textContent = friend.online ? "En ligne" : "Hors ligne";

    // Ajouter les éléments au li
    friendItem.appendChild(friendName);
    friendItem.appendChild(onlineStatus);

    // Ajouter l'élément li à la liste
    friendsList.appendChild(friendItem);
    friendItem.addEventListener("click", () => openPrivateChat(friend));
  });
}

function openPrivateChat(friend) {
  const chatFriendName = document.getElementById("chat-friend-name");
  const blockFriendButton = document.getElementById("block-friend");

  currentChatFriend = friend;
  chatFriendName.textContent = friend.name;
  chatFriendName.style.color = "black";

  blockFriendButton.textContent = friend.blocked ? "Débloquer" : "Bloquer";
  blockFriendButton.classList.toggle("btn-danger", !friend.blocked);
  blockFriendButton.classList.toggle("btn-secondary", friend.blocked);

  displayChatHistory(friend);
}

function displayChatHistory(friend) {
  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML = "";

  if (friend.blocked) {
    const blockedMessage = document.createElement("div");
    blockedMessage.classList.add("text-center", "text-muted", "mt-3");
    blockedMessage.textContent = "Conversation bloquée";
    chatBox.appendChild(blockedMessage);
    return;
  }

  const chatHistory = document.createElement("div");
  chatHistory.classList.add("chat-history");

  friend.messages.forEach((msg) => {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add(
      "message",
      msg.sender === "me" ? "sent" : "received"
    );
    messageDiv.textContent = msg.text;
    chatHistory.appendChild(messageDiv);
  });

  chatBox.appendChild(chatHistory);
}

export function init() {
  const tournamentButton = document.getElementById("tournament-room");
  const privateButton = document.getElementById("private-chat");
  const addFriendButton = document.getElementById("add-friend");
  const blockFriendButton = document.getElementById("block-friend");
  const messageInput = document.getElementById("message-input");
  const sendMessageButton = document.getElementById("send-message");

  if (tournamentButton && privateButton) {
    tournamentButton.addEventListener("click", () => showChat("tournament"));
    privateButton.addEventListener("click", () => showChat("private"));
  }
  console.log("ChatBox initialized");
  addFriendButton.addEventListener("click", () => {
    const searchFriendInput = document.getElementById("search-friend");
    const friendName = searchFriendInput.value.trim();
    if (friendName) {
      friends.push({
        name: friendName,
        online: Math.random() > 0.5,
        messages: [],
        blocked: false,
      });
      searchFriendInput.value = "";
      updateFriendsList();
    }
  });

  blockFriendButton.addEventListener("click", () => {
    if (currentChatFriend) {
      currentChatFriend.blocked = !currentChatFriend.blocked;
      openPrivateChat(currentChatFriend);
    }
  });

  sendMessageButton.addEventListener("click", sendMessage);
  messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  });
}

function sendMessage() {
  const messageInput = document.getElementById("message-input");
  const chatBox = document.getElementById("chat-box");
  const message = messageInput.value.trim();

  if (message && currentChatFriend && !currentChatFriend.blocked) {
    currentChatFriend.messages.push({ text: message, sender: "me" });
    displayChatHistory(currentChatFriend);
    messageInput.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}
