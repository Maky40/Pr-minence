import Component from "../../utils/Component.js";
import { GameMovement } from "./GameMovement.js";
import { GAME_CONFIG } from "./gameConfig.js";
import pong42 from "../../services/pong42.js";
import { changePage } from "../../utils/Page.js";
import GameRenderer from "./GameRenderer.js";
import Music from "../../utils/Music.js";
import GameOverComponent from "./GameOverComponent.js";

class GameComponent extends Component {
  constructor(local) {
    console.log("[DEBUG] GameComponent constructor");
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
      player1: "Player 1",
      player2: "Player 2",
    };
    this.local = local || false;
    this.state = {
      countdown: 5,
      isGameStarted: false,
      isGameOver: false,
      muted: false,
    };
    this.winner = null;
    this.gameObjects = this.initializeGameObjects();
    this.webSocket = pong42.player.socketMatch;
    this.movement = new GameMovement(
      this.gameObjects,
      this.gameConfig,
      this.gameState
    );
    this.tournament = null;
    if (pong42.player.tournament) {
      this.tournament = pong42.player.tournament.currentTournamentId;
    }
    this.renderer = null;
    this.animationFrameId = null;

    this.music = new Music();
    this.isCountdownStarted = false;

    this.handleSilence = this.handleSilence.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleSilence = this.handleSilence.bind(this);

    pong42.player.game = true;
    pong42.player.notifyListeners("gameStatusChanged", true);
  }

  handleKeyDown(event) {
    if (event.key in this.gameState.keys) {
      event.preventDefault();
      this.gameState.keys[event.key] = true;
    }
  }

  updatePlayerNames(players) {
    this.gameState.player1 = players.player1;
    this.gameState.player2 = players.player2;
    this.update();
  }

  handleKeyUp(event) {
    if (event.key in this.gameState.keys) {
      event.preventDefault();
      this.gameState.keys[event.key] = false;
    }
  }

  showGameOver() {
    // Nettoyer le jeu
    console.log(pong42, "Game Over");
    // Créer et afficher le composant de fin de jeu
    const gameOverComponent = new GameOverComponent(this, (template) => {
      this.container.innerHTML = template;
      gameOverComponent.afterRender();
    });

    gameOverComponent.render(this.container);
    this.destroy();
  }
  initializeGameObjects() {
    const { WIDTH, HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_SIZE } =
      this.gameConfig;
    let paddle1Color = "rgba(108, 145, 255, 0.8)";
    let paddle2Color = "rgba(108, 145, 255, 0.8)";
    if (pong42.player.paddle === "right")
      paddle1Color = "rgba(232, 99, 99, 0.8)";
    if (pong42.player.paddle === "left")
      paddle2Color = "rgba(232, 99, 99, 0.8)";
    return {
      paddle1: {
        x: 30,
        y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        color: paddle1Color,
      },
      paddle2: {
        x: WIDTH - 30 - PADDLE_WIDTH,
        y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        color: paddle2Color,
      },
      ball: {
        x: WIDTH / 2,
        y: HEIGHT / 2,
        size: BALL_SIZE,
      },
      score1: 0,
      score2: 0,
    };
  }

  setupWebSocket() {
    if (!this.webSocket) {
      console.error("[DEBUG] WebSocket not initialized");
      changePage("home");
      return;
    }

    console.log("[DEBUG] WebSocket instance:", this.webSocket);

    // 🎯 Ajout de la gestion de fermeture de WebSocket
    this.webSocket.onclose = (event) => {
      if (event.code === 4000) {
        // Fermeture volontaire du backend pour remplacer une ancienne connexion
        console.log("Ancienne WebSocket fermée volontairement (code 4000)");
        return;
      }

      // 🚨 Autres fermetures inattendues
      alert("Connexion WebSocket perdue. Retour au menu.");
      this.destroy();
      pong42.player.socketMatch = null;
      changePage("home");
    };

    this.webSocket.addMessageListener("message", async (data) => {
      try {
        const message = JSON.parse(data);

        if (message.error) {
          this.destroy();
          this.webSocket.close();
          pong42.player.socketMatch = null;
          changePage("home");
          return;
        }

        switch (message.type) {
          case "players_info":
            console.log(
              "[DEBUG] Players info received:",
              message.left_username,
              message.right_username
            );
            this.gameState.player1 = message.left_username;
            this.gameState.player2 = message.right_username;
            this.render();
            break;

          case "game_state":
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

          case "game_over":
            this.webSocket.removeAllListeners();
            this.webSocket.close();
            pong42.player.socketMatch = null;
            this.gameState.score1 = message.score_left;
            this.gameState.score2 = message.score_right;

            let winner = "right";
            if (message.score_left > message.score_right) winner = "left";
            this.winner =
              pong42.player.paddle === winner ? "You win!" : "You lose!";

            this.state.isGameOver = true;
            await this.music.stop();
            await this.music.play("final");
            pong42.tabManager.notifyMatchGameOverOrAborted({
              match_id: this.webSocket.matchId,
            });
            this.showGameOver();
            await this.destroy();
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });
  }

  getControlsToDisplay() {
    const usesArrows = pong42.player.paddle === "right";
    return {
      up: usesArrows ? "↑" : "W",
      down: usesArrows ? "↓" : "S",
      upKey: usesArrows ? "ArrowUp" : "w",
      downKey: usesArrows ? "ArrowDown" : "s",
    };
  }

  setupEventListeners() {
    // Remove previous listeners first (if any)
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);

    // Add new listeners
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);

    const btnSilence = document.getElementById("btnSilence");
    if (btnSilence) {
      btnSilence.removeEventListener("click", this.handleSilence);
      btnSilence.addEventListener("click", this.handleSilence);
    }
  }

  async handleSilence() {
    this.state.muted = !this.state.muted;
    if (this.state.muted) {
      await this.music.mute();
    } else {
      await this.music.unmute();
    }
    const btnSilence = document.getElementById("btnSilence");
    if (btnSilence) {
      const iconClass = this.state.muted ? "fa-volume-mute" : "fa-volume-up";
      btnSilence.innerHTML = `<i class="fas ${iconClass}"></i>`;
    }
    this.update();
  }

  startCountdown() {
    if (!this.state.isGameStarted && !this.isCountdownStarted) {
      this.isCountdownStarted = true;
      this.music.startCountdown(
        // Callback quand le compte à rebours est terminé
        () => {
          this.state.isGameStarted = true;
          this.update();
          this.gameLoop();
        },
        // Callback pour mettre à jour le compte à rebours
        (timeLeft) => {
          if (this.state.countdown !== timeLeft) {
            this.state.countdown = timeLeft;
            this.update();
          }
        }
      );
    }
  }

  gameLoop = () => {
    if (this.themeAudio) {
      this.themeAudio.muted = this.state.muted;
    }
    if (!this.local) {
      this.movement.updatePaddlePosition(
        this.gameState.keys,
        pong42.player.paddle,
        (direction) => {
          this.webSocket.send({ type: "move", direction });
        }
      );
    }
    if (this.local) {
      this.movement.updateLocalPaddles(this.gameState.keys, (left, right) => {
        this.webSocket.send(
          JSON.stringify({
            type: "local_move",
            leftDir: left,
            rightDir: right,
          })
        );
      });
    }

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

  async destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Correctly remove the event listeners
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);

    const btnSilence = document.getElementById("btnSilence");
    if (btnSilence) {
      btnSilence.removeEventListener("click", this.handleSilence);
    }
    pong42.player.game = false;
    pong42.player.notifyListeners("gameStatusChanged", false);
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
				
        ${
          this.local
            ? `<div class="d-flex justify-content-center gap-4">
				  <div class="text-info"> PLAYER 1
					<span class="badge bg-warning text-dark">↑ </span> Up
				  </div>
				  <div class="text-info">
					<span class="badge bg-warning text-dark">↓</span> Down
				  </div>
				</div>
        <div class="d-flex justify-content-center gap-4">
				  <div class="text-white"> PLAYER 2
					<span class="badge bg-warning text-dark">w</span> Up
				  </div>
				  <div class="text-white">
					<span class="badge bg-warning text-dark">s</span> Down
				  </div>
				</div>`
            : `<div class="d-flex justify-content-center gap-4">
				  <div class="text-white">
					<span class="badge bg-warning text-dark"> ${controls.up}</span> Up
				  </div>
				  <div class="text-white">
					<span class="badge bg-warning text-dark">${controls.down}</span> Down
				  </div>
				</div>`
        }
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

			  <!-- Score Display (Left) -->
			  <div class="col-6 text-start">
				<div class="d-flex justify-content-start">
				  <div class="bg-black bg-opacity-75 px-4 py-3 rounded-pill border border-2 border-info shadow-lg score-container">
					<div class="d-flex align-items-center gap-5">
					  <!-- Player 1 Score -->
					  <div class="score-box text-center position-relative">
						<div class="display-4 mb-0 text-info score-value" style="font-family: 'Orbitron', sans-serif;">
						  ${this.gameState.score1}
						</div>
						<div class="score-label">
						  <small class="text-white-50 text-uppercase" style="letter-spacing: 2px;">${
                this.gameState.player1
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
                this.gameState.player2
              }</small>
						</div>
						<div class="score-glow"></div>
					  </div>
					</div>
				  </div>
				</div>
			  </div>

			  <!-- Controls & Sound (Right) -->
			  <div class="col-6 text-end">
				<div class="d-flex justify-content-end me-3">
				  <div class="bg-black bg-opacity-75 p-3 rounded">
					<div class="d-flex flex-column gap-2">
					  <div class="text-white text-center mb-2">
						<div><span class="badge ${
              this.gameState.keys[controls.upKey] ? "bg-info" : "bg-warning"
            } text-dark" id="upKey">
						  ${controls.up}
						</span> Up</div>
						<div class="mt-1"><span class="badge ${
              this.gameState.keys[controls.downKey] ? "bg-info" : "bg-warning"
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
