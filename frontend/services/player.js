import api from "./api.js";

class Player {
  constructor() {
    this.id = null;
    this.email = null;
    this.first_name = null;
    this.last_name = null;
    this.username = null;
    this.avatar = null;
    this.champions = 0;
    this.wins = 0;
    this.losses = 0;
    this.two_factor = false;
    this.status = "OF";
  }

  async init() {
    try {
      const data = api.apiFetch("/player/", true);
      this.setSession(data);
    } catch (error) {
      console.error("Failed to initialize player state:", error);
    }
  }
}
