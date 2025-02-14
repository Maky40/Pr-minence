// main.js
import { requestFriend, deleteFriend, searchFriends, addFriend } from './chatServices/friendsService.js';
import { initWebSocket } from './chatServices/chatService.js';
import { showChat, showSuggestions, renderFriendRequests } from './chatServices/uiService.js';

export function init() {
    console.log("init() called");
    // let socketActivate = {};

    // Initialize UI elements
    const elements = initializeUIElements();

    // Add event listeners
    addEventListeners(elements);

    // Initial render
    renderFriendRequests(elements["requests-list"]);
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

function addEventListeners(elements) {
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

    // // Handle friends list clicks
    // elements["friends-list"].addEventListener("click", handleFriendsListClick);

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
