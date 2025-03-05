import Component from "../../../utils/Component.js";
import GameTournoiWaiting from "./GameTournoiWaiting.js";
import {
  statusAffichage,
  roundAffichage,
  isPlayerIdPresent,
  getPlayerFromList,
  getMatchInfo,
} from "./GameTournoiLib.js";
class GameTournoiLobbyTab extends Component {
  constructor(tournament, leaveTournamentFtn) {
    super();
    this.tournament = tournament;
    this.leaveTournament = leaveTournamentFtn;
  }

  playerDisplayBadge(currentPlayer, otherPlayer, match) {
    return `                                        
        <div class="d-flex flex-column align-items-center">
            <div class="avatar-wrapper mb-2">
            <img src="${currentPlayer.player.avatar}" 
            alt="${currentPlayer.player.username}" 
            class="rounded-circle border border-3 border-primary shadow-sm" 
            width="64" height="64" />
            ${
              match.state === "PLY"
                ? `
        <span class="badge rounded-pill bg-${
          currentPlayer.score > otherPlayer.score ? "success" : "danger"
        } mt-2">
            ${currentPlayer.score} points
            </span>
        </span>
        `
                : ""
            }
        </div>
        <h6 class="fw-bold mb-0">${currentPlayer.player.username}</h6>
    </div>`;
  }
  afterRender() {
    const startTournamentButton = this.container.querySelector(
      "#startTournamentButton"
    );
    const joinMatchButtons = this.container.querySelector("#joinMatchButton");
    const leaveButton = this.container.querySelector("#leaveTournamentButton");
    this.attachEvent(startTournamentButton, "click", async (e) => {
      e.preventDefault();
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
    this.attachEvent(leaveButton, "click", (e) => {
      e.preventDefault();
      this.leaveTournament();
    });
    this.attachEvent(joinMatchButtons, "click", (e) => {
      e.preventDefault();
      if (this.waitingForPlayers) {
        return;
      }
      this.waitingForPlayers = true;
      const matchId = event.target.getAttribute("data-match-id");
      const matchInfo = getMatchInfo(matchId, this.tournament.matches);
      const playerInfo = getPlayerFromList(pong42.player.id, matchInfo.players);
      const gameTournoiWaiting = new GameTournoiWaiting(
        matchId,
        matchInfo,
        playerInfo
      );
      gameTournoiWaiting.render(this.container);
      this.destroy();
    });
  }

  template() {
    return `
      <div class="container mt-5">
        <div class="card shadow">
          <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h3 class="mb-0">${this.tournament.name}</h3>
            ${
              this.tournament.status === "PN"
                ? `<button class="btn btn-outline-danger" id="leaveTournamentButton">
                  ${
                    this.tournament.creator
                      ? "Annuler le tournoi"
                      : "Quitter le tournoi"
                  }
                </button>`
                : ""
            }
            ${
              this.tournament.creator &&
              this.tournament.status === "PN" &&
              this.tournament.players_count >= 8
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
                      this.tournament.players_count || 0
                    }</h4>
              </div>
            </div>

            ${
              this.tournament.status === "PN"
                ? `
              <div class="alert alert-info mt-4 text-center">
                <h4 class="alert-heading">En attente du début du tournoi</h4>
                <p class="mb-0">
                  ${
                    this.tournament.requiredPlayers
                      ? `${this.tournament.players?.length || 0}/${
                          this.tournament.requiredPlayers
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
                        this.tournament.matches?.length
                          ? `
                        <ul class="list-group">
                          ${this.tournament.matches
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
                                          ${roundAffichage(match.round)} ${
                                match.id
                              }
                                        </span>
                                      </h5>
                                      <span class="badge rounded-pill bg-${
                                        match.state === "UPL"
                                          ? "warning"
                                          : "success"
                                      }">
                                        ${statusAffichage(match.state)}
                                      </span>
                                    </div>
                                    
                                    <!-- Joueurs en duel -->
                                    <div class="row align-items-center text-center g-0">
                                      <!-- Premier joueur -->
                                      <div class="col-5">
                                        ${this.playerDisplayBadge(
                                          match.players[0],
                                          match.players[1],
                                          match
                                        )}
                                      </div>
                                      <!-- VS Badge au centre -->
                                      <div class="col-2">
                                        <div class="vs-badge">
                                          <span class="badge rounded-pill bg-danger p-2 fs-6 fw-bold">VS</span>
                                        </div>
                                      </div>
                                      
                                      <!-- Deuxième joueur -->
                                      <div class="col-5">
                                        ${this.playerDisplayBadge(
                                          match.players[1],
                                          match.players[0],
                                          match
                                        )}
                                      </div>
                                    </div>
                                    
                                    <!-- Bouton Rejoindre si nécessaire -->
                                    ${
                                      isPlayerIdPresent(
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

export default GameTournoiLobbyTab;
