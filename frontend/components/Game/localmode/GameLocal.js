import Component from "../../../utils/Component.js";
import {
  initializeGameWebSocket,
  cleanupGameWebSocket,
} from "../../../utils/gameWebSocketHandlers.js";
import pong42 from "../../../services/pong42.js";

class GameLocal extends Component {
  constructor() {
    console.log("[DEBUG] GameLocal constructor called");
    super();
    this.initialized = false;
    this.webSocketMatch = null;
  }

  init() {
    if (this.initialized) return;
    console.log("[DEBUG] GameLocal init called");
    this.webSocketMatch = initializeGameWebSocket(this, pong42.player.id, {
      local: true,
    });
    this.initialized = true;
  }

  destroy() {
    cleanupGameWebSocket(this.webSocketMatch);
    this.webSocketMatch = null;
    this.initialized = false;
    pong42.player.local = false;
  }
}

export default GameLocal;
