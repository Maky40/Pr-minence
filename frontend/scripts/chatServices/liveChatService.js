import { templateManager } from "../app.js";
import { displayMessage } from "./uiService.js";

/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                    SOCKET CHAT MANAGEMENT                  ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

export function initWebSocket(otherUserId, socketActivate, currentUser) {
  const ws = new WebSocket(`wss://${API_URL}/chat/ws/chat/${otherUserId}/`);
  templateManager.addWebSocket(ws);
  socketActivate.socket = ws;
  socketActivate.otherUserId = otherUserId;

  setupWebSocketListeners(socketActivate, otherUserId, currentUser);
}

export function closeAndOpenNew(otherUserId, socketActivate, currentUser) {
  socketActivate.socket.close();
  initWebSocket(otherUserId, socketActivate, currentUser);
}

export function setupWebSocketListeners(socketActivate, otherUserId) {
  if (!socketActivate.socket) {
    console.error("WebSocket non initialisée");
    return;
  }

  socketActivate.socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("Message reçu : ", data); // Ajoute un log pour voir ce qui est reçu
      displayMessage(data.senderName, data.senderId, data.message, otherUserId);
    } catch (error) {
      console.error("Erreur de traitement du message reçu :", error);
    }
  };

  socketActivate.socket.onerror = (event) => {
    console.error("WebSocket erreur :", event);
  };

  socketActivate.socket.onclose = (event) => {
    console.log("WebSocket fermée :", event);
  };
}

/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                       SEND CHAT MESSAGE                    ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

export function sendMessage(socketActivate, currentUser, message) {
  if (
    !socketActivate.socket ||
    socketActivate.socket.readyState !== WebSocket.OPEN
  ) {
    console.error("WebSocket non connecté");
    return;
  }

  const payload = {
    type: "chat_message",
    senderId: currentUser.id,
    senderName: currentUser.username,
    message: message,
  };

  socketActivate.socket.send(JSON.stringify(payload));
}
