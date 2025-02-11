class WebSocketAPI {
  constructor(wsURL) {
    this.socket = null;
    this.status = "DISCONNECTED";
    this.wsURL = wsURL;
    this.messageListeners = new Map();
    this.init();
  }

  init() {
    try {
      this.socket = new WebSocket(this.wsURL);
      this.setupEventListeners();
    } catch (error) {
      console.error("WebSocket initialization error:", error);
    }
  }

  addMessageListener(type, callback) {
    this.messageListeners.set(type, callback);
  }

  setupEventListeners() {
    this.socket.addEventListener("open", () => {
      console.log("WebSocket connection established");
      this.status = "CONNECTED";
    });

    // Ajouter l'écouteur de message ici
    this.socket.addEventListener("message", (event) => {
      // Appeler tous les callbacks enregistrés avec le message
      this.messageListeners.forEach((callback, type) => {
        callback(event.data);
      });
    });

    this.socket.addEventListener("close", (event) => {
      console.log("WebSocket closed:", event.code);
      this.status = "DISCONNECTED";
      setTimeout(() => this.init(), 5000);
    });

    this.socket.addEventListener("error", (event) => {
      console.error("WebSocket error:", event);
      this.status = "ERROR";
    });
  }
}

export default WebSocketAPI;
