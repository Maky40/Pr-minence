import { requestFriend, deleteFriend, searchFriends, addFriend, verifyFriend } from './chatServices/friendsService.js';
import { initWebSocket, closeAndOpenNew, sendMessage, inviteForPlay } from './chatServices/liveChatService.js';
import { showSuggestions, renderFriendRequests, displayFriendChat, blockedElements, unblockedElements, updateFriendsList } from './chatServices/uiService.js';
import Toast from "../../components/toast.js";
import api from "../../services/api.js";
import pong42 from "../services/pong42.js";
import WebSocketAPI from '../services/websocket.js';
import { ENV } from "../env.js";
import auth from "../services/auth.js";
import { changePage } from '../utils/Page.js';

export async function init() {
    console.log("init() called");
	let socketActivate = {};
	let currentUser = {};
	let otherUser = {};

	// Verify authentication
	// if (!pong42.authenticated)
	// 	changePage("connexion");
	// Initialize currentUser
	await initializeCurrentUser(currentUser);

	// Initialize UI elements
    const elements = initializeUIElements();

    // Add event listeners
    addEventListeners(elements, socketActivate, currentUser, otherUser);

    // Initial render
    renderFriendRequests(elements["requests-list"]);
	updateFriendsList(elements["friends-list"]);

	setInterval(() => {
		const updateRequestList = document.getElementById("requests-list")
		if (updateRequestList)
			renderFriendRequests(updateRequestList);
	}, 60000);

	auth.webSocketStatus.addMessageListener("message", (event) => {
		const data = JSON.parse(event);
		if (data.type === "status_update")
			updateFriendsList(elements["friends-list"]);
	});
}

async function initializeCurrentUser(currentUser) {
	const response = await api.apiFetch("/player/", true, "GET")
	if (response && response.player) {
		currentUser.username = response.player.username;
		currentUser.id = response.player.id;
	} else {
		console.error("Erreur : réponse API invalide", response);
	}
}

function initializeUIElements() {
    const elements = {};

    ["tournament-room", "private-chat", "add-friend", "block-friend", "send-message",
     "search-friend", "suggestions-container", "requests-list", "friends-list",
	 "message-input", "invite-friend", "chat-box"
    ].forEach(id => {
        const oldElement = document.getElementById(id);
        if (oldElement) {
            oldElement.replaceWith(oldElement.cloneNode(true));
        }
        elements[id] = document.getElementById(id);
    });

    elements.messageInput = document.getElementById("message-input");

    return elements;
}

function addEventListeners(elements, socketActivate, currentUser, otherUser) {

    // // Search functionality
    elements["search-friend"].addEventListener("focus", () => handleSearchFocus(elements));
    elements["search-friend"].addEventListener("blur", () => handleSearchBlur(elements["search-friend"]));
    elements["search-friend"].addEventListener("input", (event) => handleSearchInput(event.target.value, elements));
	document.addEventListener("click", (event) => hideDropDownList(event, elements));

    // Add friend functionality
    elements["add-friend"].addEventListener("click", () => addFriend(elements["search-friend"].value.trim(), elements["friends-list"]));
	elements["search-friend"].addEventListener("keydown", (event) => handlePushEnterFriend(event, elements["search-friend"].value.trim(), elements["friends-list"]))

    // Handle friend requests
    elements["requests-list"].addEventListener("click", (event) => handleRequestsClick(event, elements));

    // Handle friends list clicks
    elements["friends-list"].addEventListener("click", (event) => handleFriendsListClick(event, socketActivate, currentUser, otherUser));

	// Handle send message
	elements["send-message"].addEventListener("click", () => handleSendMessage(socketActivate, currentUser, elements["message-input"]));
	elements["message-input"].addEventListener("keydown", (event) => handlePushEnterMessage(event, socketActivate, currentUser, elements["message-input"]));

	// Handle block/unblock click
	elements["block-friend"].addEventListener("click", () => handleBlockFriend(socketActivate, currentUser, otherUser));

	// Handle play click
	elements["invite-friend"].addEventListener("click", () => handleInvitePlay(socketActivate, currentUser));
	elements["chat-box"].addEventListener("click", (event) => {
		if (event.target.classList.contains("accept-play"))
			handleAcceptPlay(event, currentUser, socketActivate);
		else if (event.target.classList.contains("refuse-play"))
			handleRefusePlay(event, currentUser, socketActivate)
	})
}






//╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
//║                                                                      EVENT FUNCTIONS                                                                       ║
//╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝



/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                     SEARCH FUNCTIONALITY                   ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////


function handleSearchFocus(elements){
	const currentValue = elements["search-friend"].value;
	if (currentValue)
		handleSearchInput(currentValue, elements);
	else
		elements["search-friend"].placeholder = "";
}

function handleSearchBlur(search_friend) {
	if (search_friend.value.trim() === "")
		search_friend.placeholder = "Rechercher un ami...";
}

async function handleSearchInput(query, elements) {
	const results = await searchFriends(query, elements["suggestions-container"], elements["search-friend"]);
	showSuggestions(results, elements["suggestions-container"], elements["search-friend"]);
}

function hideDropDownList(event, elements) {
	if (!elements["search-friend"].contains(event.target) && !elements["suggestions-container"].contains(event.target))
			elements["suggestions-container"].style.display = "none";
}



/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                  ADD FRIEND FUNCTIONALITY                  ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////


function handlePushEnterFriend(event, friendToAdd, friendsList) {
	if (event.key === "Enter" && friendToAdd)
		addFriend(friendToAdd, friendsList);
}


/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                       FRIENDS REQUESTS                     ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////


async function handleRequestsClick(event, elements) {
    // Vérifie si le clic était sur un bouton accept ou reject
    const acceptButton = event.target.closest('.accept-request');
    const rejectButton = event.target.closest('.reject-request');
	const card = event.target.closest(".col-md-4");

    if (acceptButton) {
        const userId = acceptButton.dataset.username;
		const isAlreadyFriend = await verifyFriend(userId);
		if (isAlreadyFriend) {
			card.remove();
			return;
		}
        requestFriend(userId, elements["friends-list"]);
    }
    else if (rejectButton) {
        const userId = rejectButton.dataset.username;
		const isAlreadyFriend = await verifyFriend(userId);
		console.log(isAlreadyFriend);
		if (isAlreadyFriend) {
			card.remove();
			return;
		}
        deleteFriend(userId);
    }
	if (card) {
		card.remove();
	}
}



/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                      FRIEND LIST CLICK                     ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////


async function handleFriendsListClick(event, socketActivate, currentUser, otherUser) {
    try {
        const friend = event.target.closest('.list-group-item').querySelector('.friend-name');
		if (otherUser.id === friend.dataset.friendId)
			return;
        otherUser.id = friend.dataset.friendId;
		otherUser.username = friend.dataset.friendName;
		console.log("data : " + otherUser.id + "     " + otherUser.username);
		const response = await api.apiFetch("chat/is_blocked/?id="+otherUser.id, true, "GET");
		console.log("API RESPONSE = ", response);
		await displayFriendChat(otherUser.username, response.is_blocked_by_me);
		if (response.is_blocked_by_me){
			if (socketActivate.socket){
				socketActivate.socket.close();
				delete socketActivate.otherUserId;
				delete socketActivate.socket;}
			return ;
		}
        if (Object.keys(socketActivate).length === 0)
            initWebSocket(otherUser.id, socketActivate, currentUser);
        else if (socketActivate.otherUserId !== otherUser.id)
            closeAndOpenNew(otherUser.id, socketActivate, currentUser)
    } catch (error) {
        console.error("Erreur API :", error);
		console.error(error.stack);
    }
}


/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                        SEND MESSAGE                        ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////


function handleSendMessage(socketActivate, currentUser, messageInput) {
	if (Object.keys(socketActivate). length === 0) {
		const toast = new Toast("Error", "Veuillez selectionner un ami avant d'envoyer un message", "error");
		toast.show();
		return ;
	}
	const message = messageInput.value.trim();
	sendMessage(socketActivate, currentUser, message);
	messageInput.value = "";
}

function handlePushEnterMessage(event, socketActivate, currentUser, messageInput) {
	if (event.key === "Enter" && messageInput.value.trim())
		handleSendMessage(socketActivate, currentUser, messageInput)
}

/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                    BLOCK/UNBLOCK CLICK                     ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

async function handleBlockFriend(socketActivate, currentUser, otherUser) {

	const chatBox = document.getElementById("chat-box");

	await api.apiFetch("/chat/is_blocked/?id="+otherUser.id, true, "POST")
	const response = await api.apiFetch("/chat/is_blocked/?id="+otherUser.id, true, "GET");
	if (response.is_blocked_by_me){
		blockedElements();
		socketActivate.socket.close();
		delete socketActivate.socket;
		delete socketActivate.otherUserId;
	}
	else {
		unblockedElements();
		chatBox.innerHTML ='';
		initWebSocket(otherUser.id, socketActivate, currentUser);
	}
}

/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                  HANDLE PLAY WITH FRIEND                   ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////


async function handleInvitePlay(socketActivate, currentUser) {
	try {
		await friendshipVerifications(socketActivate);
		await inviteForPlay(socketActivate, currentUser);

	}
	catch (error){
		const toast = new Toast("Error", error, "error");
		toast.show();
	}
}

async function friendshipVerifications(socketActivate) {
	if (Object.keys(socketActivate).length !== 2)
		throw new Error ("Veuillez reessayer");
	const response =  await api.apiFetch("/player/friendship/?target=friends", true, "GET");
	if (response.friendships.length===0) {
		throw new Error("Vous n'etes pas encore pote");
	}
}

async function handleAcceptPlay(event, currentUser, socketActivate) {
	try {

		const buttonAccept = event.target;
		const matchId = buttonAccept.getAttribute("data-id");
		await api.apiFetch("pong/match/individual/accept/", true, "POST", { match_id: matchId })
		const payload = {
				type: 'invitation_play',
				senderId : currentUser.id,
				senderName: currentUser.username,
				message: "accept",
				matchId: matchId,
			};
		const ws = new WebSocketAPI(`${ENV.WS_URL_GAME}${matchId}/`);
		pong42.player.match_id = matchId;
		pong42.player.paddle = "right";
		pong42.player.socketMatch = ws;
		socketActivate.socket.send(JSON.stringify(payload));
	}
	catch (error) {
		const toast = new Toast("Error", error, "error");
		toast.show();
		console.log(error);
	}
}

function handleRefusePlay(event, currentUser, socketActivate) {
	try {
		const buttonRefuse = event.target;
		const matchId = buttonRefuse.getAttribute("data-id");
		api.apiFetch("pong/match/individual/refuse/", true, "POST", { match_id: matchId })
			.then(response => console.log("Réponse API :", response))
			.catch(error => console.error("Erreur API :", error.message));
		const payload = {
				type: 'invitation_play',
				senderId : currentUser.id,
				senderName: currentUser.username,
				message: "refuse",
				matchId: matchId,
			};

		socketActivate.socket.send(JSON.stringify(payload));
	}
	catch (error) {
		const toast = new Toast("Error", error, "error");
		toast.show();
	}
}