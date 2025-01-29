import api from "./api.js";
import Toast from "../components/toast.js";

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
      this.setPlayerInformations(data);
    } catch (error) {
      console.error("Failed to initialize player state:", error);
      const toast = new Toast(
        "Error",
        "Failed to initialize player state",
        "error"
      );
      toast.show();
    }
  }

  setPlayerInformations(data) {
    console.log(data.username);
    this.id = data.id;
    this.email = data.email;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.username = data.username;
    this.avatar = data.avatar;
    this.champions = data.champions;
    this.wins = data.wins;
    this.losses = data.losses;
    this.two_factor = data.two_factor;
    this.status = data.status;
  }

  loadPlayerAvatar() {
    if (
      this.avatar ==
      "https://localhost/player/static/api/images/default_avatar.png"
    )
      return "assets/images/default_avatar.png";
    else {
      return this.avatar;
    }
  }

  updateWins() {
    this.wins++;
  }

  updateLosses() {
    this.losses++;
  }
  updateStatus(status) {
    this.status = status;
    api.apiFetch("/player/", true, "PATCH", { status: status });
  }
  updatePlayerInformations(data) {
    this.email = data.email;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.username = data.username;
    const updateToast = new Toast(
      "Success",
      "vos informations ont été mises à jour",
      "success"
    );
    updateToast.show();
    //api.apiFetch("/player/", true, "PATCH", data);
  }
}

export default Player;
