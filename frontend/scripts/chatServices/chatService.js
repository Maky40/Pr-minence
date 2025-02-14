// chatService.js
export function initWebSocket(otherUserId) {
	const socket = new WebSocket(`wss://localhost/chat/ws/chat/${otherUserId}/`);

	socket.onopen = function(event) {
		console.log("Connexion WebSocket ouverte");
	};

	socket.onmessage = function(event) {
		const data = JSON.parse(event.data);
		const message = data.message;
		displayMessage(message);
	};

	socket.onclose = function(event) {
		console.log("Connexion WebSocket fermée");
	};

	return socket;
}

export function displayMessage(message) {
	const messageContainer = document.getElementById("chat-box");
	const newMessage = document.createElement("div");
	newMessage.textContent = message;
	newMessage.style.color = "black";
	messageContainer.appendChild(newMessage);
}