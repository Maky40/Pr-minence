import Component from "../../../utils/Component.js";
import pong42 from "../../../services/pong42.js";
import { changePage } from "../../../utils/Page.js";
import GameTournoiLobbyTab from "./GameTournoiLobbyTab.js";
import { getPlayerFromList, getMatchInfo } from "./GameTournoiLib.js";
import GameTournoiWaiting from "./GameTournoiWaiting.js";
import auth from "../../../services/auth.js";

class GameTournoiLobby extends Component {
  constructor(tournamentId) {
    super();
    this.tournamentId = tournamentId;
    this.container = null;
    this.playerLeave = false;
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

        // Appeler une fonction async séparée
        this.handleTournamentLeft();
      }
    );

    const cleanupUpdate = pong42.player.tournament.on("update", () => {
      if (auth.authenticated) {
        this.handleFetchTournamentDetails();
      }
    });
    this.cleanupFunctions.push(cleanupTournamentLeft);
    this.cleanupFunctions.push(cleanupUpdate);
  }
  async handleFetchTournamentDetails() {
    if (auth.authenticated) {
      await this.fetchTournamentDetails();
    }
  }
  async handleTournamentLeft() {
    try {
      if (!auth.authenticated) {
        this.setState({ loading: false });
        this.destroy();
        return;
      }
      this.leaveTimeout = setTimeout(async () => {
        if (!auth.authenticated) {
          this.setState({ loading: false });
          this.destroy();
          return;
        }

        await pong42.player.checkUnplayedAndActiveTournament();
        this.setState({ loading: false });
        changePage("game");
        this.destroy();
      }, 100);
    } catch (error) {
      console.error("Erreur dans handleTournamentLeft:", error);
      this.setState({
        loading: false,
        error: "Erreur lors du traitement du tournoi quitté.",
      });
    }
  }
  afterRender() {
    if (!this.state.initialized && !this.state.loading) {
      this.handleFetchTournamentDetails();
    }
  }

  async fetchTournamentDetails() {
    try {
      this.setState({ loading: true });
      const data = await pong42.player.tournament.getTournaments();
      if (!data || typeof data !== "object") {
        throw new Error("Données de tournoi invalides reçues");
      }

      //const currentTournamentStatus = this.state.tournament.status || null;|| currentTournamentStatus != data.status
      this.setState({
        tournament: data,
        loading: false,
        initialized: true,
      });
      if (this.container && pong42.currentPage === "game") {
        this.render(this.container);
      }
      if (data) {
        if (!data.id) {
          console.error("Aucun ID de tournoi trouvé dans les données");
          changePage("game");
        }
        const GameTournoiLobbyTabInstance = new GameTournoiLobbyTab(
          data,
          this.leaveTournament.bind(this),
          pong42.player.tournament.startTournament.bind(
            pong42.player.tournament
          ),
          this.joinTournamentMatch.bind(this)
        );
        GameTournoiLobbyTabInstance.render(this.container);
        if (pong42.player.waitingMatch && pong42.isMasterTab())
          this.goToWaiting(pong42.player.waitingMatchID);
      } else changePage("game");
    } catch (error) {
      console.error("Erreur dans fetchTournamentDetails:", error);
      this.setState({
        error: "Erreur lors de la récupération des données: " + error.message,
        loading: false,
      });
    }
  }
  async goToWaiting(matchId) {
    if (matchId === 0) return;
    const matchInfo = getMatchInfo(matchId, this.state.tournament.matches);
    const playerInfo = getPlayerFromList(pong42.player.id, matchInfo.players);
    const gameTournoiWaiting = new GameTournoiWaiting(
      matchId,
      matchInfo,
      playerInfo
    );
    pong42.player.waitingMatch = true;
    pong42.player.waitingMatchID = matchId;
    gameTournoiWaiting.render(this.container);
    pong42.player.tournament.stopStatusCheckInterval();
    this.destroy();
  }

  joinTournamentMatch(matchId) {
    this.goToWaiting(matchId);
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
