import api from "../../services/api.js";
import { templateManager } from "../app.js";
import {
  displayMessage,
  displayInvitation,
  displayInvitationRefuse,
  displayInvitationAccept,
  displayInvitationCanceled,
} from "./uiService.js";
import pong42 from "../../../services/pong42.js";
import WebSocketAPI from "../../services/websocket.js";
import { ENV } from "../../env.js";
import InviteForPlayComponent from "../../components/modal_play.js";
import Toast from "../../components/toast.js";
/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                    SOCKET CHAT MANAGEMENT                  ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

export function initWebSocket(otherUserId, socketActivate, currentUser) {
  const ws = new WebSocket(`${ENV.WS_URL_CHAT}${otherUserId}/`);
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
      if (data.type === "chat_message")
        displayMessage(
          data.senderName,
          data.senderId,
          data.message,
          otherUserId
        );
        else if (data.type === "error"){
          const toast = new Toast("Error", "Pas de message a plus de 500 caracteres SAPERLIPOPETTE", "error");
		      toast.show();
        }
      else if (data.message === "invitation") {
        displayInvitation(
          data.senderName,
          data.senderId,
          data.matchId,
          otherUserId
        );
      } else if (data.message === "refuse") {
        displayInvitationRefuse(
          data.senderName,
          data.senderId,
          data.matchId,
          otherUserId
        );
      } else if (data.message === "annuler") {
        displayInvitationCanceled(
          data.senderName,
          data.senderId,
          data.matchId,
          otherUserId
        );
      } else {
        displayInvitationAccept(
          data.senderName,
          data.senderId,
          data.matchId,
          otherUserId
        );
      }
    } catch (error) {
      console.error("Erreur de traitement du message reçu :", error);
    }
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

/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                      INVITE FOR PLAY                       ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

export async function inviteForPlay(socketActivate, currentUser) {
  const response = await api.apiFetch(
    "pong/match/individual/create/",
    true,
    "POST"
  );
  let id_match = response.match_id;
  const payload = {
    type: "invitation_play",
    senderId: currentUser.id,
    senderName: currentUser.username,
    message: "invitation",
    matchId: id_match,
  };
  const ws = new WebSocketAPI(`${ENV.WS_URL_GAME}${id_match}/`);
  pong42.player.match_id = id_match;
  pong42.player.paddle = "left";
  pong42.player.socketMatch = ws;
  socketActivate.socket.send(JSON.stringify(payload));

  window.inviteForPlay = new InviteForPlayComponent(
    socketActivate,
    pong42.player
  );
  window.inviteForPlay.render(document.body);
  window.inviteForPlay.show();
}
