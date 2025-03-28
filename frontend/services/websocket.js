import auth from "./auth.js";

class WebSocketAPI {
  constructor(wsURL) {
    this.socket = null;
    this.socketId = this.generateUniqueId();
    this.status = "DISCONNECTED";
    this.wsURL = wsURL;
    this.messageListeners = new Map();
    this.listeners = new Map();
    this.retryCount = 0; // Ajouter un compteur de tentatives
    this.maxRetries = 3; // Limiter à 3 tentatives
    this.forceClose = false;
    this.messageListeners = new Map();
    this.init();
  }

  init() {
	console.log("WebSocket initialized:", new Date().toISOString());

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

  generateUniqueId() {
    return "ws_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
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
  addMessageListener(type, callback) {
    if (typeof callback !== "function") {
      console.error("[WebSocket] Callback must be a function");
      return;
    }
    this.messageListeners.set(type, callback);
  }

  // Ajouter cette méthode
  removeMessageListener(type) {
    console.log(`[WebSocket] Removing listener for type: ${type}`);
    this.messageListeners.delete(type);
  }

  // Ajouter cette méthode
  removeAllListeners() {
    console.log("[WebSocket] Removing all listeners");
    this.messageListeners.clear();
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
		console.log("[WebSocket] Message reçu :", event.data);

		this.messageListeners.forEach((callback, type) => {
			callback(event.data);
		});

		try {
			const data = JSON.parse(event.data);

			console.log("[WebSocket] Type de message :", data.type);
			console.log("[WebSocket] Données complètes :", data);

			if (data.type === "force_logout") {
				console.log("[WebSocket] Déconnexion forcée détectée, fermeture de tous les onglets.");
				console.log("[WebSocket] URL de redirection :", data.redirect_url);
				if (this.socket) {
					this.socket.close();
				}
				console.log(`Avant: auth.authenticated = ${auth.authenticated}`);
				if (auth.authenticated == true)
				{
					auth.logoutAndNotify();
				}
				console.log(`Après: auth.authenticated = ${auth.authenticated}`);
			}
		} catch (error) {
			console.error("[WebSocket] Erreur lors du parsing du message :", error);
		}
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
      // Ne pas tenter de reconnecter si forceClose est true
      if (!this.forceClose) {
        this.handleConnectionFailure();
      }
    });

  }
}

export default WebSocketAPI;
