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
    if (!pong42.isMasterTab()) {
      this.setState({
        error: "Une partie est déjà en cours dans un autre onglet",
        loading: false,
      });
      return;
    }

    console.log("[TOURNAMENT] Joining match:", this.state.matchId);
    this.hasJoinedMatch = true;
    this.isConnecting = true;

    // Use the utility to create and set up the WebSocket
    this.webSocketMatch = initializeGameWebSocket(this, this.state.matchId, {
      waitingGuest: true,
    });

    // Set global state for this player in the match
    pong42.player.match_id = this.state.matchId;
    pong42.notifyMatchJoined(this.state.matchId);
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
            <button class="btn btn-primary mt-3" onclick="changePage('#home')">Retour à l'accueil</button>
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
          <div class="card shadow-lg">
            <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center">
                <h3 class="mb-0">Début du Combat Imminent</h3>
              </div>
            </div>
            
            <div class="card-body py-4">
              <div class="d-flex flex-column align-items-center justify-content-center">
                <!-- Citation Kaamelott -->
                <div class="alert alert-light border mb-4 text-center">
                  <i class="fas fa-quote-left text-muted me-2"></i>
                  <span class="fst-italic">
                    On va pas installer notre carré de légion ici, si c'est pour se retrouver à 15 contre 2000, parce qu'il faut reconnaître qu'il y a un léger déficit numérique.  
                  </span>
                  <i class="fas fa-quote-right text-muted ms-2"></i>
                  <div class="text-end text-muted mt-1">— Caius Camillus</div>
                </div>
                
                <!-- Message de préparation -->
                <h2 class="display-4 text-success mb-4 text-center fw-bold">
                  En garde, chevalier !
                </h2>
                
                <!-- Compte à rebours ou indicateur visuel -->
                <div class="position-relative my-3">
                  <div class="progress" style="height: 30px; width: 300px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" style="width: 75%"></div>
                  </div>
                </div>
                
                <div class="text-center mt-4">
                  <p class="h4 text-primary mb-3">
                    Préparez votre épée et votre bouclier
                  </p>
                  
                  <div class="alert alert-success mt-3">
                    <p class="mb-1"><i class="fas fa-bullhorn me-2"></i> <b>Le Roi Arthur déclare:</b></p>
                    <p class="mb-0">
                      "Bon, maintenant qu'on a fait les préliminaires, on va peut-être pouvoir commencer à la tarter!"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Main waiting screen
    return `
    <div class="container mt-5">
      <div class="card shadow-lg">
        <div class="card-header bg-info text-white d-flex justify-content-between align-items-center text-center">
          <div class="d-flex align-items-center ">
            <h3 class="mb-0  ">En Attente du Combat</h3>
          </div>
        </div>
        
        <div class="card-body py-4">
          <div class="d-flex flex-column align-items-center justify-content-center">
            <!-- Citation Kaamelott -->
            <div class="alert alert-light border mb-4 text-center">
              <i class="fas fa-quote-left text-muted me-2"></i>
              <span class="fst-italic">
                C'est pas faux! Mais là on attend quand même depuis un moment...
              </span>
              <i class="fas fa-quote-right text-muted ms-2"></i>
              <div class="text-end text-muted mt-1">— Perceval de Galles</div>
            </div>
            
            <!-- Spinner et message -->
            <h4 class="text-info mb-4">
              <i class="fas fa-goblet-sparkles me-2"></i>
              En attente d'un adversaire digne de ce nom
            </h4>
            
            <div class="spinner-border text-info" style="width: 4rem; height: 4rem;" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            
            <div class="text-center mt-4">
              <p class="text-info">
                Votre adversaire est probablement en train de finir sa pinte d'hydromel
              </p>
              
              <div class="alert alert-dark mt-3">
                <p class="mb-1"><i class="fas fa-scroll me-2"></i> <b>Message du Roi Arthur:</b></p>
                <small>
                  "Le match démarrera automatiquement dès que ce bon à rien sera connecté... 
                  C'est pas possible d'être à la bourre comme ça!"
                </small>
              </div>
            </div>
          </div>
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
