import Component from "../../utils/Component.js";
import WebSocketAPI from "../../services/websocket.js";
import pong42 from "../../services/pong42.js";
import GameComponent from "../Game/GameComponent.js";

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
  }

  async joinMatch() {
    if (this.state.isConnected) return;
    this.setState({ loading: true, isConnected: true });
    this.webSocketMatch = new WebSocketAPI(
      "wss://localhost/pong/ws/pong/" + this.state.matchId + "/"
    );

    // Gestion des erreurs de connexion
    this.webSocketMatch.addMessageListener("open", () => {
      pong42.player.match_id = this.state.matchId;
      pong42.player.paddle = "right";
      pong42.player.socketMatch = this.webSocketMatch;
      this.setState({ loading: true, isConnected: true });
    });

    this.webSocketMatch.addMessageListener("error", () => {
      this.setState({
        error: "Une erreur de connexion est survenue",
        loading: false,
        isConnected: false,
      });
      setTimeout(() => {
        window.location.href = "#game";
      }, 2000); // Rediriger après 2 secondes
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
        if (message.type === "game_start") {
          this.setState({
            loading: false,
            startingGame: true,
            isConnected: true,
            waitingGuest: false,
          });
          //on remove tout les listeners
          this.webSocketMatch.removeAllListeners();
          const game = new GameComponent();
          game.render(this.container);
        }
        if (message.error) {
          console.error("Error message:", message.error);
          this.setState({
            error: message.error,
            loading: false,
          });
          return;
        }
      } catch (error) {
        console.error("Error parsing message:", error);
        this.setState({
          error: "Erreur lors du traitement des données",
          loading: false,
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
    if (this.state.error && !this.state.waitingGuest) {
      return `
            <div class="container mt-5">
                <div class="d-flex flex-column align-items-center justify-content-center">
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
