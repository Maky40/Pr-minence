/**
 * Gère les onglets multiples et la communication entre eux
 */
class TabManager {
  constructor() {
    // Identifiant unique pour cet onglet
    this.tabId = this.generateTabId();

    // Statut de l'onglet (maître ou secondaire)
    this.isMasterTab = false;

    // Interval pour le ping de l'onglet maître
    this.masterTabInterval = null;

    // Callbacks pour les différents types de messages
    this.messageHandlers = {};

    // Initialiser la gestion des onglets
    this.initialize();
  }

  /**
   * Génère un identifiant unique pour cet onglet
   */
  generateTabId() {
    return "tab_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  }

  /**
   * Initialise la gestion des onglets
   */
  initialize() {
    // Vérifier s'il existe déjà un onglet maître
    this.checkMasterTab();

    // Configurer les écouteurs d'événements
    this.setupEventListeners();

    // Si on est l'onglet maître, commencer à envoyer des pings
    if (this.isMasterTab) {
      this.startMasterPing();
    }
  }

  /**
   * Vérifie s'il existe déjà un onglet maître
   */
  checkMasterTab() {
    const masterTabInfo = localStorage.getItem("pong42_master_tab");

    if (!masterTabInfo) {
      // Aucun onglet maître n'existe, on devient l'onglet maître
      this.setAsMasterTab();
    } else {
      try {
        const masterTab = JSON.parse(masterTabInfo);
        // Vérifier si l'onglet maître est toujours actif (moins de 5 secondes)
        if (Date.now() - masterTab.lastPing > 5000) {
          // L'onglet maître semble inactif, on prend le relais
          this.setAsMasterTab();
        } else {
          // On est un onglet secondaire
          this.isMasterTab = false;
          console.log(
            "[TAB] This is a secondary tab. Master tab is:",
            masterTab.id
          );
        }
      } catch (error) {
        // En cas d'erreur, on devient l'onglet maître
        console.error("[TAB] Error parsing master tab info:", error);
        this.setAsMasterTab();
      }
    }
  }

  /**
   * Définit cet onglet comme onglet maître
   */
  setAsMasterTab() {
    this.isMasterTab = true;
    console.log("[TAB] This is now the master tab:", this.tabId);

    // Enregistrer les informations de l'onglet maître
    localStorage.setItem(
      "pong42_master_tab",
      JSON.stringify({
        id: this.tabId,
        lastPing: Date.now(),
      })
    );
  }

  /**
   * Démarre le ping pour l'onglet maître
   */
  startMasterPing() {
    // Arrêter tout ping précédent
    if (this.masterTabInterval) {
      clearInterval(this.masterTabInterval);
    }

    // Mettre en place le ping pour signaler que cet onglet est actif
    this.masterTabInterval = setInterval(
      () => this.updateMasterTabPing(),
      1000
    );
  }

  /**
   * Met à jour le ping de l'onglet maître
   */
  updateMasterTabPing() {
    if (!this.isMasterTab) return;

    try {
      const masterTabInfo = JSON.parse(
        localStorage.getItem("pong42_master_tab") || "{}"
      );

      // Vérifier que nous sommes toujours l'onglet maître
      if (masterTabInfo.id === this.tabId) {
        masterTabInfo.lastPing = Date.now();
        localStorage.setItem(
          "pong42_master_tab",
          JSON.stringify(masterTabInfo)
        );
      } else {
        // Un autre onglet est devenu le maître
        this.isMasterTab = false;
        clearInterval(this.masterTabInterval);
        console.log(
          "[TAB] No longer the master tab. New master:",
          masterTabInfo.id
        );
      }
    } catch (error) {
      console.error("[TAB] Error updating master tab ping:", error);
    }
  }

  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Écouteur pour les messages entre onglets
    window.addEventListener("storage", (event) =>
      this.handleStorageEvent(event)
    );

    // Écouteur pour la fermeture de l'onglet
    window.addEventListener("beforeunload", () => this.handleUnload());
  }

  /**
   * Gère les événements de stockage (messages entre onglets)
   */
  handleStorageEvent(event) {
    // Messages entre onglets
    if (event.key === "pong42_cross_tab") {
      try {
        const message = JSON.parse(event.newValue);
        // Vérifier si le message n'est pas trop ancien (5 secondes max)
        if (Date.now() - message.timestamp > 5000) {
          return;
        }
        this.processCrossTabMessage(message);
      } catch (error) {
        console.error("[TAB] Error processing cross-tab message:", error);
      }
    }
    // Changement d'onglet maître
    else if (event.key === "pong42_master_tab") {
      this.handleMasterTabChange(event.newValue);
    }
  }

  /**
   * Gère les changements d'onglet maître
   */
  handleMasterTabChange(newValue) {
    if (!this.isMasterTab) return;

    try {
      const masterInfo = JSON.parse(newValue);
      if (masterInfo.id !== this.tabId) {
        console.log("[TAB] Another tab claims to be master:", masterInfo.id);
        // Résoudre le conflit - le plus ancien reste maître
        const currentInfo = {
          id: this.tabId,
          lastPing: Date.now(),
        };
        localStorage.setItem("pong42_master_tab", JSON.stringify(currentInfo));
      }
    } catch (error) {
      console.error("[TAB] Error handling master tab change:", error);
    }
  }

  /**
   * Gère la fermeture de l'onglet
   */
  handleUnload() {
    if (this.isMasterTab) {
      localStorage.removeItem("pong42_master_tab");
      // Notifier les autres onglets que l'onglet maître se ferme
      this.sendCrossTabMessage({
        type: "master_tab_closing",
        data: { tabId: this.tabId },
      });
    }
  }

  /**
   * Traite un message reçu d'un autre onglet
   */
  processCrossTabMessage(message) {
    console.log("[TAB] Processing cross-tab message:", message);

    // Si le message provient de cet onglet, l'ignorer
    if (message.sourceTabId === this.tabId) {
      return;
    }

    // Si nous avons un gestionnaire pour ce type de message, l'appeler
    if (this.messageHandlers[message.type]) {
      this.messageHandlers[message.type](message.data);
    }

    // Traiter certains messages système
    switch (message.type) {
      case "master_tab_closing":
        // L'onglet maître se ferme, vérifier si on peut devenir le nouveau maître
        if (!this.isMasterTab) {
          this.checkMasterTab();
        }
        break;
    }
  }

  /**
   * Envoie un message aux autres onglets
   */
  sendCrossTabMessage(message) {
    localStorage.setItem(
      "pong42_cross_tab",
      JSON.stringify({
        type: message.type,
        data: message.data,
        timestamp: Date.now(),
        sourceTabId: this.tabId,
      })
    );
  }

  /**
   * Enregistre un gestionnaire pour un type de message spécifique
   */
  onMessage(type, callback) {
    this.messageHandlers[type] = callback;
  }

  /**
   * Vérifie si cet onglet est l'onglet maître
   */
  isMaster() {
    return this.isMasterTab;
  }

  /**
   * Notifie qu'un jeu a démarré
   */
  notifyGameStarted(gameData = {}) {
    this.sendCrossTabMessage({
      type: "game_started",
      data: gameData,
    });
  }

  /**
   * Notifie qu'un match a été rejoint
   */
  notifyMatchJoined(matchId) {
    this.sendCrossTabMessage({
      type: "match_joined",
      data: { matchId },
    });
  }

  /**
   * Nettoie les ressources lors de la destruction
   */
  destroy() {
    if (this.masterTabInterval) {
      clearInterval(this.masterTabInterval);
    }
    if (this.isMasterTab) {
      localStorage.removeItem("pong42_master_tab");
      this.isMasterTab = false;
    }
    if (this.tabId) {
      localStorage.removeItem(this.tabId);
      this.tabId = null;
    }
    window.removeEventListener("storage", this.handleStorageEvent);
    window.removeEventListener("beforeunload", this.handleUnload);
    this.messageHandlers = {};
  }
}

export default TabManager;
