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
const fakePlayersDB = [
    { name: "Alice" },
    { name: "Alicia" },
    { name: "Bob" },
    { name: "Bobby" },
    { name: "Charlie" },
    { name: "Charlotte" },
    { name: "David" },
    { name: "Daniel" },
    { name: "Eve" },
    { name: "Evelyn" }
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

    friendsList.innerHTML = ""; // On réinitialise la liste pour éviter les doublons

    friends.forEach((friend) => {
        const friendItem = document.createElement("li");
        friendItem.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center");

        const friendName = document.createElement("span");
        friendName.classList.add("friend-name");
        friendName.textContent = friend.name;

        const onlineStatus = document.createElement("span");
        onlineStatus.classList.add("badge", friend.online ? "bg-success" : "bg-secondary");
        onlineStatus.textContent = friend.online ? "En ligne" : "Hors ligne";

        friendItem.appendChild(friendName);
        friendItem.appendChild(onlineStatus);
        friendsList.appendChild(friendItem);

        // Ajout d'un seul écouteur d'événement
        friendItem.addEventListener("click", () => openPrivateChat(friend));
    });
}

function openPrivateChat(friend) {
  const chatFriendName = document.getElementById("chat-friend-name");
  const blockFriendButton = document.getElementById("block-friend");

    currentChatFriend = friend;
    chatFriendName.textContent = friend.name;

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
    console.log("init() called");

    // Suppression des anciens boutons pour éviter les duplications
    ["tournament-room", "private-chat", "add-friend", "block-friend", "send-message", "search-friend", "suggestions-container"].forEach(id => {
        const oldButton = document.getElementById(id);
        if (oldButton) {
            oldButton.replaceWith(oldButton.cloneNode(true)); // Remplace l'ancien bouton par un clone sans événements
        }
    });

    // Récupération des nouveaux boutons sans anciens événements
    const tournamentButton = document.getElementById("tournament-room");
    const privateButton = document.getElementById("private-chat");
    const addFriendButton = document.getElementById("add-friend");
    const blockFriendButton = document.getElementById("block-friend");
    const sendMessageButton = document.getElementById("send-message");
    const messageInput = document.getElementById("message-input");
	const searchFriendInput = document.getElementById("search-friend");
	const suggestionsContainer = document.getElementById("suggestions-container");

    // Ajout des nouveaux événements
    if (tournamentButton && privateButton) {
        tournamentButton.addEventListener("click", () => showChat("tournament"));
        privateButton.addEventListener("click", () => showChat("private"));
    }

    blockFriendButton.addEventListener("click", () => {
        if (currentChatFriend) {
            currentChatFriend.blocked = !currentChatFriend.blocked;

            blockFriendButton.textContent = currentChatFriend.blocked ? "Débloquer" : "Bloquer";
            blockFriendButton.classList.toggle("btn-danger", !currentChatFriend.blocked);
            blockFriendButton.classList.toggle("btn-secondary", currentChatFriend.blocked);

            displayChatHistory(currentChatFriend);
        }
    });

    sendMessageButton.addEventListener("click", sendMessage);
    messageInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            sendMessage();
        }
    });
	// Ajout d'un écouteur d'événement pour la recherche
	searchFriendInput.addEventListener("input", (event) => {
		searchFriends(event.target.value, suggestionsContainer, searchFriendInput);
	});

	// Cacher la liste lorsqu'on clique ailleurs
	document.addEventListener("click", (event) => {
		if (!searchFriendInput.contains(event.target) && !suggestionsContainer.contains(event.target)) {
			suggestionsContainer.style.display = "none";
		}
	});

	// ajout ami via bouton ajouter un ami
	addFriendButton.addEventListener("click", () => addFriend(searchFriendInput));

	// ajout ami en appuyant sur entrer dans la barre de recherche d'ami
	document.addEventListener("keydown", (event) => {
		if (event.key == "Enter"){
			addFriend(searchFriendInput);
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

function addFriend(searchFriendInput)
{
	const friendName = searchFriendInput.value.trim();
	if (friendName) {
		friends.push({
			name: friendName,
			online: Math.random() > 0.5,
			messages: [],
			blocked: false
		});
		searchFriendInput.value = "";
		updateFriendsList();
	}
};
// fonctions liste deroulante
function searchFriends(query, suggestionsContainer, searchFriendInput) {
    if (query.length < 3) {
        suggestionsContainer.innerHTML = "";
        suggestionsContainer.style.display = "none";
        return;
    }

    // Filtrer les joueurs contenant les lettres saisies
    const results = fakePlayersDB.filter(player =>
        player.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5); // Limiter à 5 résultats

    showSuggestions(results, suggestionsContainer, searchFriendInput);
}

// Fonction pour afficher les suggestions
function showSuggestions(suggestions, suggestionsContainer, searchFriendInput) {
    suggestionsContainer.innerHTML = "";

    if (suggestions.length === 0) {
        suggestionsContainer.style.display = "none";
        return;
    }

    suggestions.forEach(player => {
        const item = document.createElement("li");
        item.classList.add("dropdown-item");
        item.textContent = player.name;
        item.addEventListener("click", () => {
            searchFriendInput.value = player.name;
            suggestionsContainer.style.display = "none";
        });
        suggestionsContainer.appendChild(item);
    });

    suggestionsContainer.style.display = "block";
}
