// main.js
import { requestFriend, deleteFriend, searchFriends, addFriend } from './chatServices/friendsService.js';
import { initWebSocket, closeAndOpenNew, sendMessage } from './chatServices/liveChatService.js';
import { showChat, showSuggestions, renderFriendRequests, displayFriendChat, blockedElements, unblockedElements } from './chatServices/uiService.js';
import Toast from "../../components/toast.js";
import api from "../../services/api.js";

export async function init() {
    console.log("init() called");
	let socketActivate = {};
	let currentUser = {};
	let otherUser = {};

	// Initialize currentUser
	await initializeCurrentUser(currentUser);

	// Initialize UI elements
    const elements = initializeUIElements();

    // Add event listeners
    addEventListeners(elements, socketActivate, currentUser, otherUser);

    // Initial render
    renderFriendRequests(elements["requests-list"]);
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
     "search-friend", "suggestions-container", "requests-list", "friends-list", "message-input"
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

    // Chat type buttons
    if (elements["tournament-room"] && elements["private-chat"]) {
        elements["tournament-room"].addEventListener("click", () => showChat("tournament", elements["friends-list"]));
        elements["private-chat"].addEventListener("click", () => showChat("private", elements["friends-list"]));
    }

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
	elements["send-message"].addEventListener("click", () => handleSendMessage(socketActivate, currentUser, elements["message-input"]))
	elements["message-input"].addEventListener("keydown", (event) => handlePushEnterMessage(event, socketActivate, currentUser, elements["message-input"]))

	// Handle block/unblock click
	elements["block-friend"].addEventListener("click", () => handleBlockFriend(socketActivate, currentUser, otherUser))
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


function handleRequestsClick(event, elements) {
    // Vérifie si le clic était sur un bouton accept ou reject
    const acceptButton = event.target.closest('.accept-request');
    const rejectButton = event.target.closest('.reject-request');
	const card = event.target.closest(".col-md-4");

    if (acceptButton) {
        const userId = acceptButton.dataset.username;
        requestFriend(userId, elements["friends-list"]);}
    else if (rejectButton) {
        const userId = rejectButton.dataset.username;
        deleteFriend(userId);}
	if (card) {
		card.remove();}
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
		const response = await api.apiFetch("/chat/is_blocked/?id="+otherUser.id, true, "GET");
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