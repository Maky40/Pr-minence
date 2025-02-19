import Component from "../../utils/Component.js";
import pong42 from "../../services/pong42.js";
import WebSocketAPI from "../../services/websocket.js";
import GameComponent from "../Game/GameComponent.js";

class DuelModeHost extends Component {
  constructor() {
    super();
    this.state = {
      matchId: null,
      paddle: null,
      loading: false,
      error: null,
      waitingGuest: false,
    };
  }
  async getMatchId() {
    const webSocketMatch = new WebSocketAPI("wss://localhost/pong/ws/pong/");
    webSocketMatch.addMessageListener("message", (data) => {
      const message = JSON.parse(data);
      if (message.type === "game_start") {
        const game = new GameComponent();
        game.render(this.container);
      }
      if (!this.state.matchId) {
        const { match_id, paddle } = message;
        pong42.player.match_id = match_id;
        pong42.player.paddle = paddle;
        pong42.player.socketMatch = webSocketMatch;
        this.setState({
          matchId: match_id,
          paddle: paddle,
          waitingGuest: true,
        });
      }
    });
  }

  afterRender() {
    if (!this.state.matchId) this.getMatchId();
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

export default DuelModeHost;
