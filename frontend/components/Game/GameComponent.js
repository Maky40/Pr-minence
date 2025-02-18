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
    this.movement = new GameMovement(this.gameObjects, this.gameConfig, this.gameState);

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
    const { WIDTH, HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_SIZE } = this.gameConfig;

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

            this.gameState.score1 = message.score_left;
            this.gameState.score2 = message.score_right;
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });
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
          this.countdownAudio.removeEventListener("timeupdate", updateCountdown);
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
    this.renderer = new GameRenderer(canvas, this.gameConfig);

    // WebSocket + events
    this.setupWebSocket();
    this.setupEventListeners();

    // Lancement compte à rebours
    this.startCountdown();
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

    // Partie en cours
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
      </div>
    `;
  }

  afterRender() {
    this.init();
    this.setupEventListeners();
  }
}

export default GameComponent;

