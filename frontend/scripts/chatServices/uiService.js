// uiService.js

import api from "../../services/api.js";


/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                    TOURNAMENT/PRIVATE CHAT                 ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////


export function showChat(chatType, friendsList) {
    const chatContainer = document.getElementById("chat-container");
    const privateChatContainer = document.getElementById("private-chat-container");
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


/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                     CARD FRIEND REQUESTS                   ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////


export async function renderFriendRequests(requestsList) {
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


/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                     FRIEND LIST MANAGEMENT                 ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////


export async function updateFriendsList(friendsList) {
    friendsList.innerHTML = "";
    try {
        const [requestsResponse, friendsResponse] = await Promise.all([
            api.apiFetch("/player/friendship/?target=requests", true, "GET"),
            api.apiFetch("/player/friendship/?target=friends", true, "GET")
        ]);

        renderFriendList(friendsList, friendsResponse, "friends");
        renderFriendList(friendsList, requestsResponse, "requests");

        if (requestsResponse.friendships.length === 0 && friendsResponse.friendships.length === 0) {
            renderEmptyFriendsList(friendsList);
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des données : ", error);
    }
}

function renderFriendList(friendsList, data, api) {
	console.log("Donnees recues :", data);
	if (!data.friendships || data.friendships.length === 0) {
		return;
	}
	data.friendships.forEach(friend => {
		// Déterminer le statut de l'ami (en ligne ou hors ligne)
		const isOnline = friend.status !== "OF";  // En ligne si status n'est pas "OF"

		// Créer l'élément HTML sous forme de chaîne
		const friendItem = `
			<li class="list-group-item d-flex justify-content-between align-items-center">
				<span class="friend-name" data-friend-id="${friend.id}">${friend.username}</span>
				<span class="badge ${api === "requests" ? "bg-secondary" : (isOnline ? "bg-success" : "bg-danger")}">
					${api === "requests" ? "Pending" : (isOnline ? "En ligne" : "Hors ligne")}
				</span>
			</li>
		`;

		// Ajouter l'élément HTML à la liste
		friendsList.innerHTML += friendItem;
	});
}

function renderEmptyFriendsList(friendsList){
	const noFriendDiv = document.createElement("div");
			  noFriendDiv.classList.add("no-friends-message");

			  const friendName = document.createElement("span");
			  friendName.classList.add("friend-name");
			  friendName.textContent = "Pas encore d'ami ? Prends un Curly 🥜";

			  noFriendDiv.appendChild(friendName);
			  friendsList.appendChild(noFriendDiv);
}


/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                        DROP DOWN LIST                      ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

export function showSuggestions(suggestions, suggestionsContainer, searchFriendInput) {
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

/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                       CHAT BOX MESSAGE                     ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

export function displayMessage(senderName, senderId, message, otherUserId) {
    const messageContainer = document.getElementById("chat-box");
    const newMessage = document.createElement("div");

    if (senderId != otherUserId) {
        newMessage.textContent = "Moi: " + message;
        newMessage.style.color = "blue";
    } else {
        newMessage.textContent = senderName + ": " + message;
        newMessage.style.color = "black";
    }

    messageContainer.appendChild(newMessage);
}