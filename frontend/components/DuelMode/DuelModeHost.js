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
                <div class="d-flex flex-column align-items-center justify-content-center">
                    <h3 class="text-primary mb-4">Initialisation du match</h3>
                    <div class="spinner-border text-primary" style="width: 4rem; height: 4rem;" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="text-center mt-4">
                        <p class="text-muted">Préparation de l'arène...</p>
                        <div class="progress" style="width: 200px;">
                            <div class="progress-bar progress-bar-striped progress-bar-animated"
                                 role="progressbar"
                                 style="width: 100%">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
                `;
    }
    if (this.state.waitingGuest) {
      return `
            <div class="container mt-5">
                <div class="d-flex flex-column align-items-center justify-content-center">
                    <h3 class="text-primary mb-4">En attente d'un adversaire...</h3>
                    <div class="spinner-border text-primary" style="width: 4rem; height: 4rem;" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="text-center mt-4">
                        <p class="text-primary">Votre adversaire n'est pas encore là, merci de patienter</p>
                        <h3 class="text-primary">Code du match: ${this.state.matchId}</h3>
                        <small class="text-primary">Le match démarrera automatiquement dès qu'il sera connecté</small>
                      </div>
                    <div class="text-center mt-4">
                        <button class="btn btn-outline-danger" id="cancel-match-hoster">Annuler le match</button>
                    </div>
                </div>
            </div>
            `;
    }
  }
}

export default DuelModeHost;
