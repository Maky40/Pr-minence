import Component from "../../utils/Component.js";
import pong42 from "../../services/pong42.js";
import { changePage } from "../../utils/Page.js";

class GameOverComponent extends Component {
  constructor() {
    super();
    this.gameConfig = null;
    this.gameState = null;
    this.webSocket = null;
    this.local = false;
    this.previousTournamentInfo = null;
    this.tournament = null;
    this.music = null;
    this.winner = null;
    this.gestTournament = false;
  }
  async init(gameComponent) {
    this.gameConfig = gameComponent.gameConfig;
    this.gameState = gameComponent.gameState;
    this.webSocket = gameComponent.webSocket;
    this.local = gameComponent.local;
    this.previousTournamentInfo =
      pong42.player.tournament.previousTournamentInfo;
    this.tournament = pong42.player.tournament.tournamentInfo;
    this.music = gameComponent.music;
    this.winner = gameComponent.winner || "Game Over";
    this.gestTournament = false;
    console.log(
      "[TOURNAMENT] GameOverComponent constructor called",
      this.gameState
    );
    console.log(
      "[TOURNAMENT] GameOverComponent constructor called",
      this.tournament
    );
  }

  displayTournamentRound(currentTournementRound) {
    const tournamentRoundDisplay = {
      QU: "1/4 de finale",
      HF: "1/2 finale",
      FN: "Finale",
    };
    return tournamentRoundDisplay[currentTournementRound] || "Match";
  }

  setupEventListeners = () => {
    const btnLeaveGame = document.getElementById("btnLeaveGame");
    if (btnLeaveGame) {
      this.attachEvent(btnLeaveGame, "click", async () => {
        try {
          this.destroy();
          this.handleTournamentStatus();
        } catch (error) {
          console.error("Erreur lors de la déconnexion :", error);
        }
      });
    }
  };

  async handleTournamentStatus() {
    if (
      pong42.player.tournament &&
      pong42.player.tournament.currentTournamentId &&
      !this.gestTournament
    ) {
      this.gestTournament = true;
      //await pong42.player.tournament.getTournaments();
      pong42.player.tournament.startStatusCheckInterval();
    }
    this.destroy();
    if (this.webSocket) {
      this.webSocket.removeAllListeners();
      this.webSocket.close();
    }
    pong42.player.socketMatch = null;
    if (this.music) await this.music.stop();
    changePage("game");
  }

  afterRender() {
    this.attachEvent(window, "beforeunload", () => {
      this.handleTournamentStatus();
      this.destroy();
    });
    this.setupEventListeners();
  }
  destroy() {
    this.detachEvent(window, "beforeunload");
    this.detachEvent(window, "resize");
    this.detachEvent(document, "click");
    this.detachEvent(document, "keydown");
  }

  template() {
    return `
    <div class="game-container position-relative vh-100 bg-dark">
      <canvas id="gameCanvas"
              width="${this.gameConfig.WIDTH}"
              height="${this.gameConfig.HEIGHT}"
              class="position-absolute top-50 start-50 translate-middle shadow-lg opacity-50">
      </canvas>

      <!-- Game Over Overlay -->
      <div class="position-absolute w-100 h-100 d-flex justify-content-center align-items-center"
           style="background: rgba(0, 0, 0, 0.8); z-index: 1000;">
        <div class="text-center">
          <h1 class="display-1 text-danger mb-4"
              style="font-family: 'Orbitron', sans-serif; text-shadow: 0 0 20px rgba(255, 0, 0, 0.7);">
            GAME OVER
          </h1>

          <!-- Final Score -->
          <div class="bg-black bg-opacity-75 p-4 rounded-pill border border-3 border-info mb-4">
            <div class="d-flex justify-content-center align-items-center gap-5">
              <div class="text-center">
                <div class="display-6 text-info" style="font-family: 'Orbitron', sans-serif;">
                  ${this.gameState.score1}
                </div>
                <small class="text-white-50">${this.gameState.player1}</small>
              </div>
              <div class="text-danger display-6">VS</div>
              <div class="text-center">
                <div class="display-6 text-info" style="font-family: 'Orbitron', sans-serif;">
                  ${this.gameState.score2}
                </div>
                <small class="text-white-50">${this.gameState.player2}</small>
              </div>
            </div>
          </div>

          <!-- Tournament Display -->
          ${
            this.tournament && this.tournament.tournamentCurren_round
              ? `
            <div class="mb-5 animate__animated animate__fadeIn">
              ${(() => {
                // Configuration des messages selon le résultat
                let message = "";
                let badgeClass = "";
                let icon = "";

                if (this.winner === "You win!") {
                  badgeClass = "bg-warning text-dark";

                  if (this.tournament.tournamentCurren_round === "FN") {
                    message = "Bravo ! Vous êtes le champion !";
                    icon = "trophy";
                  } else if (this.tournament.tournamentCurren_round === "HF") {
                    message = "Bravo ! Vous êtes en finale !";
                    icon = "medal";
                  } else if (this.tournament.tournamentCurren_round === "QU") {
                    message = "Bravo ! Vous êtes en demi-finale !";
                    icon = "award";
                  }
                } else {
                  message = "Vous avez perdu ! Vous êtes éliminé !";
                  icon = "dizzy";
                  badgeClass = "bg-danger";
                }

                return `
                  <div class="card bg-dark border-info shadow-lg mb-4">
                    <div class="card-header bg-gradient p-3 ${badgeClass}">
                      <h2 class="card-title mb-0" style="font-family: 'Orbitron', sans-serif;">
                        <i class="fas fa-${icon} me-2"></i>
                        ${message}
                      </h2>
                    </div>
                    
                    <div class="card-body p-3">
                      <h4 class="text-info mb-0" style="font-family: 'Orbitron', sans-serif;">
                        <span class="badge bg-primary me-2">
                          <i class="fas fa-trophy me-1"></i>
                          TOURNOI : ${this.tournament.name}
                        </span>
                        <span class="badge bg-info">
                          <i class="fas fa-gamepad me-1"></i>
                          MATCH : ${this.displayTournamentRound(
                            this.tournament.tournamentCurren_round
                          )}
                        </span>
                      </h4>
                    </div>
                  </div>
                `;
              })()}
            </div>
          `
              : ""
          }
          ${
            this.local
              ? ``
              : `
          <!-- Winner Message -->
          <div class="mb-5 animate__animated animate__fadeInUp">
            <h2 class="badge bg-info bg-gradient fs-3 p-3" style="font-family: 'Orbitron', sans-serif;">
              ${this.winner}
            </h2>
          </div>
          `
          }
          <!-- Return Button -->
          <button class="btn btn-outline-info btn-lg px-5 animate__animated animate__fadeIn" id="btnLeaveGame">
            <i class="fas fa-home me-2"></i>
            Return to Menu
          </button>
        </div>
      </div>
    </div>
    `;
  }
}

export default GameOverComponent;
