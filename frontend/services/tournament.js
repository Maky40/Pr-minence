import { ENV } from "../env.js";
import EventEmitter from "../utils/EventEmitter.js";
import pong42 from "./pong42.js";
import Toast from "../components/toast.js";
import { changePage } from "../utils/Page.js";
import { msgNewMatch, handleMatchResult } from "../utils/TournamentMsg.js";
import auth from "./auth.js";

class TournamentService extends EventEmitter {
  constructor() {
    super();
    this.baseUrl = `${ENV.API_URL}tournament/tournament/`;
    this.current_tournament_info = null;
    this.previous_tournament_info = null;
    this.interval = null;
    this.idMatchmessageShowed = null;
    this.firstTime = true;
    this.init();
  }

  init = async () => {
    try {
      await this.getTournaments();
      if (this.current_tournament_info) {
        console.log(
          "[Tournament] Emitting initial update even EMIT 1",
          this.tournamentInfo
        );
        this.emit("update", this.tournamentInfo);
      }
      this.startStatusCheckInterval();
    } catch (error) {
      console.error("Failed to initialize tournament service:", error);
    }
  };

  /**
   * Renvoie les informations du tournoi précédent pour l'UI
   */
  get previousTournamentInfo() {
    if (!this.previous_tournament_info) return null;

    return {
      tournamentId: this.previous_tournament_info.id || 0,
      name: this.previous_tournament_info.name,
      tournamentStatus: this.previous_tournament_info.status,
      tournamentStatusDisplayName: this.get_status_display(
        this.previous_tournament_info.status
      ),
      tournamentStatusDisplayClass: this.get_btn_display(
        this.previous_tournament_info.status
      ),
      tournamentCurren_round: this.previous_tournament_info.current_round,
      tournamentMatches: this.previous_tournament_info.matches || [],
      tournamentCreator: this.previous_tournament_info.creator,
      tournamentPlayers_count: this.previous_tournament_info.players_count || 0,
    };
  }

  /**
   * Renvoie les informations de tournoi actuelles pour l'UI
   */
  get tournamentInfo() {
    if (!this.current_tournament_info) return null;

    return {
      tournamentId: this.current_tournament_info.id || 0,
      name: this.current_tournament_info.name,
      tournamentStatus: this.current_tournament_info.status,
      tournamentStatusDisplayName: this.get_status_display(
        this.current_tournament_info.status
      ),
      tournamentStatusDisplayClass: this.get_btn_display(
        this.current_tournament_info.status
      ),
      tournamentCurren_round: this.current_tournament_info.current_round,
      tournamentMatches: this.current_tournament_info.matches || [],
      tournamentCreator: this.current_tournament_info.creator,
      tournamentPlayers_count: this.current_tournament_info.players_count || 0,
    };
  }

  /**
   * Propriété pour accéder facilement à l'ID du tournoi
   */
  get currentTournamentId() {
    return this.current_tournament_info?.id || 0;
  }

  /**
   * Compare l'état actuel du tournoi avec un nouvel état pour détecter les changements
   * @param {Object} newTournamentData - Nouvelles données du tournoi
   * @returns {Object} - Changements détectés avec status booléen
   */
  detectChanges(newTournamentData) {
    // Si pas de données actuelles, tout est considéré comme nouveau
    if (!this.current_tournament_info) {
      return {
        hasChanged: true,
        tournamentChanged: true,
        changes: {
          statusChanged: true,
          roundChanged: true,
          matchesChanged: true,
          creatorChanged: true,
          playersCountChanged: true,
        },
      };
    }

    // Comparer les propriétés pour détecter les changements
    const statusChanged =
      this.current_tournament_info.status !== newTournamentData.status;
    const roundChanged =
      this.current_tournament_info.current_round !==
      newTournamentData.current_round;
    const matchesChanged =
      JSON.stringify(this.current_tournament_info.matches) !==
      JSON.stringify(newTournamentData.matches);
    const creatorChanged =
      this.current_tournament_info.creator !== newTournamentData.creator;
    const playersCountChanged =
      this.current_tournament_info.players_count !==
      newTournamentData.players_count;

    // Déterminer si un changement a eu lieu
    const hasChanged =
      statusChanged ||
      roundChanged ||
      matchesChanged ||
      creatorChanged ||
      playersCountChanged;

    return {
      hasChanged,
      tournamentChanged: this.currentTournamentId !== newTournamentData.id,
      changes: {
        statusChanged,
        roundChanged,
        matchesChanged,
        creatorChanged,
        playersCountChanged,
      },
    };
  }
  /**
   * Met à jour les informations de tournoi
   * @param {Object} tournamentData - Nouvelles données de tournoi
   */
  updateTournamentInfo(tournamentData) {
    // Sauvegarder l'état précédent
    this.previous_tournament_info = this.current_tournament_info
      ? { ...this.current_tournament_info }
      : null;

    // Mettre à jour l'état actuel
    this.current_tournament_info = { ...tournamentData };

    // Émettre un événement de mise à jour
    console.log(
      "[Tournament] Tournament updated EMIT2:",
      this.current_tournament_info
    );
    this.emit("update", this.tournamentInfo);
  }

  /**
   * Réinitialise les données du tournoi
   */
  resetTournamentInfo() {
    this.previous_tournament_info = this.current_tournament_info;
    this.current_tournament_info = null;
    this.idMatchmessageShowed = null;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
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

  /**
   * Mise à jour et notification des changements de statut
   * @param {string} newStatus - Nouveau statut du tournoi
   */
  notifyStatusChange(newStatus, oldStatus) {
    if (newStatus !== oldStatus) {
      const updateToast = new Toast(
        "Tournoi",
        `Le statut du tournoi est maintenant: ${this.get_status_display(
          newStatus
        )}`,
        "info"
      );
      updateToast.show();
    }
  }

  /**
   * Met à jour le statut du tournoi depuis le serveur
   */
  updateTournamentStatus = async () => {
    try {
      // Récupérer les dernières données du tournoi
      const tournament = await this.getTournaments();
      console.log(
        "[Tournament] Tournament status updated from server EMIT3:",
        tournament
      );
      if (!tournament || !tournament.id) {
        this.resetTournamentInfo();
        this.stopStatusCheckInterval();
        return;
      }

      // Détecter les changements
      const { hasChanged, tournamentChanged, changes } =
        this.detectChanges(tournament);
      // Si changement détecté, mettre à jour et notifier
      if (hasChanged) {
        const oldStatus = this.current_tournament_info?.status;
        this.updateTournamentInfo(tournament);
        if (changes.statusChanged) {
          this.notifyStatusChange(tournament.status, oldStatus);
        }
      }
    } catch (error) {
      console.error("Failed to update tournament status:", error);
      const toast = new Toast(
        "Erreur",
        "Échec de la mise à jour du statut du tournoi",
        "error"
      );
      toast.show();
    }
  };

  /**
   * Crée un nouveau tournoi
   * @param {string} name - Nom du tournoi
   */
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

      // Mettre à jour les informations du tournoi
      this.updateTournamentInfo(data.current_tournament);
      this.emit("update", this.tournamentInfo);
      this.startStatusCheckInterval();

      return data;
    } catch (error) {
      console.error("Error creating tournament:", error);
      throw error;
    }
  }

  /**
   * Rejoint un tournoi existant
   * @param {number} tournamentId - ID du tournoi à rejoindre
   */
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

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to join tournament");

      // Mise à jour des informations
      this.updateTournamentInfo(data);
      this.emit("update", this.tournamentInfo);
      console.log("[Tournament] Tournament joined successfully EMIT4");
      this.startStatusCheckInterval();

      return data;
    } catch (error) {
      console.error("Error joining tournament:", error);
      throw error;
    }
  }

  /**
   * Démarre un tournoi
   * @param {number} tournamentId - ID du tournoi à démarrer
   */
  async startTournament(tournamentId) {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start",
          tournament_id: tournamentId,
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to start tournament");

      this.updateTournamentStatus();
      return data;
    } catch (error) {
      console.error("Error starting tournament:", error);
      throw error;
    }
  }

  /**
   * Quitte un tournoi
   * @param {number} tournamentId - ID du tournoi à quitter
   */
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

      this.destroy();
      this.emit("tournamentLeft", data);
      return data;
    } catch (error) {
      console.error("Error leaving tournament:", error);
      throw error;
    }
  }
  getUplayMatch(match) {
    if (match.state === "UPL") {
      return match;
    }
    return null;
  }
  getUplayMatches(matches) {
    const uplayMatches = matches.filter((match) => this.getUplayMatch(match));
    return uplayMatches;
  }
  /**
   * Trouve le prochain match du joueur actuel
   * @param {Array} matches - Liste des matches du tournoi
   * @returns {Object|null} Le match trouvé ou null
   */
  getNextCurrentUserMatch(matches) {
    if (!this.tournamentInfo.tournamentId) {
      console.log("No tournament ID available");
      return null;
    }
    const matchesUplay = this.getUplayMatches(matches);
    const foundMatch = matchesUplay.find((match) => {
      return match.players.some(
        (player) => parseInt(player.player.id) === parseInt(pong42.player.id)
      );
    });
    if (foundMatch) {
      return foundMatch;
    }
    console.log("No match found for the current user");
    return null;
  }

  /**
   * Récupère les informations sur les tournois
   */
  async getTournaments() {
    try {
      const response = await fetch(this.baseUrl, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      // Vérifier si la réponse est du JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        this.emit("tournamentsLoaded", { tournaments: [] });
        return null;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch tournaments");
      }
      // Cas où l'utilisateur est dans un tournoi
      if (data.current_tournament) {
        // Si le tournoi a changé ou est nouveau
        if (
          !this.current_tournament_info ||
          this.currentTournamentId !== data.current_tournament.id
        ) {
          this.resetTournamentInfo();
          this.updateTournamentInfo(data.current_tournament);
          console.log(
            "[Tournament] Tournament changed or new tournament detected EMIT5"
          );
          this.emit("update", this.tournamentInfo);
          this.startStatusCheckInterval();
        }

        // Vérifier si le joueur a un match
        const myNextMatch = this.getNextCurrentUserMatch(
          data.current_tournament.matches
        );
        console.log(
          "[Tournament] Current tournament status:",
          data.current_tournament.status
        );
        // Si le tournoi est en cours (BG: "Begining" - démarré)
        if (data.current_tournament.status === "BG") {
          if (
            myNextMatch &&
            pong42.currentPage !== "game" &&
            myNextMatch.state === "UPL" &&
            this.idMatchmessageShowed !== myNextMatch.id
          ) {
            this.idMatchmessageShowed = myNextMatch.id;
            this.stopStatusCheckInterval();
            msgNewMatch(() => {
              changePage("game");
            });
          }
        }
        return data.current_tournament;
      } else {
        // L'utilisateur n'est pas dans un tournoi
        if (this.currentTournamentId !== 0) {
          this.resetTournamentInfo();
        }
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
  /**
   * Vérifie et met à jour le statut du tournoi
   */
  async checkAndUpdateTournamentStatus() {
    try {
      if (!this.tournamentId) {
        console.log("No tournament ID available");
        this.stopStatusCheckInterval();
        return;
      }

      if (auth.isAuthenticated) {
        await this.updateTournamentStatus();
      } else {
        this.stopStatusCheckInterval();
      }
    } catch (error) {
      console.error("Error updating tournament status:", error);
      this.stopStatusCheckInterval(); // Arrêt de l'intervalle en cas d'erreur
    }
  }

  /**
   * Démarre l'intervalle de vérification du statut du tournoi
   */
  startStatusCheckInterval() {
    if (this.interval) {
      console.log("[Tournament] Interval already running, skipping");
      return;
    }
    if (!auth.isAuthenticated) {
      console.log("[Tournament] User is not authenticated, skipping interval");
      return;
    }
    this.stopStatusCheckInterval();
    // Nettoyage de l'intervalle existant

    // Vérification de la présence d'un tournamentId
    if (!this.tournamentId) {
      console.log("No tournament ID provided");
      return;
    }

    this.interval = setInterval(async () => {
      console.log("[Tournament] Checking tournament status every 5 seconds");
      await this.checkAndUpdateTournamentStatus();
    }, 5000);
    pong42.registerInterval(this.interval); // Enregistrement de l'intervalle
  }

  /**
   * Arrête l'intervalle de vérification
   */
  stopStatusCheckInterval() {
    console.log("[Tournament] Stopping status check interval");
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Nettoie les ressources lors du démontage
   */
  cleanup() {
    this.stopStatusCheckInterval();
  }

  /**
   * Détruit complètement le service
   */
  destroy() {
    // Arrêter l'intervalle de vérification
    this.cleanup();
    this.resetTournamentInfo();

    // Émettre un événement pour informer que le tournoi est quitté
    this.emit("tournamentLeft", {});

    // Émettre un événement pour vider la liste des tournois
    this.emit("tournamentsLoaded", { tournaments: [] });

    console.log("[Tournament] Service destroyed and events cleared");
  }
}

export default TournamentService;
