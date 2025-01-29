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
