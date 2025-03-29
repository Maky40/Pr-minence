import Component from "../../../utils/Component.js";
import pong42 from "../../../services/pong42.js";
import WebSocketAPI from "../../../services/websocket.js";
import GameComponent from "../GameComponent.js";
import { ENV } from "../../../env.js";

class GameTournoiWaiting extends Component {
  constructor(matchId, paddle) {
    console.log("[DEBUG] GameTournoiWaiting constructor called");
    super();
    this.state = {
      matchId: matchId,
      paddle: paddle,
      loading: false,
      error: null,
      waitingGuest: false,
      startingGame: false,
    };
    this.gameTournoiWaitingId = this.generateUniqueId();

    this.isConnecting = false;
    this.hasJoinedMatch = false; 
    this.connectWs = this.connectWs.bind(this);
    this.joinMatch = this.joinMatch.bind(this);

    pong42.player.socketMatch = null;
    this.wsurlgame = `${ENV.WS_URL_GAME}`;
  }
  generateUniqueId() {
    return "gtw_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  }
  connectWs() {
    if (this.isConnecting) return;
    console.log("[DEBUG] Connecting to WebSocket match", this.state.matchId);
    this.isConnecting = true;

    this.webSocketMatch = new WebSocketAPI(
      this.wsurlgame + this.state.matchId + "/"
    );
    pong42.player.socketMatch = this.webSocketMatch;
  }

  async joinMatch() {
    // Prevent multiple join attempts
    if (this.isConnecting || this.hasJoinedMatch) return;
    this.hasJoinedMatch = true; // Marquer que la connexion a été tentée
    console.log("[DEBUG] Welcome to the match", this.state.matchId);

    this.connectWs();
    this.webSocketMatch.addMessageListener("open", () => {
      this.setState({
        loading: true,
        waitingGuest: true,
      });
    });

    this.webSocketMatch.addMessageListener("message", (data) => {
      try {
        const message = JSON.parse(data);

        if (message.error) {
          console.error("[DEBUG] Error message:", message.error);
          this.setState({
            error: message.error,
            loading: false,
          });
          this.cleanupWebSocket();
          return;
        }

        if (message.message === "Connexion WebSocket établie") {
          this.paddle = message.paddle;
          this.matchId = message.match_id;
          pong42.player.paddle = this.paddle;
          pong42.player.match_id = this.matchId;
          return;
        }

        if (message.type === "game_start") {
          this.cleanupWebSocket();
          this.setState({
            loading: false,
            startingGame: true,
          });
          pong42.player.waitingMatch = false;
          pong42.player.waitingMatchID = 0;
          const game = new GameComponent();
          game.render(this.container);
          this.cleanupWebSocket();
        }
      } catch (error) {
        console.error(
          "[DEBUG] Error parsing message:",
          error,
          "Raw data:",
          data
        );
        this.cleanupWebSocket();
        this.setState({
          error: "Erreur lors du traitement des données du serveur",
          loading: false,
        });
      }
    });
  }
  
  destroy()
  {
    this.cleanupWebSocket();
    super.destroy();
  }

  cleanupWebSocket() {
    if (this.webSocketMatch) {
      this.webSocketMatch.removeAllListeners();
      this.webSocketMatch = null;
    }
    this.isConnecting = false;
    this.hasJoinedMatch = false; // Réinitialiser l'état de la connexion
    pong42.player.socketMatch = null;
  }

  afterRender() {
    super.afterRender();
    if (!this.isConnecting && !this.hasJoinedMatch) {
      this.joinMatch();
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
}

export default GameTournoiWaiting;
