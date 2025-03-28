import Component from "../../../utils/Component.js";
import pong42 from "../../../services/pong42.js";
import { changePage } from "../../../utils/Page.js";
import Toast from "../../toast.js";
import GameTournoiLobbyTab from "./GameTournoiLobbyTab.js";
import { getPlayerFromList, getMatchInfo } from "./GameTournoiLib.js";
import GameTournoiWaiting from "./GameTournoiWaiting.js";

class GameTournoiLobby extends Component {
  constructor(tournamentId) {
    super();
    this.tournamentId = tournamentId;
    this.container = null;
    this.playerLeave = false;
    this.waitingForPlayers = false;
    this.state = {
      tournament: null,
      error: null,
      loading: false,
      initialized: false,
    };
    this.cleanupFunctions = [];
    const cleanupTournamentLeft = pong42.player.tournament.on(
      "tournamentLeft",
      () => {
        this.setState({ loading: true });
        if (!this.playerLeave) {
          new Toast("Tournoi annulé", this.leaveMsg(), "info").show();
        }
        this.leaveTimeout = setTimeout(() => {
          pong42.player.checkUnplayedAndActiveTournament();
          this.setState({ loading: false });
          changePage("game");
          this.destroy();
        }, 100);
      }
    );
    const cleanupUpdate = pong42.player.tournament.on("update", () => {
      this.fetchTournamentDetails();
    });
    this.cleanupFunctions.push(cleanupTournamentLeft);
    this.cleanupFunctions.push(cleanupUpdate);
  }

  leaveMsg() {
    // Vérifier si tournament est défini avant d'accéder à ses propriétés
    if (!this.state.tournament || !this.state.tournament.creator) {
      return "Vous avez quitté le tournoi";
    }

    if (this.state.tournament.creator) {
      return "Le tournoi a été annulé par le créateur";
    } else {
      return "Vous avez quitté le tournoi";
    }
  }

  async afterRender() {
    if (!this.state.initialized && !this.state.loading) {
      await this.fetchTournamentDetails();
    }
  }

  async fetchTournamentDetails() {
    try {
      this.setState({ loading: true });
      const data = await pong42.player.tournament.getTournaments();
      if (!data || typeof data !== "object") {
        throw new Error("Données de tournoi invalides reçues");
      }
      this.setState({
        tournament: data,
        loading: false,
        initialized: true,
      });
      if (this.container) {
        this.render(this.container);
      }
      if (data) {
        const GameTournoiLobbyTabInstance = new GameTournoiLobbyTab(
          data,
          this.leaveTournament.bind(this),
          pong42.player.tournament.startTournament.bind(
            pong42.player.tournament
          ),
          this.joinTournamentMatch.bind(this)
        );
        GameTournoiLobbyTabInstance.render(this.container);
      }
    } catch (error) {
      console.error("Erreur dans fetchTournamentDetails:", error);
      this.setState({
        error: "Erreur lors de la récupération des données: " + error.message,
        loading: false,
      });
    }
  }
  joinTournamentMatch(matchId) {
    const matchInfo = getMatchInfo(matchId, this.state.tournament.matches);
    const playerInfo = getPlayerFromList(pong42.player.id, matchInfo.players);
    const gameTournoiWaiting = new GameTournoiWaiting(
      matchId,
      matchInfo,
      playerInfo
    );
    gameTournoiWaiting.render(this.container);
    this.destroy();
  }

  async leaveTournament() {
    try {
      this.setState({ loading: true });
      this.playerLeave = true;

      if (this.state.tournament && this.state.tournament.id) {
        await pong42.player.tournament.leaveTournament(
          this.state.tournament.id
        );
      } else {
        throw new Error("ID de tournoi non disponible");
      }
    } catch (error) {
      console.error("Erreur dans leaveTournament:", error);
      this.setState({
        error: "Erreur lors de la quitte du tournoi: " + error.message,
        loading: false,
      });
    }
  }

  async destroy() {
    if (this.leaveTimeout) {
      clearTimeout(this.leaveTimeout);
      this.leaveTimeout = null;
    }
    this.cleanupFunctions.forEach((cleanup) => {
      if (typeof cleanup === "function") {
        cleanup();
      }
    });
    await pong42.player.checkUnplayedAndActiveTournament();
    super.destroy();
  }

  template() {
    if (this.state.loading) {
      return `
        <div class="container mt-5">
          <div class="text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      `;
    }

    if (this.state.error) {
      return `
        <div class="container mt-5">
          <div class="alert alert-danger" role="alert">
            ${this.state.error}
          </div>
        </div>
      `;
    }
    const tournament = this.state.tournament;
    if (!this.state.tournament) {
      return `
        <div class="container mt-5">
          <div class="alert alert-warning" role="alert">
            Tournoi non trouvé
          </div>
        </div>
      `;
    }
  }
}

export default GameTournoiLobby;
