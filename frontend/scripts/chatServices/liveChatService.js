import api from "../../services/api.js";
import { templateManager } from "../app.js";
import { displayMessage, displayInvitation, displayInvitationRefuse, displayInvitationAccept } from "./uiService.js";
import pong42 from "../../../services/pong42.js";
import WebSocketAPI from "../../services/websocket.js"

/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                    SOCKET CHAT MANAGEMENT                  ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

export function initWebSocket(otherUserId, socketActivate, currentUser) {
    const ws = new WebSocket(`wss://localhost/chat/ws/chat/${otherUserId}/`);
    templateManager.addWebSocket(ws);
	socketActivate.socket = ws;
	socketActivate.otherUserId = otherUserId;

	setupWebSocketListeners(socketActivate, otherUserId, currentUser);
}

export function closeAndOpenNew(otherUserId, socketActivate, currentUser) {
	socketActivate.socket.close();
	initWebSocket(otherUserId, socketActivate, currentUser)
}

export function setupWebSocketListeners(socketActivate, otherUserId) {
    if (!socketActivate.socket) {
        console.error("WebSocket non initialisée");
        return;
    }

    socketActivate.socket.onmessage = (event) => {
        try {
			const data = JSON.parse(event.data);
			console.log("Message reçu : ", data);  // Ajoute un log pour voir ce qui est reçu
			if (data.type === "chat_message")
				displayMessage(data.senderName, data.senderId, data.message, otherUserId);
			else if (data.message === "invitation")
			{
				console.log("JE SUIS DANS INVITATION");
				console.log("VOICI LE BODY : ", data.message);
				displayInvitation(data.senderName, data.senderId, data.matchId, otherUserId);
			}
			else if (data.message === "refuse"){
				console.log("JE SUIS DANS REFUSE");
				console.log("VOICI LE BODY : ", data.message);
				displayInvitationRefuse(data.senderName, data.senderId, data.matchId, otherUserId);}
			else{
				console.log("JE SUIS DANS ACCEPT");
				console.log("VOICI LE BODY : ", data.message);
				displayInvitationAccept(data.senderName, data.senderId, data.matchId, otherUserId);
			}
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
    if (!socketActivate.socket || socketActivate.socket.readyState !== WebSocket.OPEN) {
        console.error("WebSocket non connecté");
        return;
    }

    const payload = {
        type: 'chat_message',
        senderId: currentUser.id,
		senderName: currentUser.username,
        message: message,
    };

    socketActivate.socket.send(JSON.stringify(payload));
}

/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                      INVITE FOR PLAY                       ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

export async function inviteForPlay(socketActivate, currentUser) {
	const response = await api.apiFetch("pong//match/individual/create/", true, "POST");
	let id_match = response.match_id;
	const payload = {
		type: 'invitation_play',
		senderId : currentUser.id,
		senderName: currentUser.username,
		message: "invitation",
		matchId: id_match,
	};
	console.log("PAYLOAD :", payload);
	const ws = new WebSocketAPI(`wss://localhost/pong/ws/pong/${id_match}/`);
	pong42.player.match_id = id_match;
	pong42.player.paddle = "left";
	pong42.player.socketMatch = ws;
	socketActivate.socket.send(JSON.stringify(payload));
}