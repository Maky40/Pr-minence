import Player from "./player.js";

class Pong42 {
  constructor() {
    this.currentPage = "";
    this.beforePage = "";
    this.timeout = 30000;
    const newPlayer = new Player();
    this.player = newPlayer;
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
