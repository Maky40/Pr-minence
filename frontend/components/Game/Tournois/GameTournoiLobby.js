import Component from "../../../utils/Component.js";
import pong42 from "../../../services/pong42.js";
import { changePage } from "../../../utils/Page.js";
import Toast from "../../toast.js";
import GameTournoiLobbyTab from "./GameTournoiLobbyTab.js";

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

    // Stocker les fonctions de nettoyage
    this.cleanupFunctions = [];

    // Utilisez la méthode "on" qui renvoie une fonction de nettoyage
    const cleanupTournamentLeft = pong42.player.tournament.on(
      "tournamentLeft",
      () => {
        this.setState({ loading: true });
        if (!this.playerLeave) {
          new Toast("Tournoi annulé", this.leaveMsg(), "info").show();
        }
        setTimeout(() => {
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

    // Stocker pour nettoyage ultérieur
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
      console.log("Tournament data received:", data);

      // Vérifier si on a reçu des données valides
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
          this.leaveTournament.bind(this)
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
    if (this.interval) {
      clearInterval(this.interval);
    }

    // Nettoyer tous les écouteurs d'événements
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
    console.log(this.state.tournament);
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
