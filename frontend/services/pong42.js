import Player from "./player.js";
import TabManager from "./tabManager.js";
import Toast from "../components/toast.js";
import EventEmitter from "../utils/EventEmitter.js";

class Pong42 extends EventEmitter {
  constructor() {
    super();
    this.currentPage = "";
    this.beforePage = "";
    this.timeout = 30000;
    const newPlayer = new Player();
    this.player = newPlayer;
    this.tabManager = null;
    this.matchInOtherTab = false;
    this.intervals = [];
  }

  initializeTabManager() {
    this.tabManager = new TabManager(this);
  }

  async handleMessage(message) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Message response timeout"));
      }, this.timeout);

      try {
        clearTimeout(timer);
        resolve(response);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  // Méthode pour enregistrer un intervalle
  registerInterval(intervalId) {
    this.intervals.push(intervalId);
  }

  // Méthode pour nettoyer tous les intervalles
  clearAllIntervals() {
    console.log("[PONG42] Clearing all intervals");
    this.intervals.forEach((intervalId) => clearInterval(intervalId));
    this.intervals = []; // Réinitialiser le tableau
  }

  setupTabMessageHandlers() {
    this.tabManager.onMessage("game_over_or_aborted", (data) => {
      if (!this.tabManager.tabId !== data.tabID) {
        this.matchInOtherTab = false;
        this.emit("match_update", "game_over_or_aborted");
      }
    });

    this.tabManager.onMessage("game_started", (data) => {
      if (!this.tabManager.tabId !== data.tabID) {
        this.matchInOtherTab = true;
        this.emit("match_update", "game_started");
        new Toast(
          "Une partie est déjà en cours dans un autre onglet!",
          "error",
          5000
        ).show();
      } else {
        this.matchInOtherTab = false;
      }
    });

    this.tabManager.onMessage("match_joined", (data) => {
      console.log(data, "match_joined");
      if (!this.tabManager.tabId !== data.tabID) {
        this.matchInOtherTab = true;
        this.emit("match_update", "match_joined");
        new Toast(
          "Vous avez rejoint un match dans un autre onglet!",
          "info",
          5000
        ).show();
      }
    });
  }

  isMasterTab() {
    return this.tabManager.isMaster();
  }

  notifyGameStarted(gameData = {}) {
    this.tabManager.notifyGameStarted(gameData);
  }
  notifyMatchJoined(matchId) {
    this.tabManager.notifyMatchJoined(matchId);
  }
  sendCrossTabMessage(message) {
    this.tabManager.sendCrossTabMessage(message);
  }
  setCurrentPage(page) {
    if (page === "connexion" && page === "signup") return;
    this.beforePage = this.currentPage;
    this.currentPage = page;
  }
  getPreviousPage() {
    return this.beforePage;
  }
  getCurrentPage() {
    return this.currentPage;
  }
  addMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message)
        .then((response) => sendResponse(response))
        .catch((error) => sendResponse({ error: error.message }));
      return true; // Will respond asynchronously
    });
  }
  reset() {
    // Nettoyer tous les intervalles
    this.clearAllIntervals();
    // Nettoyer le player si nécessaire
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

    // Nettoyer le tabManager si nécessaire
    if (this.tabManager) {
      this.tabManager.destroy();
      this.tabManager = null;
    }

    // Réinitialiser les propriétés de base
    this.currentPage = "";
    this.beforePage = "";

    // Recréer un nouveau Player (facultatif)
    this.player = new Player();

    // Recréer le tabManager (facultatif)
    this.tabManager = new TabManager();
    this.setupTabMessageHandlers();

    console.log("[PONG42] Instance réinitialisée");
  }
}

const pong42 = new Pong42();

pong42.initializeTabManager();
pong42.setupTabMessageHandlers();
export default pong42;
