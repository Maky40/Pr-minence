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

    // Initialiser state avant de configurer l'audio
    this.state = {
      countdown: 5,
      isGameStarted: false,
    };

    this.gameObjects = this.initializeGameObjects();
    this.webSocket = pong42.player.socketMatch;
    this.movement = new GameMovement(this.gameObjects, this.gameConfig);
    this.renderer = null;
    this.animationFrameId = null;

    this.countdownAudio = new Audio("/assets/start.mp3");
    this.themeAudio = new Audio("/assets/theme.mp3");
    this.isMuted = false;
    this.isCountdownStarted = false;
  }

  startCountdown() {
    if (!this.state.isGameStarted && !this.isCountdownStarted) {
      this.isCountdownStarted = true;
      this.countdownAudio.play();

      const updateCountdown = () => {
        const timeLeft = Math.ceil(
          this.countdownAudio.duration - this.countdownAudio.currentTime
        );
        if (timeLeft !== this.state.countdown) {
          this.state.countdown = timeLeft;
          this.update();
        }

        if (timeLeft <= 0) {
          this.state.isGameStarted = true;
          this.update();
          this.gameLoop();
          this.themeAudio.play();
          this.countdownAudio.removeEventListener(
            "timeupdate",
            updateCountdown
          );
        }
      };

      this.countdownAudio.addEventListener("timeupdate", updateCountdown);
    }
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

    const btnLeaveGame = document.getElementById("btnLeaveGame");
    if (btnLeaveGame) {
      btnLeaveGame.addEventListener("click", () => {
        window.location.href = "#game";
      });
    }

    const btnSilence = document.getElementById("btnSilence");
    if (btnSilence) {
      btnSilence.addEventListener("click", () => {
        this.isMuted = !this.isMuted;
        this.themeAudio.muted = this.isMuted;
        this.countdownAudio.muted = this.isMuted;

        // Mettre à jour l'icône
        btnSilence.innerHTML = this.isMuted
          ? '<i class="fas fa-volume-mute"></i>'
          : '<i class="fas fa-volume-up"></i>';

        console.log("Sound is now", this.isMuted ? "muted" : "unmuted");
      });
    }
  }

  gameLoop = () => {
    if (this.themeAudio) {
      this.themeAudio.muted = this.isMuted; // Appliquer l'état du son
    }
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

    // Stop audio when component is destroyed
    if (this.themeAudio) {
      this.themeAudio.pause();
      this.themeAudio.currentTime = 0;
    }
    if (this.countdownAudio) {
      this.countdownAudio.pause();
      this.countdownAudio.currentTime = 0;
    }
  }

  template() {
    if (!this.state.isGameStarted) {
      return `
        <div class="game-container position-relative">
          <div class="position-absolute w-100 h-100 d-flex justify-content-center align-items-center" id="gameOverlay"
               style="background: rgba(0, 0, 0, 0.85); z-index: 1000;">
            <div class="text-center">
              <h2 class="text-warning mb-4 display-4 fw-bold">GET READY!</h2>
              <div class="countdown-box border border-4 border-warning rounded-circle bg-dark 
                          d-flex justify-content-center align-items-center mx-auto"
                   style="width: 150px; height: 150px;">
                <span class="display-1 text-warning fw-bold" 
                      style="animation: bounce 0.5s infinite;">
                  ${this.state.countdown}
                </span>
              </div>
              <div class="mt-4">
                <p class="text-warning mb-2">Controls:</p>
                <div class="d-flex justify-content-center gap-4">
                  <div class="text-white">
                    <span class="badge bg-warning text-dark">W</span> Up
                  </div>
                  <div class="text-white">
                    <span class="badge bg-warning text-dark">S</span> Down
                  </div>
                </div>
              </div>
            </div>
          </div>
          <canvas id="gameCanvas" 
                  width="${this.gameConfig.WIDTH}" 
                  height="${this.gameConfig.HEIGHT}"
                  class="shadow-lg">
          </canvas>
        </div>
      `;
    }

    return `
      <div class="game-container position-relative">
        <canvas id="gameCanvas" 
                width="${this.gameConfig.WIDTH}" 
                height="${this.gameConfig.HEIGHT}"
                class="shadow-lg">
        </canvas>
        
        <!-- Controls overlay -->
        <div class="position-absolute top-0 end-0 mt-3 me-3">
          <div class="bg-dark bg-opacity-75 p-3 rounded">
            <div class="d-flex flex-column gap-3">
              <!-- Controls -->
              <div class="text-white text-center">
                <div><span class="badge bg-warning text-dark">W</span> Up</div>
                <div class="mt-1"><span class="badge bg-warning text-dark">S</span> Down</div>
              </div>
              
              <!-- Sound toggle -->
              <button class="btn btn-warning w-100" id="btnSilence">
                <i class="fas fa-volume-up"></i>
              </button>
          <button class="btn btn-danger" id="btnLeaveGame">
            <i class="fas fa-door-open me-2"></i>Quitter
          </button>
          </div>
        </div>
      </div>
    `;
  }

  afterRender() {
    this.init();
    this.setupEventListeners(); // Ensure event listeners are set up after rendering
  }
}

export default GameComponent;
