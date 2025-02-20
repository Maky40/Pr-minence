class WebSocketAPI {
  constructor(wsURL) {
    this.socket = null;
    this.status = "DISCONNECTED";
    this.wsURL = wsURL;
    this.messageListeners = new Map();
    this.listeners = new Map();
    this.retryCount = 0; // Ajouter un compteur de tentatives
    this.maxRetries = 3; // Limiter à 3 tentatives
    this.forceClose = false;
    this.init();
  }

  init() {
    if (this.retryCount >= this.maxRetries) {
      console.error("Max retries reached. Stopping attempts.");
      this.notifyListeners("error", "Max retries reached. Stopping attempts.");
      return;
    }

    try {
      this.socket = new WebSocket(this.wsURL);
      this.setupEventListeners();
    } catch (error) {
      console.error("WebSocket initialization error:", error);
      this.close();
      this.retryCount++;
      setTimeout(() => this.init(), 2000); // Réessayer après 2 secondes
    }
  }

  close() {
    if (this.socket) {
      this.forceClose = true;
      this.removeAllListeners();
      this.socket.close();
      this.socket = null;
      this.status = "DISCONNECTED";
    }
  }

  addMessageListener(type, callback) {
    const listener =
      type === "message"
        ? (event) => callback(event.data)
        : (event) => callback(event);
    this.messageListeners.set(type, callback);
    this.listeners.set(type, listener);
    if (this.socket) {
      this.socket.addEventListener(type, listener);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((listener, type) => {
        this.socket.removeEventListener(type, listener);
      });
      this.listeners.clear();
      this.messageListeners.clear();
    }
  }

  notifyListeners(type, data) {
    const callback = this.messageListeners.get(type);
    if (callback) {
      callback(data);
    }
  }

  send(data) {
    if (this.socket && this.status === "CONNECTED") {
      try {
        this.socket.send(
          typeof data === "string" ? data : JSON.stringify(data)
        );
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
      }
    }
  }

  setupEventListeners() {
    this.socket.addEventListener("open", () => {
      console.log("WebSocket connection established");
      this.status = "CONNECTED";
      this.retryCount = 0; // Réinitialiser le compteur de tentatives
      this.notifyListeners("open", null);
    });

    this.socket.addEventListener("message", (event) => {
      this.messageListeners.forEach((callback, type) => {
        callback(event.data);
      });
    });

    this.socket.addEventListener("close", (event) => {
      const closeMessage = "La connexion a été perdue";
      this.status = "DISCONNECTED";
      this.notifyListeners("close", closeMessage);
      if (!this.forceClose) {
        this.close();
        this.retryCount++;
        setTimeout(() => this.init(), 2000);
      } // Réessayer après 2 secondes
    });

    this.socket.addEventListener("error", (event) => {
      const errorMessage = "Erreur de connexion au serveur";
      console.error("WebSocket error:", event);
      this.status = "ERROR";
      this.notifyListeners("error", errorMessage);
      this.close();
      this.retryCount++;
      setTimeout(() => this.init(), 2000); // Réessayer après 2 secondes
    });
  }
}

export default WebSocketAPI;
