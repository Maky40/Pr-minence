import { ENV } from "../env.js";
import EventEmitter from "../utils/EventEmitter.js";
import pong42 from "./pong42.js";

class TournamentService extends EventEmitter {
  constructor() {
    super();
    this.baseUrl = `${ENV.API_URL}tournament/tournament/`;
  }
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
      console.log(data);
      this.emit("tournamentCreated", data);
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
      console.log(data);
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

      // Check if player is in tournament
      if (data.current_tournament) {
        this.emit("playerInTournament", data.current_tournament);
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

  async getTournamentDetails(tournamentId) {
    try {
      const response = await fetch(`${this.baseUrl}${tournamentId}/details`, {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to fetch tournament details");

      this.emit("tournamentDetailsLoaded", data);
      return data;
    } catch (error) {
      console.error("Error fetching tournament details:", error);
      throw error;
    }
  }
}

const tournamentService = new TournamentService();
export default tournamentService;
