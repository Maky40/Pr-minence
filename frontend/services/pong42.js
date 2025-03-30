import Player from "./player.js";
import TabManager from "./tabManager.js";
import Toast from "../components/toast.js";

class Pong42 {
  constructor() {
    this.currentPage = "";
    this.beforePage = "";
    this.timeout = 30000;
    const newPlayer = new Player();
    this.player = newPlayer;
    this.tabManager = new TabManager();
    this.setupTabMessageHandlers();
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

  setupTabMessageHandlers() {
    this.tabManager.onMessage("game_started", (data) => {
      if (!this.tabManager.isMaster()) {
        new Toast({
          message: "Une partie est déjà en cours dans un autre onglet!",
          type: "error",
          duration: 5000,
        }).show();
      }
    });

    this.tabManager.onMessage("match_joined", (data) => {
      if (!this.tabManager.isMaster()) {
        new Toast({
          message: "Vous avez rejoint un match dans un autre onglet!",
          type: "info",
          duration: 5000,
        }).show();
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
}

const pong42 = new Pong42();
export default pong42;
