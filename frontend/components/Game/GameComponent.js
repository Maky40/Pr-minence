import Component from "../../utils/Component.js";
import { GameMovement } from "./GameMovement.js";
import { GAME_CONFIG } from "./gameConfig.js";
import pong42 from "../../services/pong42.js";
import GameRenderer from "./GameRenderer.js";
class GameComponent extends Component {
  constructor() {
    super();
    this.gameConfig = GAME_CONFIG;
    this.gameState = {
      keys: {
        w: false,
        s: false,
        ArrowUp: false,
        ArrowDown: false,
      },
      score1: 0,
      score2: 0,
    };

    this.gameObjects = this.initializeGameObjects();
    this.webSocket = pong42.player.socketMatch;
    this.movement = new GameMovement(this.gameObjects, this.gameConfig);
    this.renderer = null;
    this.animationFrameId = null;
    this.countdownAudio = new Audio("/assets/start.mp3");
    this.isGameStarted = false;
    this.state = {
      countdown: 3,
      isGameStarted: false,
    };
  }

  startCountdown() {
    let count = 3;
    const countInterval = setInterval(() => {
      count--;
      if (count >= 0 && !this.state.isGameStarted) {
        this.state.countdown = count;
        this.countdownAudio.play();
        this.update(); // Use update instead of setState
      }

      if (count <= 0 && !this.state.isGameStarted) {
        clearInterval(countInterval);
        this.state.isGameStarted = true;
        this.update(); // Use update instead of setState
        this.gameLoop();
      }
    }, 1000);
  }

  initializeGameObjects() {
    const { WIDTH, HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_SIZE } =
      this.gameConfig;

    return {
      paddle1: {
        x: 50,
        y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
      },
      paddle2: {
        x: WIDTH - 50 - PADDLE_WIDTH,
        y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
      },
      ball: {
        x: WIDTH / 2,
        y: HEIGHT / 2,
        size: BALL_SIZE,
        speedX: this.gameConfig.BALL_SPEED,
        speedY: this.gameConfig.BALL_SPEED,
      },
      score1: 0,
      score2: 0,
    };
  }

  setupWebSocket() {
    if (!this.webSocket) {
      console.error("WebSocket not initialized");
      return;
    }

    this.webSocket.addMessageListener("message", (data) => {
      try {
        const message = JSON.parse(data);
        switch (message.type) {
          case "move":
            this.handleMove(message);
            break;
          case "ball":
            this.handleBall(message);
            break;
          case "score":
            this.handleScore(message);
            break;
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });
  }

  handleMove(message) {
    const paddle =
      message.player === "left"
        ? this.gameObjects.paddle1
        : this.gameObjects.paddle2;
    paddle.y = message.position;
  }

  handleBall(message) {
    this.gameObjects.ball.x = message.x;
    this.gameObjects.ball.y = message.y;
  }

  handleScore(message) {
    this.gameState.score1 = message.score1;
    this.gameState.score2 = message.score2;
  }

  setupEventListeners() {
    document.addEventListener("keydown", (event) => {
      if (event.key in this.gameState.keys) {
        event.preventDefault();
        this.gameState.keys[event.key] = true;
      }
    });

    document.addEventListener("keyup", (event) => {
      if (event.key in this.gameState.keys) {
        event.preventDefault();
        this.gameState.keys[event.key] = false;
      }
    });
  }

  gameLoop = () => {
    this.movement.updatePaddlePosition(
      this.gameState.keys,
      pong42.player.paddle,
      (position) => this.webSocket.send({ type: "move", position })
    );

    this.movement.updateBallPosition(
      pong42.player.paddle === "left",
      (ballData) => this.webSocket.send(ballData),
      (scoreData) => this.webSocket.send(scoreData)
    );

    this.renderer.draw(this.gameObjects, this.gameState);
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  init() {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) {
      console.error("Canvas element not found");
      return;
    }
    this.renderer = new GameRenderer(canvas, this.gameConfig);
    this.setupWebSocket();
    this.setupEventListeners();
    this.startCountdown();
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
  }

  template() {
    if (!this.isGameStarted) {
      return `
        <div class="game-container">
          <div class="countdown-overlay">
            <div class="countdown">${this.state.countdown}</div>
          </div>
          <canvas id="gameCanvas" width="${this.gameConfig.WIDTH}" height="${this.gameConfig.HEIGHT}"></canvas>
        </div>
      `;
    }

    return `
      <div class="game-container">
        <canvas id="gameCanvas" width="${this.gameConfig.WIDTH}" height="${this.gameConfig.HEIGHT}"></canvas>
      </div>
    `;
  }

  afterRender() {
    this.init();
  }
}

export default GameComponent;
