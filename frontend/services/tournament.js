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
      console.log(
        "Initializing tournament service ================================"
      );
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
  checkTournamentChange(newValues) {
    // Vérifier d'abord si c'est le même tournoi
    if (this.tournamentId !== newValues.id) {
      console.log(
        "Tournament ID changed:",
        this.tournamentId,
        "->",
        newValues.id
      );
      return false;
    }

    // Vérifier chaque propriété individuellement pour un meilleur débogage
    const statusChanged = this.tournamentStatus !== newValues.status;
    const roundChanged =
      this.tournamentCurren_round !== newValues.current_round;
    const matchesChanged =
      JSON.stringify(this.tournamentMatches) !==
      JSON.stringify(newValues.matches);
    const creatorChanged = this.tournamentCreator !== newValues.creator;
    const playersCountChanged =
      this.tournamentPlayers_count !== newValues.players_count;

    // Log des changements
    if (statusChanged)
      console.log(
        "Status changed:",
        this.tournamentStatus,
        "->",
        newValues.status
      );
    if (roundChanged)
      console.log(
        "Round changed:",
        this.tournamentCurren_round,
        "->",
        newValues.current_round
      );
    if (matchesChanged) console.log("Matches changed");
    if (creatorChanged)
      console.log(
        "Creator changed:",
        this.tournamentCreator,
        "->",
        newValues.creator
      );
    if (playersCountChanged)
      console.log(
        "Players count changed:",
        this.tournamentPlayers_count,
        "->",
        newValues.players_count
      );

    return (
      statusChanged ||
      roundChanged ||
      matchesChanged ||
      creatorChanged ||
      playersCountChanged
    );
  }

  apiToData(tournament) {
    this.tournamentId = tournament.id;
    this.tournamentCurren_round = tournament.current_round;
    this.tournamentMatches = tournament.matches || [];
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
      // Sauvegarder l'état actuel pour la comparaison
      const oldStatus = this.tournamentStatus;
      const oldRound = this.tournamentCurren_round;

      const oldCreator = this.tournamentCreator;
      const oldPlayersCount = this.tournamentPlayers_count;

      const tournament = await this.getTournaments();

      // Si le joueur n'est plus dans le tournoi ou le tournoi a changé
      if (!tournament.id || tournament.id !== this.tournamentId) {
        this.tournamentId = 0;
        this.emit("tournamentLeft", {});
        this.stopStatusCheckInterval();
        return;
      }
      let matchesChanged = false;
      if (this.tournamentMatches.length > 0) {
        const oldMatches = [...this.tournamentMatches];
        matchesChanged =
          JSON.stringify(oldMatches) !== JSON.stringify(tournament.matches);
      }
      // Vérifier si quelque chose a changé en comparant avec les anciennes valeurs
      const statusChanged = oldStatus !== tournament.status;
      const roundChanged = oldRound !== tournament.current_round;
      const creatorChanged = oldCreator !== tournament.creator;
      const playersCountChanged = oldPlayersCount !== tournament.players_count;

      // Log des changements
      if (statusChanged)
        console.log("Status changed:", oldStatus, "->", tournament.status);
      if (roundChanged)
        console.log("Round changed:", oldRound, "->", tournament.current_round);
      if (matchesChanged) console.log("Matches changed");
      if (creatorChanged)
        console.log("Creator changed:", oldCreator, "->", tournament.creator);
      if (playersCountChanged)
        console.log(
          "Players count changed:",
          oldPlayersCount,
          "->",
          tournament.players_count
        );

      // Si quelque chose a changé
      if (
        statusChanged ||
        roundChanged ||
        matchesChanged ||
        creatorChanged ||
        playersCountChanged
      ) {
        console.log("Tournament changed:", tournament);
        this.apiToData(tournament);
        if (statusChanged) {
          this.checkTournamentStatus(tournament.status);
        }
        this.emit("update", this.returnTournamentInfo());
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
      console.log("Leave tournament response:", response.body);
      if (!response.ok)
        throw new Error(data.message || "Failed to leave tournament");
      this.destroy();
      this.emit("tournamentLeft", data);
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

      // Check if player is in tournament
      if (data.current_tournament) {
        // Si c'est la première fois qu'on récupère ce tournoi ou si l'ID a changé
        if (this.tournamentId !== data.current_tournament.id) {
          this.initData(); // Réinitialiser seulement si c'est un nouveau tournoi
          this.tournamentId = data.current_tournament.id;
          this.emit("tournamentCreatedOrJoinOrIn", data.current_tournament);
          this.startStatusCheckInterval();
        }
        return data.current_tournament;
      } else {
        // Si le joueur n'est plus dans un tournoi mais qu'on avait un tournoi avant
        if (this.tournamentId !== 0) {
          this.initData();
        }

        // Emit tournaments list
        console.log("[Tournament] Emitting tournaments list");
        this.emit("tournamentsLoaded", {
          tournaments: data.tournaments || [],
        });
        return data;
      }
    } catch (error) {
      console.error("[Tournament] Error:", error);
      this.emit("tournamentsLoaded", { tournaments: [] });
      throw error;
    }
  }
  startStatusCheckInterval() {
    // Nettoyage de l'intervalle existant
    this.stopStatusCheckInterval();

    // Vérification de la présence d'un tournamentId
    if (!this.tournamentId) {
      console.warn("No tournament ID provided");
      return;
    }

    // Création du nouvel intervalle
    this.interval = setInterval(async () => {
      try {
        console.log("Checking tournament status");
        await this.updateTournamentStatus();
      } catch (error) {
        console.error("Error updating tournament status:", error);
        this.stopStatusCheckInterval(); // Arrêt de l'intervalle en cas d'erreur
      }
    }, 5000);
  }

  // Méthode pour arrêter l'intervalle
  stopStatusCheckInterval() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  // À appeler lors du démontage du composant
  cleanup() {
    this.stopStatusCheckInterval();
  }

  destroy() {
    this.cleanup();
    this.initData();
  }
}

export default TournamentService;
