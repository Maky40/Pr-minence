import Component from "../../utils/Component.js";
import pong42 from "../../services/pong42.js";
import WebSocketAPI from "../../services/websocket.js";
import GameComponent from "../Game/GameComponent.js";
import { ENV } from "../../env.js";
import { changePage } from "../../utils/Page.js";
import {
  initializeGameWebSocket,
  cleanupGameWebSocket,
} from "../../utils/gameWebSocketHandlers.js";

class DuelModeHost extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      error: null,
      waitingGuest: false,
      matchId: null,
      isConnected: false,
      startingGame: false,
    };
    this.webSocketMatch = null;
    this.canceledMatch = false;
  }

  async getMatchId() {
    if (!pong42.isMasterTab()) {
      this.setState({
        error: "Une partie est déjà en cours dans un autre onglet",
        loading: false,
      });
      return;
    }
    if (this.canceledMatch) return;
    console.log("[DUEL] Host initializing connection");

    // Use the utility with empty matchId and isHost flag
    this.webSocketMatch = initializeGameWebSocket(this, "", {
      isHost: true,
      waitingGuest: true,
    });

    // Set player as host (left paddle)
    pong42.player.paddle = "left";
    pong42.player.waitingMatch = true;
    pong42.notifyMatchJoined(this.state.matchId);
  }

  async cancelMatch() {
    this.canceledMatch = true;
    const response = await pong42.player.cancelMatch();

    if (response) {
      // Clean up WebSocket
      cleanupGameWebSocket(this, this.webSocketMatch);

      this.setState({
        matchId: null,
        paddle: null,
        loading: false,
        error: null,
        waitingGuest: false,
        isConnected: false,
      });

      changePage("game");
      this.destroy();
    } else {
      console.error("[DUEL] Failed to cancel match");
    }
  }

  destroy() {
    // Use the utility to clean up WebSocket and state
    cleanupGameWebSocket(this, this.webSocketMatch);
    super.destroy();
  }

  afterRender() {
    if (
      !this.state.matchId &&
      this.state.loading &&
      !this.state.error &&
      !this.canceledMatch
    ) {
      this.getMatchId();
    }
  }

  // Template methods remain the same

  attachEventListeners() {
    // Cancel button
    const cancelBtn = document.getElementById("cancel-match-hoster");
    if (cancelBtn) {
      this.attachEvent(cancelBtn, "click", async (e) => {
        e.preventDefault();
        await this.cancelMatch();
      });
    }

    // Retry button
    const retryBtn = document.getElementById("retryBtn");
    if (retryBtn) {
      this.attachEvent(retryBtn, "click", () => {
        this.setState({
          error: null,
          loading: true,
        });
        this.getMatchId();
      });
    }
  }

  template() {
    if (!this.state.matchId) {
      return `
        <div class="container mt-5">
          <div class="card shadow-lg">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center">
                <i class="fas fa-scroll me-2"></i>
                <h3 class="mb-0">Préparation du Champ de Bataille</h3>
              </div>
            </div>
            
            <div class="card-body py-4">
              <div class="d-flex flex-column align-items-center justify-content-center">
                <!-- Citation Kaamelott -->
                <div class="alert alert-light border mb-4 text-center">
                  <i class="fas fa-quote-left text-muted me-2"></i>
                  <span class="fst-italic">
                    "Le Graal, c'est pas compliqué, en fait! C'est rechercher à être meilleur! Si on se met ça dans le crâne, on peut faire vraiment de grandes choses!"
                  </span>
                  <i class="fas fa-quote-right text-muted ms-2"></i>
                  <div class="text-end text-muted mt-1">— Perceval de Galles</div>
                </div>
                
                <!-- Spinner avec animation -->
                <div class="spinner-border text-primary" style="width: 4rem; height: 4rem;" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                
                <div class="text-center mt-4">
                  <h5 class="text-primary mb-3">
                    <i class="fas fa-hammer me-2"></i>Le forgeron prépare vos armes...
                  </h5>
                  <div class="progress" style="width: 300px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                         role="progressbar"
                         style="width: 100%">
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="card-footer text-center text-muted">
              <small>
                <i class="fas fa-chess-rook me-1"></i>
                "Les rois, on les reconnaît à ce qu'ils sont capables de régner sur une table de ping-pong!"
              </small>
            </div>
          </div>
        </div>
      `;
    }

    if (this.state.waitingGuest) {
      return `
        <div class="container mt-5">
          <div class="card shadow-lg">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center">
                  <h3 class="mb-0">En Attente d'un Adversaire</h3>
              </div>
              <span class="badge bg-warning text-dark px-3 py-2">
                <i class="fas fa-crown me-1"></i> Vous êtes l'hôte
              </span>
            </div>
            
            <div class="card-body py-4">
              <div class="d-flex flex-column align-items-center justify-content-center">
                
                <!-- Spinner et message -->
                <div class="spinner-grow text-primary" style="width: 3rem; height: 3rem;" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                
                <div class="text-center mt-4">
                  <p class="text-primary">
                    <i class="fas fa-beer me-2"></i>
                    Votre adversaire est probablement à la taverne, il arrive...
                  </p>
                  <div class="alert alert-info mt-3 border shadow-sm bg-light">
                    <p class="mb-1">
                      <i class="fas fa-key me-2"></i>
                      <b>Code du match:</b>
                    </p>
                    <h3 class="mb-0 font-monospace">${this.state.matchId}</h3>
                    <small class="text-muted">Partagez ce code avec votre adversaire</small>
                  </div>
                  
                  <p class="text-primary mt-3">
                    <i class="fas fa-magic me-2"></i>
                    Le match démarrera automatiquement dès que Merlin aura réussi son sort d'invocation
                  </p>
                </div>
                
                <!-- Bouton d'annulation -->
                <div class="text-center mt-4">
                  <button class="btn btn-outline-danger px-4 py-2" id="cancel-match-hoster">
                    <i class="fas fa-times-circle me-2"></i>
                    Annuler la joute
                  </button>
                </div>
              </div>
            </div>
            
            <div class="card-footer text-center text-muted">
              <small>
                <i class="fas fa-dragon me-1"></i>
                En garde, espèce de vieille pute dégarnie !
              </small>
            </div>
          </div>
        </div>
      `;
    }
  }
}

export default DuelModeHost;
