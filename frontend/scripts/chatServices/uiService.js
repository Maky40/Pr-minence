// uiService.js

import api from "../../services/api.js";
import GameComponent from "../../components/Game/GameComponent.js";
import pong42 from "../../services/pong42.js";
import ModalProfile from "../../components/modal_profile.js";

/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                     CARD FRIEND REQUESTS                   ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

export async function renderFriendRequests(requestsList) {
  requestsList.innerHTML = "";
  try {
    const responseFriendRequests = await api.apiFetch(
      "/player/friendship/?target=invites",
      true,
      "GET"
    );
    if (responseFriendRequests.friendships.length > 0) {
      responseFriendRequests.friendships.forEach((friendships) => {
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
  } catch (error) {
    console.error("Erreur API :", error);
  }
}

/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                     FRIEND LIST MANAGEMENT                 ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

export async function updateFriendsList(friendsList) {
  friendsList.innerHTML = "";
  try {
    const [requestsResponse, friendsResponse] = await Promise.all([
      api.apiFetch("/player/friendship/?target=requests", true, "GET"),
      api.apiFetch("/player/friendship/?target=friends", true, "GET"),
    ]);
    renderFriendList(friendsList, friendsResponse, "friends");
    renderFriendList(friendsList, requestsResponse, "requests");

    if (
      requestsResponse.data.friendships.length === 0 &&
      friendsResponse.data.friendships.length === 0
    ) {
      renderEmptyFriendsList(friendsList);
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des données : ", error);
  }
}

function renderFriendList(friendsList, data, api) {
  if (!data.friendships || data.friendships.length === 0) {
    return;
  }
  data.friendships.forEach((friend) => {
    // Déterminer le statut de l'ami (en ligne ou hors ligne)
    const isOnline = friend.status !== "OF"; // En ligne si status n'est pas "OF"

    // Créer l'élément HTML sous forme de chaîne
    const friendItem = `
			<li class="list-group-item d-flex justify-content-between align-items-center">
				<span class="friend-name" data-friend-id="${friend.id}" data-friend-name="${
      friend.username
    }">${friend.username}</span>
				<span class="badge ${
          api === "requests"
            ? "bg-secondary"
            : isOnline
            ? "bg-success"
            : "bg-danger"
        }">
					${api === "requests" ? "Pending" : isOnline ? "En ligne" : "Hors ligne"}
				</span>
			</li>
		`;

    // Ajouter l'élément HTML à la liste
    friendsList.innerHTML += friendItem;
  });
}

function renderEmptyFriendsList(friendsList) {
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

export function showSuggestions(
  suggestions,
  suggestionsContainer,
  searchFriendInput
) {
  suggestionsContainer.innerHTML = "";

  if (suggestions.length === 0) {
    suggestionsContainer.style.display = "none";
    return;
  }
  suggestions.players.forEach((players) => {
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
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

export function displayInvitation(senderName, senderId, matchId, otherUserId) {
  const messageContainer = document.getElementById("chat-box");
  const newInvitation = document.createElement("div");
  newInvitation.id = `invitation-${matchId}`;

  if (senderId != otherUserId) {
    newInvitation.textContent = "Invitation envoyée ...";
    newInvitation.style.color = "grey";
  } else {
    newInvitation.innerHTML = `
		<p style="color: grey;">Invitation reçue, souhaitez-vous jouer ?</p>
		<div style="display: flex; flex-direction: row; gap: 8px;">
			<button class="btn btn-success btn-sm accept-play" data-id="${matchId}" style="flex: 1;">Accepter</button>
			<button class="btn btn-danger btn-sm refuse-play" data-id="${matchId}" style="flex: 1;">Refuser</button>
		</div>`;
  }
  messageContainer.appendChild(newInvitation);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

export function displayInvitationRefuse(
  senderName,
  senderId,
  matchId,
  otherUserId
) {
  const newInvitation = document.getElementById(`invitation-${matchId}`);
  if (window.inviteForPlay) {
    window.inviteForPlay.closeModalMatchRefused();
  }
  newInvitation.textContent = "Invitation refusee";
  newInvitation.style.color = "red";
}

export function displayInvitationCanceled(
  senderName,
  senderId,
  matchId,
  otherUserId
) {
  const newInvitation = document.getElementById(`invitation-${matchId}`);
  newInvitation.textContent = "Invitation annulee";
  newInvitation.style.color = "orange";
}

export async function displayInvitationAccept(
  senderName,
  senderId,
  matchId,
  otherUserId
) {
  const messageContainer = document.getElementById("chat-box");
  const newInvitation = document.getElementById(`invitation-${matchId}`);
  const chatContainer = document.getElementsByClassName("container")[0];
  // Vérifie que le modal existe dans le DOM
  if (window.inviteForPlay) {
    window.inviteForPlay.closeModalMatchAccepted();
  }
  pong42.player.game = true;
  const game = new GameComponent();
  game.render(chatContainer);
}

export async function displayFriendChat(friendName, blocked) {
  const messToHide = document.getElementById("message-select");
  const userInfos = document.getElementById("user-informations");
  const friendAvatar = document.getElementById("chat-friend-avatar");
  const friendFrontName = document.getElementById("chat-friend-name");
  const inputSendMess = document.getElementById("input-send-mess");
  const chatBox = document.getElementById("chat-box");

  try {
    // Supprimer les anciens écouteurs si présents --> mandatory sinon le modal du profil ne se mettra pas a jour (les evenements s'empilent)
    friendFrontName.replaceWith(friendFrontName.cloneNode(true));
    const updatedFriendFrontName = document.getElementById("chat-friend-name");

    messToHide.classList.add("d-none");
    chatBox.innerHTML = "";

    // Appel API pour récupérer les infos de l'ami
    const response = await api.apiFetch(
      "/player/?username=" + friendName,
      true,
      "GET"
    );
    if (
      !response ||
      !response.players ||
      response.players.length === 0
    ) {
      throw new Error(`Aucun joueur trouvé avec le nom : ${friendName}`);
    }

    const profile = response.players[0];

    // Mise à jour de l'UI avec les nouvelles infos
    updatedFriendFrontName.textContent = friendName;
    friendAvatar.src = profile.avatar;
    userInfos.classList.remove("d-none");
    inputSendMess.style.display = "flex";

    // Gestion du blocage ou non
    if (blocked) blockedElements();
    else unblockedElements();

    // Ajout de l'écouteur pour afficher le profil
    updatedFriendFrontName.addEventListener("click", async () => {
      try {
        const modal = new ModalProfile(profile);
        await modal.render(document.body);
        modal.show();
      } catch (err) {
        console.error("❌ Erreur lors de l'affichage du modal :", err);
        alert(`Erreur lors de l'affichage du modal de ${friendName}`);
      }
    });
  } catch (err) {
    console.error("❌ Erreur dans displayFriendChat :", err);
    alert(`Une erreur est survenue : ${err.message}`);
  }
}

export function blockedElements() {
  const blockFriendButton = document.getElementById("block-friend");
  const inviteFriend = document.getElementById("invite-friend");
  const inputSendMess = document.getElementById("input-send-mess");
  const chatBox = document.getElementById("chat-box");

  inviteFriend.classList.add("d-none");
  inputSendMess.classList.add("d-none");
  blockFriendButton.textContent = "Débloquer";
  blockFriendButton.classList.replace("btn-danger", "btn-secondary");
  chatBox.innerHTML = "";
  const blockedMessage = document.createElement("div");
  blockedMessage.classList.add("text-center", "text-muted", "mt-3");
  blockedMessage.textContent = "Conversation bloquée";
  chatBox.appendChild(blockedMessage);
}

export function unblockedElements() {
  const blockFriendButton = document.getElementById("block-friend");
  const inviteFriend = document.getElementById("invite-friend");
  const inputSendMess = document.getElementById("input-send-mess");

  inviteFriend.classList.remove("d-none");
  inputSendMess.classList.remove("d-none");
  blockFriendButton.textContent = "Bloquer";
  blockFriendButton.classList.replace("btn-secondary", "btn-danger");
}
