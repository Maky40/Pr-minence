import pong42 from "./pong42.js";

class WebSocketAPI {
  constructor() {
    this.socket = null;
    this.listeners = new Set();
    this.init();
  }

  init() {
    try {
      this.socket = new WebSocket("wss://localhost/authentication/ws/online/");

      this.socket.addEventListener("message", (event) => {
        console.log("Message reçu:", event.data);
        pong42.player.updateStatus("ON");
      });

      this.socket.addEventListener("error", (event) => {
        console.error("WebSocket erreur:", event);
      });

      this.socket.addEventListener("close", (event) => {
        console.log(
          "WebSocket fermé. Code:",
          event.code,
          "Raison:",
          event.reason
        );
        // Tenter de reconnecter après un délai
        setTimeout(() => this.init(), 5000);
      });
    } catch (error) {
      console.error("Erreur d'initialisation WebSocket:", error);
    }
  }

  onOpen(callback) {
    this.socket.onopen = callback;
  }
}

export default WebSocketAPI;
