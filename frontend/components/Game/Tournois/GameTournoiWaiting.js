import Component from "../../../utils/Component.js";
import pong42 from "../../../services/pong42.js";
import WebSocketAPI from "../../../services/websocket.js";

import GameComponent from "../GameComponent.js";
import { ENV } from "../../../env.js";

class GameTournoiWaiting extends Component {
  constructor(matchId, paddle) {
    super();
    this.state = {
      matchId: matchId,
      paddle: paddle,
      loading: false,
      error: null,
      waitingGuest: false,
      isConnected: false,
      startingGame: false,
    };

    // Prevent multiple WebSocket connections
    this.isConnecting = false;

    // Bind methods to ensure correct context
    this.connectWs = this.connectWs.bind(this);
    this.joinMatch = this.joinMatch.bind(this);

    pong42.player.socketMatch = null;
    this.wsurlgame = `${ENV.WS_URL_GAME}`;
  }

  connectWs() {
    // Prevent multiple connection attempts
    if (this.isConnecting || this.state.isConnected) return;
    console.log("[DEBUG] Connecting to WebSocket match", this.state.matchId);
    this.isConnecting = true;

    this.webSocketMatch = new WebSocketAPI(
      this.wsurlgame + this.state.matchId + "/"
    );
    pong42.player.socketMatch = this.webSocketMatch;
  }

  async joinMatch() {
    // Prevent multiple join attempts
    if (this.state.waitingGuest || pong42.player.socketMatch) return;

    console.log("[DEBUG] Welcome to the match", this.state.matchId);

    this.connectWs();

    // Timeout to prevent indefinite waiting
    const connectionTimeout = setTimeout(() => {
      if (!this.state.isConnected) {
        console.error("[DEBUG] Connection timeout");
        this.setState({
          error: "Délai de connexion dépassé",
          loading: false,
          waitingGuest: false,
          isConnected: false,
        });
        this.cleanupWebSocket();
      }
    }, 10000); // 10 seconds timeout

    this.webSocketMatch.addMessageListener("open", () => {
      clearTimeout(connectionTimeout);
      this.setState({
        loading: true,
        isConnected: true,
        waitingGuest: true,
        isConnecting: false,
      });
    });

    this.webSocketMatch.addMessageListener("close", () => {
      clearTimeout(connectionTimeout);
      console.error("[DEBUG] Connexion au match perdue");
      this.setState({
        error: "La connexion au match a été perdue",
        loading: false,
        waitingGuest: false,
        isConnected: false,
        isConnecting: false,
      });
      this.cleanupWebSocket();
    });

    this.webSocketMatch.addMessageListener("message", (data) => {
      try {
        const message = JSON.parse(data);

        if (message.error) {
          console.error("[DEBUG] Error message:", message.error);
          this.setState({
            error: message.error,
            loading: false,
            isConnected: false,
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
          console.log("[DEBUG] game_start:", message.message);
          this.cleanupWebSocket();

          this.setState({
            loading: false,
            startingGame: true,
            isConnected: true,
            waitingGuest: false,
          });

          const game = new GameComponent();
          game.render(this.container);
          this.destroy();
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
          isConnected: false,
        });
      }
    });
  }

  // New method to centralize WebSocket cleanup
  cleanupWebSocket() {
    if (this.webSocketMatch) {
      this.webSocketMatch.removeAllListeners();
      this.webSocketMatch = null;
    }
    this.isConnecting = false;
    pong42.player.socketMatch = null;
  }

  render(renderContainer) {
    console.log("[DEBUG] GameTournoiWaiting render called");

    // Prevent multiple render attempts starting the match
    if (!this.state.waitingGuest && !this.isConnecting) {
      this.container = renderContainer;
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
