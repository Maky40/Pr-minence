import Component from "../../utils/Component.js";
import WebSocketAPI from "../../services/websocket.js";
import pong42 from "../../services/pong42.js";
import GameRenderer from "./GameRenderer.js";

class GameComponent extends Component {
  constructor() {
    super();
    this.ws = null;
    this.renderer = null;
    this.gameConfig = {
      WIDTH: 800,
      HEIGHT: 600,
      PADDLE_WIDTH: 10,
      PADDLE_HEIGHT: 100,
      BALL_SIZE: 15,
      PADDLE_SPEED: 5,
    };
    this.gameState = {
      score1: 0,
      score2: 0,
      keys: { w: false, s: false, ArrowUp: false, ArrowDown: false },
      ballSpeedX: 4,
      ballSpeedY: 4,
    };
    this.gameObjects = null;
    this.moveManager = null;
  }

  initializeGameObjects() {
    const { WIDTH, HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_SIZE } =
      this.gameConfig;

    this.gameObjects = {
      paddle1: {
        x: 10,
        y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
      },
      paddle2: {
        x: WIDTH - PADDLE_WIDTH - 10,
        y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
      },
      ball: {
        x: WIDTH / 2 - BALL_SIZE / 2,
        y: HEIGHT / 2 - BALL_SIZE / 2,
        size: BALL_SIZE,
      },
    };
  }

  setupWebSocket() {
    // Use the existing socket connection from pong42.player
    const webSocket = pong42.player.socketMatch;

    webSocket.addMessageListener("open", () => {
      console.log("Connexion WebSocket ouverte");
    });

    webSocket.addMessageListener("message", (data) => {
      const message = JSON.parse(data);

      switch (message.type) {
        case "match_start":
          console.log("Match prêt ! Début du jeu.");
          break;
        case "move":
          if (message.player === "left") {
            this.gameObjects.paddle1.y = message.position;
          }
          if (message.player === "right") {
            this.gameObjects.paddle2.y = message.position;
          }
          break;
        case "score":
          this.gameState.score1 = message.score1;
          this.gameState.score2 = message.score2;
          break;
        case "ball":
          this.gameObjects.ball.x = message.x;
          this.gameObjects.ball.y = message.y;
          break;
      }
    });

    webSocket.addMessageListener("close", () => {
      console.log("Connexion WebSocket fermée");
    });

    // Store the WebSocket reference
    this.ws = webSocket;
  }

  sendMove(player, position) {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: "move", player, position }));
    }
  }

  sendBallPosition(x, y) {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: "ball", x, y }));
    }
  }

  sendScore(score1, score2) {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: "score", score1, score2 }));
    }
  }

  setupEventListeners() {
    document.addEventListener("keydown", (event) => {
      if (event.key in this.gameState.keys)
        this.gameState.keys[event.key] = true;
    });

    document.addEventListener("keyup", (event) => {
      if (event.key in this.gameState.keys)
        this.gameState.keys[event.key] = false;
    });
  }
  init() {
    if (!pong42.player.match_id) {
      changePage("home");
    }
    if (!pong42.player.socketMatch) {
      changePage("home");
    }
    const canvas = document.getElementById("gameCanvas");
    this.renderer = new GameRenderer(canvas, this.gameConfig);
    this.moveManager = new GameMove(this.gameConfig);
    this.setupWebSocket();
    this.initializeGameObjects();
    this.setupEventListeners();
    this.gameLoop();
  }

  gameLoop = () => {
    this.moveManager.movePaddles(this.gameObjects, this.gameState);
    this.moveManager.moveBall(this.gameObjects, this.gameState);
    this.renderer.draw(this.gameObjects, this.gameState);
    requestAnimationFrame(this.gameLoop);
  };

  template() {
    return `
        <section id="game" class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-8 text-center">
                    <canvas id="gameCanvas" width="${this.gameConfig.WIDTH}" height="${this.gameConfig.HEIGHT}"></canvas>
                    <h1 class="mt-4">Le Jeu</h1>
                </div>
            </div>
        </section>
    `;
  }
}

export default GameComponent;
