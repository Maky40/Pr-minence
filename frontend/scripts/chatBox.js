import api from "../services/api.js";
import Toast from "../components/toast.js";

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

function showChat(chatType, friendsList) {
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
    updateFriendsList(friendsList);
  }
}

function updateFriendsList(friendsList) {

    friendsList.innerHTML = ""; // On réinitialise la liste pour éviter les doublons
	Promise.all([
        api.apiFetch("/player/friendship/?target=requests", true, "GET"),
        api.apiFetch("/player/friendship/?target=friends", true, "GET")
    ])
    .then(([requestsResponse, friendsResponse]) => {
        friend_list(friendsList, friendsResponse, "friends");
		friend_list(friendsList, requestsResponse, "requests");
        // Vérification si aucune invitation ni ami
        if (requestsResponse.friendships.length === 0 && friendsResponse.friendships.length === 0) {
			const noFriendDiv = document.createElement("div");
			noFriendDiv.classList.add("no-friends-message");

			const friendName = document.createElement("span");
			friendName.classList.add("friend-name");
			friendName.textContent = "Pas encore d'ami ? Prends un Curly 🥜";

			noFriendDiv.appendChild(friendName);
			friendsList.appendChild(noFriendDiv);
		}
    })
    .catch(error => {
        console.error("Erreur lors de la récupération des données : ", error);
    });

    // événement pour le chat
    // friendItem.addEventListener("click", () => openPrivateChat(friend));
}

function friend_list(friendsList, data, api) {
	console.log("Donnees recues :", data);
	if (!data.friendships || data.friendships.length === 0) {
		return;
	}
	friendsList.innerHTML = ''; // Clear existing friends list

	data.friendships.forEach(friend => {
		// Déterminer le statut de l'ami (en ligne ou hors ligne)
		const isOnline = friend.status !== "OF";  // En ligne si status n'est pas "OF"

		// Créer l'élément HTML sous forme de chaîne
		const friendItem = `
			<li class="list-group-item d-flex justify-content-between align-items-center">
				<span class="friend-name" data-username="${friend.id}">${friend.username}</span>
				<span class="badge ${api === "requests" ? "bg-secondary" : (isOnline ? "bg-success" : "bg-danger")}">
					${api === "requests" ? "Pending" : (isOnline ? "En ligne" : "Hors ligne")}
				</span>
			</li>
		`;

		// Ajouter l'élément HTML à la liste
		friendsList.innerHTML += friendItem;
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
	let socketActivate = {};
    // Suppression des anciens boutons pour éviter les duplications
    ["tournament-room", "private-chat", "add-friend", "block-friend", "send-message", "search-friend", "suggestions-container", "requests-list", "friends-list"
	].forEach(id => {
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
	const requestsList = document.getElementById('requests-list');
	const friendsList = document.getElementById('friends-list');

	renderFriendRequests(requestsList)
    // Ajout des nouveaux événements
    if (tournamentButton && privateButton) {
        tournamentButton.addEventListener("click", () => showChat("tournament", friendsList));
        privateButton.addEventListener("click", () => showChat("private", friendsList));
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
	// Supprimer le placeholder quand l'utilisateur clique sur l'input
	searchFriendInput.addEventListener("focus", () => {
		searchFriendInput.placeholder = ""; // Efface le placeholder
	});

	// Remettre le placeholder si l'utilisateur ne tape rien et sort du champ
	searchFriendInput.addEventListener("blur", () => {
		if (searchFriendInput.value.trim() === "") {
			searchFriendInput.placeholder = "Rechercher un ami...";
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
	addFriendButton.addEventListener("click", () => addFriend(searchFriendInput, friendsList));

	// ajout ami en appuyant sur entrer dans la barre de recherche d'ami
	document.addEventListener("keydown", (event) => {
		if (event.key == "Enter"){
			console.log("searchfriendinput = " + searchFriendInput);
			addFriend(searchFriendInput, friendsList);
		}
	});

	requestsList.addEventListener('click', function(event) {
        if (event.target.classList.contains("accept-request")) {
            const friendshipUserID = event.target.getAttribute("data-username");
            console.log("Accepté : ID =", friendshipUserID);
            requestFriend(friendshipUserID, friendsList);

            const card = event.target.closest(".col-md-4");
            if (card) {
                card.remove();
            }
        }
        else if (event.target.classList.contains("reject-request")) {
            const friendshipUserID = event.target.getAttribute("data-username");
            console.log("Rejeté : ID =", friendshipUserID);
            deleteFriend(friendshipUserID);
			const card = event.target.closest(".col-md-4");
            if (card) {
                card.remove();
            }
        }
    });
	friendsList.addEventListener("click", function(event) {
		// Vérifie si l'élément cliqué a la classe "friend-name"
		if (event.target.classList.contains("friend-name")) {
			const otherUserId = event.target.dataset.username; // Récupération de l'ID
			try {

				// Création d'une nouvelle connexion WebSocket
				const socket = new WebSocket(`wss://localhost/chat/ws/chat/${otherUserId}/`);
				socketId = otherUserId;
				socket.onopen = function(event) {
					console.log("Connexion WebSocket ouverte");
				};

				socket.onmessage = function(event) {
					const data = JSON.parse(event.data);
					const message = data.message;

					// Affichage du message dans l'interface utilisateur
					const messageContainer = document.getElementById("chat-box");
					const newMessage = document.createElement("div");
					newMessage.textContent = message;
					newMessage.style.color = "black";
					messageContainer.appendChild(newMessage);
				};

				socket.onclose = function(event) {
					console.log("Connexion WebSocket fermée");
				};


				// Envoi de message
				document.getElementById("send-message").addEventListener("click", function() {
					const message = document.getElementById("message-input").value;
					socket.send(JSON.stringify({ "message": message }));
				});
			} catch (error) {
				console.error("Erreur :", error);
			}
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

async function addFriend(searchFriendInput, friendsList)
{
	const friendName = searchFriendInput.value.trim();
	try {
		const response_id = await api.apiFetch("/player/?username="+friendName, true, "GET")
		console.log(response_id);
		if (response_id.status === 404 || response_id.status === 500){
			const toast = new Toast("Error", "L'utilisateur n'existe pas", "error");
			toast.show();
			return;
		}
		requestFriend(response_id.players[0].id, friendsList);
	}
	catch (error) {
		console.error("Erreur API :", error);
	};
}

async function requestFriend(id, friendsList)
{
	const request_id = {"target_id": id};
	console.log(request_id);
	const response_add = await api.apiFetch("/player/friendship/", true, "POST", request_id);
	if (response_add.status !== 200){
		const toast = new Toast("Error", response_add.message, "error");
		toast.show();
		return ;
	}
	const toast = new Toast("Success", response_add.message, "success");
	toast.show();
	console.log(response_add.status);
	updateFriendsList(friendsList);
}

async function deleteFriend(id)
{
	const request_id = {"target_id": id};
	console.log(request_id);
	const response_add = await api.apiFetch("/player/friendship/", true, "DELETE", request_id);
	if (response_add.status !== 200){
		const toast = new Toast("Error", response_add.message, "error");
		toast.show();
		return ;
	}
	const toast = new Toast("Success", "Demande d'ajout refusee", "success");
	toast.show();
	console.log(response_add.status);
}
// fonctions liste deroulante
async function searchFriends(query, suggestionsContainer, searchFriendInput) {
    if (query.length < 3) {
        suggestionsContainer.innerHTML = "";
        suggestionsContainer.style.display = "none";
        return;
    }
    // Filtrer les joueurs contenant les lettres saisies
    const results = await api.apiFetch("/player/search-players/?username="+query, true, "GET");
	console.log(results);
	showSuggestions(results, suggestionsContainer, searchFriendInput);
}

// Fonction pour afficher les suggestions
function showSuggestions(suggestions, suggestionsContainer, searchFriendInput) {
    suggestionsContainer.innerHTML = "";

    if (suggestions.length === 0) {
        suggestionsContainer.style.display = "none";
        return;
    }

    suggestions.players.forEach(players => {
        const item = document.createElement("li");
        item.classList.add("dropdown-item");
        item.textContent = players.username;
        item.addEventListener("click", () => {
            searchFriendInput.value = players.username;
            suggestionsContainer.style.display = "none";
        });
        suggestionsContainer.appendChild(item);
    });

    suggestionsContainer.style.display = "block";
}

async function renderFriendRequests(requestsList) {
	requestsList.innerHTML = ''; // Clear existing requests
	try {
		const responseFriendRequests = await api.apiFetch("/player/friendship/?target=invites", true, "GET");
		console.log(responseFriendRequests);
		if (responseFriendRequests.friendships.length > 0){
			responseFriendRequests.friendships.forEach(friendships => {
				const requestCard = `
					<div class="col-md-4 mb-3">
						<div class="card">
						<div class="card-body">
							<h5 class="card-title">${friendships.username}</h5>
							<div style="display: flex; flex-direction: column; gap: 8px;">
							<button class="btn btn-success btn-sm accept-request" data-username="${friendships.id}" style="width: 100%;">Accepter</button>
							<button class="btn btn-danger btn-sm reject-request" data-username="${friendships.id}" style="width: 100%;">Refuser</button>
							</div>
						</div>
						</div>
					</div>
				`;
				requestsList.innerHTML += requestCard;
			});
		}
	}
	catch (error) {
		console.error("Erreur API :", error);
	};
}