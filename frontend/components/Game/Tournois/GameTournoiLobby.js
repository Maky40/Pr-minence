import Component from "../../../utils/Component.js";
import pong42 from "../../../services/pong42.js";
import { changePage } from "../../../utils/Page.js";

class GameTournoiLobby extends Component {
  constructor(tournamentId) {
    super();
    this.tournamentId = tournamentId;
    this.container = null;
    this.state = {
      tournament: null,
      error: null,
      loading: false,
      initialized: false,
    };

    pong42.player.tournament.on("tournamentLeft", () => {
      this.state.loading = true;
      console.log(pong42.player.tournament);

      setTimeout(() => {
        pong42.player.checkUnplayedAndActiveTournament();
        this.state.loading = false;
        this.destroy();
        changePage("game");
      }, 100);
      //changePage("game");
    });
    pong42.player.tournament.on("update", () => {
      this.fetchTournamentDetails();
    });
  }

  async afterRender() {
    console.log("GameTournoiLobby constructor");
    if (!this.state.initialized && !this.state.loading)
      await this.fetchTournamentDetails();
    const leaveButton = this.container.querySelector("#leaveTournamentButton");
    if (leaveButton) {
      leaveButton.addEventListener("click", () => this.leaveTournament());
    }
  }

  async fetchTournamentDetails() {
    try {
      this.setState({ loading: true });
      const data = await pong42.player.tournament.getTournaments();
      this.setState({
        tournament: data,
        loading: false,
        initialized: true,
      });
      if (this.container) {
        this.render(this.container);
      }
    } catch (error) {
      this.setState({
        error: error.message,
        loading: false,
      });
    }
  }

  async leaveTournament() {
    try {
      pong42.player.tournament.off("update");
      this.setState({ loading: true });
      await pong42.player.tournament.leaveTournament(this.state.tournament.id);
      // Pas besoin de naviguer ici car l'événement tournamentLeft le fera
    } catch (error) {
      this.setState({
        error: error.message,
        loading: false,
      });
    }
  }

  async destroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    await pong42.player.checkUnplayedAndActiveTournament();
    pong42.player.tournament.off("tournamentLeft");
    pong42.player.tournament.off("update");
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
    if (!tournament) {
      return `
        <div class="container mt-5">
          <div class="alert alert-warning" role="alert">
            Tournoi non trouvé
          </div>
        </div>
      `;
    }

    return `
      <div class="container mt-5">
        <div class="card shadow">
          <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h3 class="mb-0">${tournament.name}</h3>
            <button class="btn btn-outline-danger" id="leaveTournamentButton">
              ${
                tournament.creator ? "Annuler le tournoi" : "Quitter le tournoi"
              }
            </button>
          </div>
          <div class="card-body">
            <div class="row">
              <!-- Liste des joueurs -->
              <div class="col-md-6">
                <div class="card mb-4">
                  <div class="card-header">
                    <h4 class="mb-0">Joueurs (${
                      tournament.players_count || 0
                    })</h4>
                  </div>
                  <div class="card-body">
                    <ul class="list-group">
                      ${
                        tournament.players
                          ?.map(
                            (player) => `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                          ${player.username}
                          ${
                            player.isReady
                              ? '<span class="badge bg-success">Prêt</span>'
                              : '<span class="badge bg-warning">En attente</span>'
                          }
                        </li>
                      `
                          )
                          .join("") || "Aucun joueur"
                      }
                    </ul>
                  </div>
                </div>
              </div>

              <!-- Matchs en cours -->
              <div class="col-md-6">
                <div class="card">
                  <div class="card-header">
                    <h4 class="mb-0">Matchs en cours</h4>
                  </div>
                  <div class="card-body">
                    ${
                      tournament.matches?.length
                        ? `
                      <ul class="list-group">
                        ${tournament.matches
                          .map(
                            (match) => `
                          <li class="list-group-item">
                            <div class="d-flex justify-content-between align-items-center">
                              <span>${match.player1}</span>
                              <span class="badge bg-primary">VS</span>
                              <span>${match.player2}</span>
                            </div>
                          </li>
                        `
                          )
                          .join("")}
                      </ul>
                    `
                        : '<p class="text-muted">Aucun match en cours</p>'
                    }
                  </div>
                </div>
              </div>
            </div>

            ${
              tournament.status === "PN"
                ? `
              <div class="alert alert-info mt-4 text-center">
                <h4 class="alert-heading">En attente du début du tournoi</h4>
                <p class="mb-0">
                  ${
                    tournament.requiredPlayers
                      ? `${tournament.players?.length || 0}/${
                          tournament.requiredPlayers
                        } joueurs requis`
                      : "En attente de joueurs supplémentaires..."
                  }
                </p>
              </div>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `;
  }
}

export default GameTournoiLobby;
