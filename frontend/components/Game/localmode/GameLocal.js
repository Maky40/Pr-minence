import Component from "../../../utils/Component.js";
import {
  initializeGameWebSocket,
  cleanupGameWebSocket,
} from "../../../utils/gameWebSocketHandlers.js";
import pong42 from "../../../services/pong42.js";

class GameLocal extends Component {
  constructor() {
    super();
    this.init = false;
  }

  init() {
    if (!this.init) return;
    this.webSocketMatch = initializeGameWebSocket(this, pong42.player.id, {
      local: true,
    });
    this.init = true;
  }
}

export default GameLocal;
