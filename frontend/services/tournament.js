import { ENV } from "../env.js";
import EventEmitter from "../utils/EventEmitter.js";
import pong42 from "./pong42.js";
import Toast from "../components/toast.js";

class TournamentService extends EventEmitter {
  constructor() {
    super();
    this.baseUrl = `${ENV.API_URL}tournament/tournament/`;
    this.initData();
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

  returnTournamentInfo() {
    return {
      tournamentId: this.tournamentId,
      tournamentStatus: this.tournamentStatus,
      tournamentStatusDisplayName: this.tournamentStatusDisplayName,
      tournamentStatusDisplayClass: this.tournamentStatusDisplayClass,
      tournamentCurren_round: this.tournamentCurren_round,
      tournamentMatches: this.tournamentMatches,
      tournamentCreator: this.tournamentCreator,
      tournamentPlayers_count: this.tournamentPlayers_count,
    };
  }

  apiToData(tournament) {
    this.tournamentId = tournament.id;
    this.tournamentCurren_round = tournament.current_round;
    this.tournamentMatches = tournament.matches;
    this.tournamentCreator = tournament.creator;
    this.tournamentPlayers_count = tournament.players_count;
    this.tournamentOldStatus = this.tournamentStatus;
    this.tournamentStatus = tournament.status;
    this.tournamentStatusDisplayName = this.get_status_display(
      tournament.status
    );
    this.tournamentStatusDisplayClass = this.get_btn_display(tournament.status);
  }
  initData() {
    this.tournamentId = 0;
    this.tournamentStatus = null;
    this.tournamentOldStatus = null;
    this.tournamentStatusDisplayName = "";
    this.tournamentStatusDisplayClass = "";
    this.tournamentCurren_round = null;
    this.tournamentMatches = [];
    this.tournamentCreator = false;
    this.tournamentPlayers_count = 0;
    if (this.interval) clearInterval(this.interval);
  }
  get_status_display(status) {
    const statusMap = {
      PN: "En attente",
      BG: "Commencé",
      FN: "Fini",
      CA: "Annulé",
    };
    return statusMap[status] || "Unknown";
  }
  get_btn_display(status) {
    return "btn-outline-" + this.get_status_display_class(status);
  }
  get_status_display_class(status) {
    const statusMap = {
      PN: "warning",
      BG: "info",
      FN: "success",
      CA: "danger",
    };
    return statusMap[status] || "text-secondary";
  }

  checkTournamentStatus(status) {
    if (status !== this.tournamentStatus) {
      this.tournamentStatus = status;
      this.tournamentStatusDisplayName = this.get_status_display(status);
      this.tournamentStatusDisplayClass = this.get_status_display_class(status);
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
    try {
      const tournament = await this.getTournaments();
      if (tournament.id === this.tournamentId) {
        this.apiToData(tournament);
        const newStatus = tournament.status;
        this.checkTournamentStatus(newStatus);
        this.startStatusCheckInterval();
        this.emit("update", this.returnTournamentInfo());
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
      this.apiToData(data);
      if (!response.ok)
        throw new Error(data.message || "Failed to create tournament");
      this.emit("tournamentCreatedOrJoinOrIn", data);
      this.updateTournamentStatus();
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
      this.updateTournamentStatus();
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
      this.initData();
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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch tournaments");
      }
      this.initData();
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
