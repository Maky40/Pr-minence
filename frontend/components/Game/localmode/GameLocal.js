import Component from "../../../utils/Component.js";
import {
  initializeGameWebSocket,
  cleanupGameWebSocket,
} from "../../../utils/gameWebSocketHandlers.js";
import pong42 from "../../../services/pong42.js";

class GameLocal extends Component {
  constructor() {
    super();
    this.webSocketMatch = initializeGameWebSocket(this, pong42.player.id, {
      local: true,
    });
    console.log("[GAME] GameLocal constructor");
  }
}

export default GameLocal;
