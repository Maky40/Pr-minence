import Component from "../../../utils/Component.js";
import pong42 from "../../../services/pong42.js";
import { changePage } from "../../../utils/Page.js";
import Toast from "../../toast.js";

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

    pong42.player.tournament.on("tournamentLeft", () => {
      this.state.loading = true;
      console.log(pong42.player.tournament);
      if (!this.playerLeave) {
        new Toast(
          "Tournoi annulé",
          "Le tournoi a été annulé par le créateur",
          "info"
        ).show();
      }
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

  roundAffichage(round) {
    //convertissage des rounds en francais
    //    ('QU', 'Quart de finale'),
    //    ('HF', 'Demi-finale'),
    //    ('FN', 'Finale'),
    switch (round) {
      case "QU":
        return "Quart de finale";
      case "HF":
        return "Demi-finale";
      case "FN":
        return "Finale";
      default:
        return "Erreur";
    }
  }
  statusAffichage(status) {
    //convertissage des status en francais
    //    ('UPL', 'En attente des joueurs'),
    //    ('PLY', 'Terminé'),
    switch (status) {
      case "UPL":
        return "En attente des joueurs";
      case "PLY":
        return "Terminé";
      default:
        return "Erreur";
    }
  }
  async afterRender() {
    if (!this.state.initialized && !this.state.loading)
      await this.fetchTournamentDetails();
    const startTournamentButton = this.container.querySelector(
      "#startTournamentButton"
    );
    if (startTournamentButton) {
      startTournamentButton.addEventListener("click", async () => {
        try {
          this.setState({ loading: true });
          await pong42.player.tournament.startTournament(
            this.state.tournament.id
          );
        } catch (error) {
          this.setState({
            error: error.message,
            loading: false,
          });
        }
      });
    }
    const leaveButton = this.container.querySelector("#leaveTournamentButton");
    if (leaveButton) {
      leaveButton.addEventListener("click", () => this.leaveTournament());
    }
  }

  isPlayerIdPresent(playerId, playersList) {
    if (
      parseInt(playersList[0].player.id) === parseInt(playerId) ||
      parseInt(playersList[1].player.id) === parseInt(playerId)
    )
      return true;
    return false;
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
      this.playerLeave = true;
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
            ${
              tournament.creator &&
              tournament.status === "PN" &&
              tournament.players_count >= 8
                ? `
              <button class="btn btn-outline-success" id="startTournamentButton">
                Démarrer le tournoi
              </button>
            `
                : ""
            }
          </div>
          <div class="card-body">
            <div class="row">
              <!-- Liste des joueurs -->
                  <div class="card-header">
                    <h4 class="mb-0">Nombre de joueurs inscrit :${
                      tournament.players_count || 0
                    }</h4>
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
                : `<!-- Matchs en cours -->
                  <div class="card mt-4">
                    <div class="card-header">
                      <h4 class="mb-0">Matchs en cours</h4>
                    </div>
                    <div class="card-body">
                      ${
                        tournament.matches?.length
                          ? `
                        <ul class="list-group">
                          ${tournament.matches
                            .map((match) => {
                              return match.current
                                ? `                   
                              <li class="list-group-item">
                              <div class="d-flex justify-content-between align-items-center">
                                <img src="${
                                  match.players[0].player.avatar
                                }" alt="Avatar" class="rounded-circle" width="50" height="50" />
                                <span class="badge bg-primary">VS</span>
                                <img src="${
                                  match.players[1].player.avatar
                                }" alt="Avatar" class="rounded-circle" width="50" height="50" />
                              </div>
                              <div class="d-flex justify-content-between align-items-center mt-2">
                              round: ${this.roundAffichage(
                                match.round
                              )} state: ${this.statusAffichage(match.state)}
                              </div>
                              ${
                                this.isPlayerIdPresent(
                                  pong42.player.id,
                                  match.players
                                )
                                  ? `
                                  <div class="d-flex justify-content-between align-items-center mt-2">
                                      <button class="btn btn-primary btn-join-match" data-match-id="${match.id}">Rejoindre</button>
                                    </div>
                                  `
                                  : ``
                              }
                            </li>
                          `
                                : "";
                            })
                            .join("")}
                        </ul>
                      `
                          : '<p class="text-muted">Aucun match en cours</p>'
                      }
                    </div>
                  </div>`
            }
          </div>
        </div>
      </div>
    `;
  }
}

export default GameTournoiLobby;
