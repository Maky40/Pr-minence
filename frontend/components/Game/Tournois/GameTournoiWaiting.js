import Component from "../../../utils/Component.js";
import pong42 from "../../../services/pong42.js";
import {
  initializeGameWebSocket,
  cleanupGameWebSocket,
} from "../../../utils/gameWebSocketHandlers.js";

class GameTournoiWaiting extends Component {
  constructor(matchId) {
    console.log("[TOURNAMENT] GameTournoiWaiting constructor called");
    super();
    this.state = {
      matchId: matchId,
      loading: false,
      error: null,
      waitingGuest: false,
      startingGame: false,
      isConnected: false,
    };

    // Store component ID for debugging
    this.gameTournoiWaitingId = this.generateUniqueId();

    // Connection state flags
    this.isConnecting = false;
    this.hasJoinedMatch = false;

    // WebSocket reference
    this.webSocketMatch = null;
  }

  generateUniqueId() {
    return "gtw_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  }

  joinMatch() {
    // Prevent multiple join attempts
    if (this.isConnecting || this.hasJoinedMatch) return;

    console.log("[TOURNAMENT] Joining match:", this.state.matchId);
    this.hasJoinedMatch = true;
    this.isConnecting = true;

    // Use the utility to create and set up the WebSocket
    this.webSocketMatch = initializeGameWebSocket(this, this.state.matchId, {
      waitingGuest: true,
    });

    // Set global state for this player in the match
    pong42.player.match_id = this.state.matchId;
  }

  destroy() {
    // Use the utility to clean up WebSocket and state
    cleanupGameWebSocket(this, this.webSocketMatch);
    super.destroy();
  }

  afterRender() {
    super.afterRender();

    // Initialize connection if not already done
    if (!this.isConnecting && !this.hasJoinedMatch) {
      this.joinMatch();
    }
  }

  template() {
    // Show error message if there's an error
    if (this.state.error) {
      return `
        <div class="container mt-5">
          <div class="alert alert-danger">
            <h4>Erreur</h4>
            <p>${this.state.error}</p>
            <button class="btn btn-primary" id="retryBtn">Réessayer</button>
          </div>
        </div>
      `;
    }

    // Show loading screen if match ID is not yet available
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
    if (this.state.startingGame) {
      return `
        <div class="container mt-5">
          <div class="d-flex flex-column align-items-center justify-content-center">
            <h3 class="text-success mb-4">Le match va commencer !</h3>
            <div class="text-center mt-4">
              <h1 class="display-1 text-primary fw-bold">
                Préparez-vous !
              </h1>
              <p class="text-muted mt-3">Synchronisation avec l'adversaire...</p>
            </div>
          </div>
        </div>
      `;
    }

    // Main waiting screen
    return `
      <div class="container mt-5">
        <div class="d-flex flex-column align-items-center justify-content-center">
          <h3 class="text-primary mb-4">En attente d'un adversaire...</h3>
          <div class="spinner-border text-primary" style="width: 4rem; height: 4rem;" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="text-center mt-4">
            <p class="text-primary">Votre adversaire n'est pas encore là, merci de patienter</p>
            <small class="text-primary">Le match démarrera automatiquement dès qu'il sera connecté</small>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const retryBtn = document.getElementById("retryBtn");
    if (retryBtn) {
      this.attachEvent(retryBtn, "click", () => {
        // Reset error state
        this.setState({
          error: null,
          loading: false,
        });

        // Try to join again
        this.isConnecting = false;
        this.hasJoinedMatch = false;
        this.joinMatch();
      });
    }
  }
}

export default GameTournoiWaiting;
