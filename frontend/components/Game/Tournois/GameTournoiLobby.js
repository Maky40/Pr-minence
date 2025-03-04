import Component from "../../../utils/Component.js";
import pong42 from "../../../services/pong42.js";
import { changePage } from "../../../utils/Page.js";
import Toast from "../../toast.js";
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

    pong42.player.tournament.on("tournamentLeft", () => {
      this.state.loading = true;
      if (!this.playerLeave) {
        new Toast("Tournoi annulé", this.leaveMsg(), "info").show();
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
  leaveMsg() {
    if (this.state.tournament.creator) {
      return "Le tournoi a été annulé par le créateur";
    } else {
      return "Vous avez quitté le tournoi";
    }
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
    const joinMatchButtons = this.container.querySelector("#joinMatchButton");
    if (joinMatchButtons) {
      joinMatchButtons.addEventListener("click", async (event) => {
        if (this.waitingForPlayers) {
          return;
        }
        this.waitingForPlayers = true;
        const matchId = event.target.getAttribute("data-match-id");
        const matchInfo = this.getMatchInfo(matchId);
        const playerInfo = this.getPlayerFromList(
          pong42.player.id,
          matchInfo.players
        );
        const gameTournoiWaiting = new GameTournoiWaiting(
          matchId,
          matchInfo,
          playerInfo
        );
        gameTournoiWaiting.render(this.container);
        this.destroy();
      });
    }
  }
  getPlayerFromList(playerId, playersList) {
    if (parseInt(playersList[0].player.id) === parseInt(playerId)) {
      return playersList[0].player;
    }

    // Vérifier le deuxième joueur
    if (parseInt(playersList[1].player.id) === parseInt(playerId)) {
      return playersList[1].player;
    }
    // Si aucun joueur ne correspond, retourner null
    return null;
  }
  getMatchInfo(matchId) {
    return this.state.tournament.matches.find(
      (match) => parseInt(match.id) === parseInt(matchId)
    );
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
            ${
              tournament.status === "PN"
                ? `<button class="btn btn-outline-danger" id="leaveTournamentButton">
                  ${
                    tournament.creator
                      ? "Annuler le tournoi"
                      : "Quitter le tournoi"
                  }
                </button>`
                : ""
            }
            ${
              tournament.creator &&
              tournament.status === "PN" &&
              tournament.players_count >= 8
                ? `<button class="btn btn-outline-success" id="startTournamentButton">
                    Démarrer le tournoi
                  </button>`
                : ""
            }
          </div>
          <div class="card-body">
            <div class="row">
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
                              return `                   
                              <li class="list-group-item p-4 border-start border-5 border-primary position-relative">
                                <!-- Carte de match élégante -->
                                <div class="card shadow-sm border-0">
                                  <div class="card-body p-3">
                                    <!-- Titre du match -->
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                      <h5 class="card-title mb-0">
                                        <span class="badge rounded-pill bg-primary">
                                          ${this.roundAffichage(match.round)} ${
                                match.id
                              }
                                        </span>
                                      </h5>
                                      <span class="badge rounded-pill bg-${
                                        match.state === "UPL"
                                          ? "warning"
                                          : "success"
                                      }">
                                        ${this.statusAffichage(match.state)}
                                      </span>
                                    </div>
                                    
                                    <!-- Joueurs en duel -->
                                    <div class="row align-items-center text-center g-0">
                                      <!-- Premier joueur -->
                                      <div class="col-5">
                                        <div class="d-flex flex-column align-items-center">
                                          <div class="avatar-wrapper mb-2">
                                            <img src="${
                                              match.players[0].player.avatar
                                            }" 
                                                alt="${
                                                  match.players[0].player
                                                    .username
                                                }" 
                                                class="rounded-circle border border-3 border-primary shadow-sm" 
                                                width="64" height="64" />
                                                ${
                                                  match.state === "PLY"
                                                    ? `
                                            <span class="badge rounded-pill bg-${
                                              match.players[0].score >
                                              match.players[1].score
                                                ? "success"
                                                : "danger"
                                            } mt-2">
                                                ${match.players[0].score} points
                                              </span>
                                            </span>
                                          `
                                                    : ""
                                                }
                                          </div>
                                          <h6 class="fw-bold mb-0">${
                                            match.players[0].player.username
                                          }</h6>
                                        </div>
                                      </div>
                                      
                                      <!-- VS Badge au centre -->
                                      <div class="col-2">
                                        <div class="vs-badge">
                                          <span class="badge rounded-pill bg-danger p-2 fs-6 fw-bold">VS</span>
                                        </div>
                                      </div>
                                      
                                      <!-- Deuxième joueur -->
                                      <div class="col-5">
                                        <div class="d-flex flex-column align-items-center">
                                          <div class="avatar-wrapper mb-2">
                                            <img src="${
                                              match.players[1].player.avatar
                                            }" 
                                                alt="${
                                                  match.players[1].player
                                                    .username
                                                }" 
                                                class="rounded-circle border border-3 border-primary shadow-sm" 
                                                width="64" height="64" />
                                                ${
                                                  match.state === "PLY"
                                                    ? `
                                            <span class="badge rounded-pill bg-${
                                              match.players[1].score >
                                              match.players[0].score
                                                ? "success"
                                                : "danger"
                                            } mt-2">
                                                  ${
                                                    match.players[1].score
                                                  } points
                                                </span>
                                          `
                                                    : ""
                                                }
                                                
                                          </div>
                                          <h6 class="fw-bold mb-0">${
                                            match.players[1].player.username
                                          }</h6>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <!-- Bouton Rejoindre si nécessaire -->
                                    ${
                                      this.isPlayerIdPresent(
                                        pong42.player.id,
                                        match.players
                                      ) && match.state === "UPL"
                                        ? `
                                        <div class="text-center mt-4">
                                          <button class="btn btn-primary btn-lg btn-join-match w-75" data-match-id="${match.id}" id="joinMatchButton">
                                            <i class="bi bi-controller me-2"></i>Rejoindre le match
                                          </button>
                                        </div>
                                        `
                                        : ""
                                    }
                                  </div>
                                </div>
                              </li>
                          `;
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
