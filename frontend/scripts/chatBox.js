<<<<<<< HEAD
// Référence aux boutons et éléments
const tournamentButton = document.getElementById("tournament-room");
const privateButton = document.getElementById("private-chat");
const chatContainer = document.getElementById("chat-container");
const privateChatContainer = document.getElementById("private-chat-container");
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendMessageButton = document.getElementById("send-message");
const searchFriendInput = document.getElementById("search-friend");
const addFriendButton = document.getElementById("add-friend");
const friendsList = document.getElementById("friends-list");
const chatFriendName = document.getElementById("chat-friend-name");
const blockFriendButton = document.getElementById("block-friend");

console.log("Chargement du script...");

// Liste des amis et historique des messages
let friends = [
    { name: "Alice", online: true, messages: [{ text: "Salut !", sender: "Alice" }], blocked: false },
    { name: "Bob", online: false, messages: [{ text: "Hello", sender: "Bob" }], blocked: false },
];

let currentChatFriend = null;

// Fonction pour afficher le chat
function showChat(chatType) {
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

// Fonction pour mettre à jour la liste des amis
function updateFriendsList() {
    friendsList.innerHTML = "";
    friends.forEach((friend) => {
        const friendItem = document.createElement("li");
        friendItem.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center");
        friendItem.textContent = friend.name;
        if (friend.online) {
            friendItem.innerHTML += '<span class="badge bg-success">En ligne</span>';
        } else {
            friendItem.innerHTML += '<span class="badge bg-secondary">Hors ligne</span>';
        }
        friendItem.addEventListener("click", () => openPrivateChat(friend));
        friendsList.appendChild(friendItem);
    });
}

// Fonction pour ouvrir le chat avec un ami
function openPrivateChat(friend) {
    currentChatFriend = friend;
    chatFriendName.textContent = friend.name;
    chatFriendName.style.color = "black";

    // Configurer le bouton de blocage
    blockFriendButton.textContent = friend.blocked ? "Débloquer" : "Bloquer";
    blockFriendButton.classList.toggle("btn-danger", !friend.blocked);
    blockFriendButton.classList.toggle("btn-secondary", friend.blocked);

    displayChatHistory(friend);
}

// Fonction pour afficher l'historique des messages
function displayChatHistory(friend) {
    chatBox.innerHTML = "";

    // Si l'ami est bloqué, n'afficher aucun message
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
        messageDiv.classList.add("message");

        // Messages envoyés (alignés à gauche)
        if (msg.sender === "me") {
            messageDiv.classList.add("sent");
        } else {
            messageDiv.classList.add("received");
        }

        messageDiv.textContent = msg.text;
        chatHistory.appendChild(messageDiv);
    });

    chatBox.appendChild(chatHistory);
}

// Ajout des événements aux boutons
tournamentButton.addEventListener("click", function () {
    showChat("tournament");
});

privateButton.addEventListener("click", function () {
    showChat("private");
});

// Ajout d'un nouvel ami
addFriendButton.addEventListener("click", function () {
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
});

// Gestion du bouton de blocage
blockFriendButton.addEventListener("click", function() {
    if (currentChatFriend) {
        currentChatFriend.blocked = !currentChatFriend.blocked;
        openPrivateChat(currentChatFriend);
    }
});

// Envoi d'un message
sendMessageButton.addEventListener("click", function () {
    sendMessage();
});

messageInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});

// Fonction pour envoyer un message
function sendMessage() {
    const message = messageInput.value.trim();
    if (message && currentChatFriend && !currentChatFriend.blocked) {
        // Ajoute le message à l'historique de l'ami
        currentChatFriend.messages.push({ text: message, sender: "me" });

        // Met à jour l'affichage du chat
        displayChatHistory(currentChatFriend);

        // Réinitialise l'input
        messageInput.value = "";
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// Mise à jour initiale de la liste des amis
updateFriendsList();
=======
// scripts/chatBox.js

function init() {
    const messagesContainer = document.getElementById("messages");
    const messageInput = document.getElementById("chat-message");
    const sendButton = document.getElementById("send-message");

    // Exemple de messages déjà présents
    const messages = [
        { user: "Alice", text: "Bonjour tout le monde !" },
        { user: "Bob", text: "Salut Alice !" },
    ];

    // Fonction pour afficher les messages
    function renderMessages() {
        messagesContainer.innerHTML = ""; // Efface les anciens messages
        messages.forEach((msg) => {
            const messageEl = document.createElement("div");
            messageEl.textContent = `${msg.user}: ${msg.text}`;
            messagesContainer.appendChild(messageEl);
        });
    }

    // Envoyer un message
    function sendMessage() {
        const text = messageInput.value.trim();
        if (text) {
            messages.push({ user: "Vous", text }); // Ajoute le message localement
            renderMessages();
            messageInput.value = "";

            // Simule l'envoi à un backend
            // fetch('/api/chat', { method: 'POST', body: JSON.stringify({ text }) });
        }
    }

    // Ajouter des écouteurs
    sendButton.addEventListener("click", sendMessage);
    messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    });

    // Initialiser les messages
    renderMessages();
}

export { init };
>>>>>>> 1f6a9365ac4b5fc8b49e8d1454ee17c0895d8494
