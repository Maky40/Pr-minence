import Component from "../../utils/Component.js";
import pong42 from "../../services/pong42.js";
import WebSocketAPI from "../../services/websocket.js";
import GameComponent from "../Game/GameComponent.js";
import { ENV } from "../../env.js";
import { changePage } from "../../utils/Page.js";

class DuelModeHost extends Component {
  constructor() {
    super();
    this.canceledMatch = false;
    this.state = {
      matchId: null,
      paddle: null,
      loading: false,
      error: null,
      waitingGuest: false,
    };
    this.wsurlgame = `${ENV.WS_URL_GAME}`;
  }
  async getMatchId() {
    if (this.canceledMatch) return;
    const webSocketMatch = new WebSocketAPI(this.wsurlgame);
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
        this.canceledMatch = false;
        this.setState({
          matchId: match_id,
          paddle: paddle,
          waitingGuest: true,
          loading: false,
        });
      }
    });
  }

  async cancelMatch() {
    this.canceledMatch = true;

    const response = await pong42.player.cancelMatch();
    if (response) {
      this.setState({
        matchId: null,
        paddle: null,
        loading: false,
        error: null,
        waitingGuest: false,
      });
      this.destroy();
      changePage("game");
    } else {
      console.error("Failed to cancel match");
    }
  }

  afterRender() {
    if (!this.state.matchId) this.getMatchId();
    document
      .getElementById("cancel-match-hoster")
      ?.addEventListener("click", async (e) => {
        e.preventDefault();
        await this.cancelMatch();
      });
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
