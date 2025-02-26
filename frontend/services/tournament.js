import { ENV } from "../env.js";
import EventEmitter from "../utils/EventEmitter.js";
import pong42 from "./pong42.js";
import Toast from "../components/toast.js";

class TournamentService extends EventEmitter {
  constructor() {
    super();
    console.log("TournamentService initialized");
    this.baseUrl = `${ENV.API_URL}tournament/tournament/`;
    this.tournamentId = 0;
    //this.checkTournamentStatus = this.checkTournamentStatus.bind(this);
    //this.updateTournamentStatus = this.updateTournamentStatus.bind(this);
    //this.startStatusCheckInterval = this.startStatusCheckInterval.bind(this);
    this.init();
  }

  init = async () => {
    try {
      await this.getTournaments();
      this.startStatusCheckInterval();
    } catch (error) {
      console.error("Failed to initialize tournament service:", error);
    }
  };

  checkTournamentStatus(status) {
    if (status !== "PN" && status !== this.tournamentStatus) {
      // Afficher le toast si le statut a changé et n'est pas "PN"
      const updateToast = new Toast(
        "Success",
        "Le statut du tournoi a changé !",
        "success"
      );
      updateToast.show();
      this.tournamentStatus = status; // Mettre à jour le statut
    }
  }
  updateTournamentStatus = async () => {
    console.log("Updating tournament status");
    //if (!this.tournamentId) return; // Ne rien faire si l'ID du tournoi est inconnu
    console.log("Tournament ID:", this.tournamentId);
    try {
      const tournament = await this.getTournaments();
      if (tournament.id === this.tournamentId) {
        this.tournamentId = tournament.id;
        const newStatus = tournament.status;
        this.checkTournamentStatus(newStatus);
        this.startStatusCheckInterval(); // Vérifier le nouveau statut
      } else {
        this.tournamentId = 0;
        this.emit("tournamentLeft", {});
        clearInterval(this.interval);
      }
    } catch (error) {
      console.error("Failed to update tournament status:", error);
      const toast = new Toast(
        "Error",
        "Échec de la mise à jour du statut du tournoi",
        "error"
      );
      toast.show();
    }
  };

  async createTournament(name) {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          tournament_name: name,
          id: pong42.player.id,
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to create tournament");
      this.emit("tournamentCreatedOrJoinOrIn", data);
      return data;
    } catch (error) {
      console.error("Error creating tournament:", error);
      throw error;
    }
  }

  async joinTournament(tournamentId) {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "join",
          tournament_id: tournamentId,
        }),
      });
      this.emit("tournamentCreatedOrJoinOrIn", { tournamentId });
      this.tournamentId = tournamentId;
      this.startStatusCheckInterval();
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to join tournament");
      return data;
    } catch (error) {
      console.error("Error joining tournament:", error);
      throw error;
    }
  }

  async leaveTournament(tournamentId) {
    try {
      console.log("Leaving tournament", tournamentId);
      console.log("Player ID", this.baseUrl);
      const response = await fetch(this.baseUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "leave",
          tournament_id: tournamentId,
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to leave tournament");

      this.emit("tournamentLeft", data);
      this.tournamentId = 0;
      clearInterval(this.interval);
      return data;
    } catch (error) {
      console.error("Error leaving tournament:", error);
      throw error;
    }
  }

  async getTournaments() {
    try {
      const response = await fetch(this.baseUrl, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      console.log("[Tournament] Response status:", response.status);
      const data = await response.json();
      console.log("[Tournament] Response data:", data);

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch tournaments");
      }
      this.tournamentId = 0;
      // Check if player is in tournament
      if (data.current_tournament) {
        this.tournamentId = data.current_tournament.id;
        this.emit("tournamentCreatedOrJoinOrIn", data.current_tournament);
        return data.current_tournament;
      }

      // Emit tournaments list
      console.log("[Tournament] Emitting tournaments list");
      this.emit("tournamentsLoaded", {
        tournaments: data.tournaments || [],
      });
      return data;
    } catch (error) {
      console.error("[Tournament] Error:", error);
      this.emit("tournamentsLoaded", { tournaments: [] });
      throw error;
    }
  }
  startStatusCheckInterval() {
    if (this.interval) clearInterval(this.interval);
    if (!this.tournamentId) return;
    this.interval = setInterval(() => {
      console.log("Checking tournament status");
      this.updateTournamentStatus();
    }, 5000);
  }

  // Effacer l'intervalle lors de la destruction du service
  destroy() {
    if (this.interval) clearInterval(this.interval);
  }
}

export default TournamentService;
