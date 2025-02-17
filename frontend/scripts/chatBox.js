// main.js
import { requestFriend, deleteFriend, searchFriends, addFriend } from './chatServices/friendsService.js';
import { initWebSocket, closeAndOpenNew, sendMessage } from './chatServices/liveChatService.js';
import { showChat, showSuggestions, renderFriendRequests } from './chatServices/uiService.js';
import Toast from "../../components/toast.js";
import api from "../../services/api.js";

export async function init() {
    console.log("init() called");
	let socketActivate = {};
	let currentUser = {};

	// Initialize currentUser
	await initializeCurrentUser(currentUser);

	// Initialize UI elements
    const elements = initializeUIElements();

    // Add event listeners
    addEventListeners(elements, socketActivate, currentUser);

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

function addEventListeners(elements, socketActivate, currentUser) {

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

    // // Add friend functionality
    elements["add-friend"].addEventListener("click", () => addFriend(elements["search-friend"].value, elements["friends-list"]));

    // Handle friend requests
    elements["requests-list"].addEventListener("click", (event) => handleRequestsClick(event, elements));

    // Handle friends list clicks
    elements["friends-list"].addEventListener("click", (event) => handleFriendsListClick(event, socketActivate, currentUser));

	// Handle send message button
	elements["send-message"].addEventListener("click", () => handleSendMessage(socketActivate, currentUser, elements["message-input"]))

}

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

function handleFriendsListClick(event, socketActivate, currentUser) {
    try {
        const friendName = event.target.closest('.friend-name');
        const otherUserId = friendName.dataset.friendId;

        if (Object.keys(socketActivate).length === 0)
            initWebSocket(otherUserId, socketActivate, currentUser);
        else if (socketActivate.otherUserId !== otherUserId)
            closeAndOpenNew(otherUserId, socketActivate, currentUser)
    } catch (error) {
        console.error("Erreur API :", error);
    }
}

function handleSendMessage(socketActivate, currentUser, messageInput) {
	if (Object.keys(socketActivate). length === 0) {
		const toast = new Toast("Error", "Veuillez selectionner un ami avant d'envoyer un message", "error");
		toast.show();
		return ;
	}
	const message = messageInput.value.trim();
	sendMessage(socketActivate, currentUser, message);
}