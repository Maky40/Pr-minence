import api from "./api.js";
import Toast from "../components/toast.js";
import EventEmitter from "../utils/EventEmitter.js";

class Player extends EventEmitter {
  constructor() {
    super();
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
    this.from_42 = false;
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
    this.from_42 = data.from_42;
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
  updateAvatar = async (avatarFile) => {
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      const result = await api.apiFetch(
        "/player/avatar/",
        true,
        "POST",
        formData,
        true
      );
      if (result.avatar_url) {
        // Set avatar to the returned URL (a string), not the file object
        this.avatar = result.avatar_url;
        const updateToast = new Toast(
          "Success",
          "Votre avatar a été mis à jour",
          "success"
        );
        updateToast.show();
        return true;
      }
      throw new Error("No avatar URL in response");
    } catch (error) {
      console.error("Failed to update player avatar:", error);
      const toast = new Toast(
        "Error",
        "Échec de la mise à jour de l'avatar",
        "error"
      );
      toast.show();
      throw error;
    }
  };

  updatePassword = async (data) => {
    try {
      const resultat = await api.apiFetch(
        "/player/change-password/",
        true,
        "POST",
        data
      );
      const updateToast = new Toast(
        "Success",
        "Votre mot de passe a été mis à jour",
        "success"
      );
      updateToast.show();
      return true;
    } catch (error) {
      const toast = new Toast("Error", error.message, "error");
      toast.show();
      throw error;
    }
  };

  addListener(event, callback) {
    return this.on(event, callback);
  }

  notifyListeners(event, data) {
    this.emit(event, data);
  }

  changeTwoFactor = async (data) => {
    try {
      const response = await api.apiFetch(
        "/player/2FAChange/",
        true,
        "POST",
        data
      );
      if (response) {
        const updateToast = new Toast(
          "Success",
          "Votre double authentification a été mise à jour",
          "success"
        );
        updateToast.show();
        return true;
      }
      throw new Error("API update failed");
    } catch (error) {
      console.error("Failed to update two-factor authentication:", error);
      const toast = new Toast(
        "Error",
        "Échec de la mise à jour de la double authentification",
        "error"
      );
      toast.show();
      return false;
    }
  };

  getQRCode = async () => {
    try {
      const data = {
        show_qr_code: "true",
      };
      const response = await api.apiFetch(
        "/player/2FAChange/",
        true,
        "POST",
        data
      );
      return response;
    } catch (error) {
      console.error("Failed to get QR code:", error);
      const toast = new Toast(
        "Error",
        "Échec de l'obtention du code QR",
        "error"
      );
      toast.show();
      return false;
    }
  };

  updatePlayerInformations = async (data) => {
    try {
      // Check if data is FormData
      const first_name =
        data instanceof FormData ? data.get("first_name") : data.first_name;
      const last_name =
        data instanceof FormData ? data.get("last_name") : data.last_name;

      // Validate fields
      if (!first_name || !last_name) {
        const toast = new Toast(
          "Error",
          "Veuillez remplir tous les champs",
          "error"
        );
        toast.show();
        return false;
      }

      // Update local state
      this.first_name = first_name;
      this.last_name = last_name;

      // Prepare API data
      const playerData = {
        player: { first_name: this.first_name, last_name: this.last_name },
      };
      // Send to API
      const response = await api.apiFetch("/player/", true, "POST", playerData);

      if (response) {
        const updateToast = new Toast(
          "Success",
          "Vos informations ont été mises à jour",
          "success"
        );
        updateToast.show();
        return true;
      }

      throw new Error("API update failed");
    } catch (error) {
      console.error("Failed to update player informations:", error);
      const toast = new Toast(
        "Error",
        "Échec de la mise à jour des informations",
        "error"
      );
      toast.show();
      return false;
    }
  };
}

export default Player;
