import api from "./api2.js";
import Toast from "../components/toast.js";
import EventEmitter from "../utils/EventEmitter.js";
import TournamentService from "./tournament.js";
import { ENV } from "../env.js";
import pong42 from "./pong42.js";

class Player extends EventEmitter {
  constructor() {
    console.log("Player initialized:");
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
    this.match_id = null;
    this.paddle = null;
    this.socketMatch = null;
    this.waitingMatch = false;
    this.waitingMatchID = 0;
    this.from_42 = false;
    this.friends = [];
    this.has_unplayed = false;
    this.has_active_tournament = false;
    this.defaultAvatar = `${ENV.API_URL}${ENV.DEFAULT_AVATAR}`;
    this.tournament = new TournamentService();
    this.game = false;
  }

  async init() {
    try {
      const response = await api.apiFetch("/player/", true);
      this.setPlayerInformations(response.data);
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
    if (this.avatar == this.defaultAvatar) return "assets/avatars/default.png";
    else {
      return this.avatar;
    }
  }
  cancelMatch = async () => {
    try {
      await api.apiFetch("pong/match/individual/delete", true, "POST");
      if (this.socketMatch) {
        this.socketMatch.close();
        this.socketMatch = null;
      }
      return true;
    } catch (error) {
      console.error("Failed to cancel match:", error);
      const toast = new Toast("Error", error, "error");
      toast.show();
      return false;
    }
  };
  checkUnplayed = async () => {
    try {
      const response = await api.apiFetch("player/matches/", true);
      this.has_unplayed = response.data.has_unplayed;
      return this.has_unplayed;
    } catch (error) {
      console.error("Failed to check unplayed matches:", error);
      const toast = new Toast(
        "Error",
        "Failed to check unplayed matches",
        "error"
      );
      toast.show();
      return false;
    }
  };
  checkTournament = async () => {
    try {
      const response = await api.apiFetch("player/tournaments/", true);
      this.has_active_tournament = response.data.has_active_tournament;
      if (!this.has_active_tournament && !this.waitingMatch) {
        this.notifyListeners("updateTournament");
      }
      return this.has_active_tournament;
    } catch (error) {
      console.error("Failed to check active tournament:", error);
      const toast = new Toast(
        "Error",
        "Failed to check active tournament",
        "error"
      );
      toast.show();
      return false;
    }
  };
  checkUnplayedAndActiveTournament = async () => {
    try {
      await this.checkTournament();
      await this.checkUnplayed();
    } catch (error) {
      console.error(
        "Failed to check unplayed matches and active tournament:",
        error
      );
      const toast = new Toast(
        "Error",
        "Failed to check unplayed matches and active tournament",
        "error"
      );
      toast.show();
      return false;
    }
  };

  updateWins() {
    this.wins++;
  }

  updateLosses() {
    this.losses++;
  }
  updateStatus(status) {
    this.status = status;
    this.notifyListeners("updateStatus");
  }
  checkUserInfos = (data) => {
    if (data.first_name !== "" && data.last_name !== "") {
      return false;
    }
    return true;
  };

  getFriends = async () => {
    try {
      const response = await api.apiFetch(
        "/player/friendship/?target=friends",
        true
      );
      this.friends = response.data.friendships;
      return this.friends;
    } catch (error) {
      console.error("Failed to get friends list:", error);
      const toast = new Toast("Error", "Failed to get friends list", "error");
      toast.show();
      return false;
    }
  };
  updateAvatar = async (avatarFile) => {
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      const response = await api.apiFetch(
        "player/avatar/",
        true,
        "POST",
        formData,
        true
      );
      if (response.data.avatar_url) {
        // Set avatar to the returned URL (a string), not the file object
        this.avatar = response.data.avatar_url;
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
      const response = await api.apiFetch(
        "/player/change-password/",
        true,
        "POST",
        data
      );
      if (response.data.status !== 200) {
        throw new Error(
          response.data.message ? response.data.message : "erreur inconnue"
        );
      }
      const updateToast = new Toast(
        "Success",
        "Votre mot de passe a été mis à jour",
        "success"
      );
      updateToast.show();
      return true;
    } catch (error) {
      const toast = new Toast("Error", "Password incorrect (ne correspond pas ou trop petit)", "error");
      toast.show();
      throw "Password incorrect (ne correspond pas ou trop petit)";
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
      if (response.success) {
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
      return response.data;
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

  destroy() {
    if (this.socketMatch) {
      this.socketMatch.destroy();
    }
    this.tournament.destroy();
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
    this.match_id = null;
    this.paddle = null;
    this.socketMatch = null;
    this.waitingMatch = false;
    this.waitingMatchID = 0;
    this.from_42 = false;
    this.friends = [];
  }

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

      if (response.success) {
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
