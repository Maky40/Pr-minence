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
    this.is42 = false;
  }

  async init() {
    try {
      const data = await api.apiFetch("/player/", true);
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
  checkUserInfos = (data) => {
    if (data.first_name !== "" && data.last_name !== "") {
      return false;
    }
    return true;
  };

  updateAvatar = async (data) => {
    try {
      const response = await api.apiFetch("/player/", true, "POST", data);
      const updateToast = new Toast(
        "Success",
        "votre avatar a été mis à jour",
        "success"
      );
      updateToast.show();
      return true;
    } catch (error) {
      console.error("Failed to update player avatar:", error);
      const toast = new Toast(
        "Error",
        "Failed to update player avatar",
        "error"
      );
      toast.show();
      return false;
    }
  };

  updatePlayerInformations = async (data) => {
    try {
      if (this.checkUserInfos(data)) {
        const toast = new Toast(
          "Error",
          "Veuillez remplir tous les champs",
          "error"
        );
        toast.show();
        return false;
      }
      this.first_name = data.first_name;
      this.last_name = data.last_name;
      if (data.avatar) {
        this.avatar = data.avatar;
        this.updateAvatar({ avatar: data.avatar });
      }
      const updateToast = new Toast(
        "Success",
        "vos informations ont été mises à jour",
        "success"
      );
      updateToast.show();
      const player = {
        player: { first_name: this.first_name, last_name: this.last_name },
      };
      const response = await api.apiFetch("/player/", true, "POST", player);
      return true;
    } catch (error) {
      console.error("Failed to update player informations:", error);
      const toast = new Toast(
        "Error",
        "Failed to update player informations",
        "error"
      );
      toast.show();
      return false;
    }
  };
}

export default Player;
