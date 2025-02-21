import Component from "../../utils/Component.js";
import WebSocketAPI from "../../services/websocket.js";
import pong42 from "../../services/pong42.js";
import GameComponent from "../Game/GameComponent.js";
import { changePage } from "../../utils/Page.js";
import { ENV } from "../../env.js";

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
    };
    this.webSocketMatch = null;
    this.wsurlgame = `${ENV.WS_URL_GAME}`;
  }

  async joinMatch() {
    console.log("[DEBUG] Welcome to the match", this.state.matchId);
    if (this.state.isConnected) return;
    this.setState({ loading: true, isConnected: true });
    this.webSocketMatch = new WebSocketAPI(
      this.wsurlgame + this.state.matchId + "/"
    );
    console.log("[DEBUG] after websocket creation");
    // Gestion des erreurs de connexion
    this.webSocketMatch.addMessageListener("open", () => {
      console.log("[DEBUG] Connexion établie avec succès");
      pong42.player.match_id = this.state.matchId;
      pong42.player.paddle = "right";
      pong42.player.socketMatch = this.webSocketMatch;
      this.setState({ loading: true, isConnected: true });
    });

    this.webSocketMatch.addMessageListener("close", () => {
      this.setState({
        error: "La connexion au match a été perdue",
        loading: false,
        waitingGuest: false,
        isConnected: false,
      });
    });

    this.webSocketMatch.addMessageListener("message", (data) => {
      try {
        const message = JSON.parse(data);
        console.log("[DEBUG] Message reçu:", message); // Ajout de log

        if (message.error) {
          console.error("[DEBUG] Error message:", message.error);
          this.setState({
            error: message.error,
            loading: false,
            isConnected: false,
          });
          return;
        }

        // Si on reçoit un message de type error dans le payload
        if (
          message.message &&
          typeof message.message === "string" &&
          message.message.includes("error")
        ) {
          console.error("[DEBUG] Message error:", message.message);
          this.setState({
            error: message.message,
            loading: false,
            isConnected: false,
          });
          return;
        }

        if (message.type === "game_start") {
          console.error("[DEBUG] game_start:", message.message);
          this.setState({
            loading: false,
            startingGame: true,
            isConnected: true,
            waitingGuest: false,
          });
          this.webSocketMatch.removeAllListeners();
          const game = new GameComponent();
          game.render(this.container);
        }
      } catch (error) {
        console.error(
          "[DEBUG] Error parsing message:",
          error,
          "Raw data:",
          data
        );
        this.setState({
          error: "Erreur lors du traitement des données du serveur",
          loading: false,
          isConnected: false,
        });
      }
    });
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
