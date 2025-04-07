import Component from "../../utils/Component.js";
import WebSocketAPI from "../../services/websocket.js";
import pong42 from "../../services/pong42.js";
import GameComponent from "../Game/GameComponent.js";
import { ENV } from "../../env.js";
import {
  initializeGameWebSocket,
  cleanupGameWebSocket,
} from "../../utils/gameWebSocketHandlers.js";

class DuelModeGuest extends Component {
  constructor(matchId) {
    super();
    this.state = {
      matchId: matchId,
      loading: false,
      error: null,
      waitingGuest: true,
      isConnected: false,
      startingGame: false,
      player1: null,
      player2: null,
    };
    this.webSocketMatch = null;
  }
  async joinMatch() {
    console.log("[DEBUG] Welcome to the match", this.state.matchId);
    if (this.state.isConnected) return;
    if (pong42.matchInOtherTab) {
      this.setState({
        error: "Une partie est déjà en cours dans un autre onglet",
        loading: false,
      });
      return;
    }
    this.setState({ loading: true, isConnected: true });

    // Use the utility to create and set up the WebSocket
    this.webSocketMatch = initializeGameWebSocket(this, this.state.matchId, {
      waitingGuest: true,
    });
    pong42.notifyMatchJoined(this.state.matchId);
  }
  destroy() {
    cleanupGameWebSocket(this, this.webSocketMatch);
    super.destroy();
  }
  afterRender() {
    if (
      this.state.matchId &&
      !this.state.isConnected &&
      !this.state.error &&
      !this.state.startingGame
    )
      this.joinMatch();
  }

  template() {
    if (this.state.error) {
      return `
            <div class="container mt-5">
                <div class="d-flex flex-column align-items-center justify-content-center">
                    <div id="alert-container" /div>
                    <h3 class="text-danger mb-4">Erreur</h3>
                    <p class="text-danger">${this.state.error}</p>
                    <button class="btn btn-primary mt-3" onclick="changePage('#home')">Retour à l'accueil</button>
                </div>
            </div>
            `;
    }
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
                </div>
            </div>
            `;
    }
    if (!this.state.waitingGuest) {
      return `
                <div class="container mt-5">
                    <div class="d-flex justify-content-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Votre Adversaire n'est pas encore la, merci de patienter !</span>
                        </div>
                    </div>
                </div>
            `;
    }
  }
}

export default DuelModeGuest;
