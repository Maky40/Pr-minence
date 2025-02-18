import Component from "../../utils/Component.js";
import { GameMovement } from "./GameMovement.js";
import { GAME_CONFIG } from "./gameConfig.js";
import pong42 from "../../services/pong42.js";
import { changePage } from "../../utils/Page.js";
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

    // Gère le compte à rebours et l'état "la partie a commencé"
    this.state = {
      countdown: 5,
      isGameStarted: false,
    };

    // On définit "gameObjects" juste pour dessiner (paddle1, paddle2, ball...)
    // On n'y stocke plus la logique de vitesse, collisions, etc.
    this.gameObjects = this.initializeGameObjects();

    // WebSocket qui est déjà créé ailleurs
    this.webSocket = pong42.player.socketMatch;

    // Movement = module pour envoyer "move up/down/stop"
    this.movement = new GameMovement(
      this.gameObjects,
      this.gameConfig,
      this.gameState
    );

    this.renderer = null;
    this.animationFrameId = null;

    // Audio
    this.countdownAudio = new Audio("/assets/start.mp3");
    this.themeAudio = new Audio("/assets/theme.mp3");
    this.isMuted = false;
    this.isCountdownStarted = false;
  }

  initializeGameObjects() {
    // Positions initiales (arbitraires, purement visuelles ;
    // le serveur nous enverra vite la position "réelle")
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
      },
      // On garde score1, score2 pour affichage
      score1: 0,
      score2: 0,
    };
  }

  setupWebSocket() {
    if (!this.webSocket) {
      console.error("WebSocket not initialized");
      return;
    }

    // Écoute des messages du serveur
    this.webSocket.addMessageListener("message", (data) => {
      try {
        const message = JSON.parse(data);

        switch (message.type) {
          case "game_start":
            // Optionnel : on peut lancer/forcer le compte à rebours,
            // ou afficher un message "La partie va commencer".
            console.log("Game start message received");
            break;

          case "game_state":
            // Le serveur nous envoie l'état complet
            // On met à jour nos objets pour dessiner
            this.gameObjects.paddle1.y = message.paddle_left_y;
            this.gameObjects.paddle2.y = message.paddle_right_y;
            this.gameObjects.ball.x = message.ball_x;
            this.gameObjects.ball.y = message.ball_y;

            if (
              message.score_left !== this.gameState.score1 ||
              message.score_right !== this.gameState.score2
            ) {
              this.gameState.score1 = message.score_left;
              this.gameState.score2 = message.score_right;
              this.handleScore();
            }

            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });
  }

  getControlsToDisplay() {
    // Si le joueur utilise les flèches (vérifie les dernières touches utilisées)
    const usesArrows = pong42.player.paddle === "right";
    return {
      up: usesArrows ? "↑" : "W",
      down: usesArrows ? "↓" : "S",
      upKey: usesArrows ? "ArrowUp" : "w",
      downKey: usesArrows ? "ArrowDown" : "s",
      player1: usesArrows ? "Player 1" : pong42.player.username,
      player2: usesArrows ? pong42.player.username : "Player 2",
    };
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
        console.log("Leaving game...");
        this.webSocket.send({ type: "leave" });
        this.webSocket.removeAllListeners();
        this.webSocket.close();
        pong42.player.socketMatch = null;
        changePage("home");
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key in this.gameState.keys) {
        event.preventDefault();
        this.gameState.keys[event.key] = true;
        this.updateKeyDisplay(event.key, true);
      }
    });

    document.addEventListener("keyup", (event) => {
      if (event.key in this.gameState.keys) {
        event.preventDefault();
        this.gameState.keys[event.key] = false;
        this.updateKeyDisplay(event.key, false);
      }
    });

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
          this.update(); // Met à jour le DOM (affiche le nouveau countdown)
        }

        if (timeLeft <= 0) {
          // Le décompte est fini, on lance la partie
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

  /**
   * Boucle d'animation :
   *  - Envoie la direction du paddle (up/down/stop) au serveur
   *  - Dessine l'état actuel (ce que le serveur nous a envoyé)
   *  - Reboucle avec requestAnimationFrame
   */
  gameLoop = () => {
    if (this.themeAudio) {
      this.themeAudio.muted = this.isMuted;
    }

    // Envoyer l'input (paddle up/down/stop) au serveur
    this.movement.updatePaddlePosition(
      this.gameState.keys,
      pong42.player.paddle,
      (direction) => {
        this.webSocket.send({ type: "move", direction });
      }
    );

    // Dessiner l'état (positions ball, paddles, scores)
    this.renderer.draw(this.gameObjects, this.gameState);
    // On continue la boucle
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  init() {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) {
      console.error("Canvas element not found");
      return;
    }
    //on stocke les keydown et keyup dans le gameState
    this.renderer = new GameRenderer(canvas, this.gameConfig);

    // WebSocket + events
    this.setupWebSocket();
    this.setupEventListeners();

    // Lancement compte à rebours
    this.startCountdown();
  }
  updateKeyDisplay(key, isPressed) {
    const upKeyElement = document.getElementById("upKey");
    const downKeyElement = document.getElementById("downKey");

    if (key === "w" || key === "ArrowUp") {
      if (upKeyElement) {
        upKeyElement.textContent = isPressed ? "↑" : "W";
        upKeyElement.classList.toggle("bg-info", isPressed);
        upKeyElement.classList.toggle("bg-warning", !isPressed);
      }
    }

    if (key === "s" || key === "ArrowDown") {
      if (downKeyElement) {
        downKeyElement.textContent = isPressed ? "↓" : "S";
        downKeyElement.classList.toggle("bg-info", isPressed);
        downKeyElement.classList.toggle("bg-warning", !isPressed);
      }
    }
  }

  handleScore() {
    const score1Element = document.querySelector("#player1-score .score-value");
    const score2Element = document.querySelector("#player2-score .score-value");

    if (score1Element) {
      score1Element.textContent = this.gameState.score1;
      score1Element.parentElement.classList.add("score-changed");
      setTimeout(
        () => score1Element.parentElement.classList.remove("score-changed"),
        500
      );
    }

    if (score2Element) {
      score2Element.textContent = this.gameState.score2;
      score2Element.parentElement.classList.add("score-changed");
      setTimeout(
        () => score2Element.parentElement.classList.remove("score-changed"),
        500
      );
    }
    this.update();
  }

  destroy() {
    // Annule la boucle d'animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);

    // Stop audios
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
    const controls = this.getControlsToDisplay();
    // Affichage du compte à rebours tant que la partie n'a pas commencé
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
                    <span class="badge bg-warning text-dark"> ${controls.up}</span> Up
                  </div>
                  <div class="text-white">
                    <span class="badge bg-warning text-dark">${controls.down}</span> Down
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
    // Partie en cours
    return `
    <div class="game-container position-relative vh-100 bg-dark">
      <!-- Canvas Background -->
      <canvas id="gameCanvas" 
              width="${this.gameConfig.WIDTH}" 
              height="${this.gameConfig.HEIGHT}"
              class="position-absolute top-50 start-50 translate-middle shadow-lg">
      </canvas>

      <!-- Top Bar with Scores -->
      <div class="position-absolute w-100 top-0 py-3" style="z-index: 1000;">
        <div class="container">
          <div class="row align-items-center">
            <!-- Leave Button -->
            <div class="col-3">
              <button class="btn btn-outline-danger" id="btnLeaveGame">
                <i class="fas fa-door-open me-2"></i>Quitter
              </button>
            </div>

            <!-- Score Display -->
            <div class="col-6">
              <div class="d-flex justify-content-center">
                <div class="bg-black bg-opacity-75 px-4 py-3 rounded-pill border border-2 border-info shadow-lg score-container">
                  <div class="d-flex align-items-center gap-5">
                    <!-- Player 1 Score -->
                    <div class="score-box text-center position-relative">
                      <div class="display-4 mb-0 text-info score-value" style="font-family: 'Orbitron', sans-serif;">
                        ${this.gameState.score1}
                      </div>
                      <div class="score-label">
                        <small class="text-white-50 text-uppercase" style="letter-spacing: 2px;">${
                          controls.player1
                        }</small>
                      </div>
                      <div class="score-glow"></div>
                    </div>
                    
                    <!-- Divider -->
                    <div class="score-divider border-end border-info opacity-75" style="height: 50px;"></div>
                    
                    <!-- Player 2 Score -->
                    <div class="score-box text-center position-relative">
                      <div class="display-4 mb-0 text-info score-value" style="font-family: 'Orbitron', sans-serif;">
                        ${this.gameState.score2}
                      </div>
                      <div class="score-label">
                        <small class="text-white-50 text-uppercase" style="letter-spacing: 2px;">${
                          controls.player2
                        }</small>
                      </div>
                      <div class="score-glow"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Controls & Sound -->
            <div class="col-3">
              <div class="d-flex justify-content-end me-3">
                <div class="bg-black bg-opacity-75 p-3 rounded">
                  <div class="d-flex flex-column gap-2">
                  <div class="text-white text-center mb-2">
                    <div><span class="badge ${
                      this.gameState.keys[controls.upKey]
                        ? "bg-info"
                        : "bg-warning"
                    } text-dark" id="upKey">
                      ${controls.up}
                    </span> Up</div>
                    <div class="mt-1"><span class="badge ${
                      this.gameState.keys[controls.downKey]
                        ? "bg-info"
                        : "bg-warning"
                    } text-dark" id="downKey">
                      ${controls.down}
                    </span> Down</div>
                  </div>
                    <button class="btn btn-warning btn-sm" id="btnSilence">
                      <i class="fas fa-volume-up"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  afterRender() {
    this.init();
    this.setupEventListeners();
  }
}

export default GameComponent;
