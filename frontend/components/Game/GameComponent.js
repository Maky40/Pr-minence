import Component from "../../utils/Component.js";

class GameComponent extends Component {
  constructor() {
    super();
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
    this.ctx = null;
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

  movePaddles() {
    const { PADDLE_SPEED } = this.gameConfig;
    const { paddle1, paddle2 } = this.gameObjects;
    const { keys } = this.gameState;

    if (keys.w && paddle1.y > 0) paddle1.y -= PADDLE_SPEED;
    if (keys.s && paddle1.y < this.gameConfig.HEIGHT - paddle1.height)
      paddle1.y += PADDLE_SPEED;
    if (keys.ArrowUp && paddle2.y > 0) paddle2.y -= PADDLE_SPEED;
    if (keys.ArrowDown && paddle2.y < this.gameConfig.HEIGHT - paddle2.height)
      paddle2.y += PADDLE_SPEED;
  }

  moveBall() {
    const { ball } = this.gameObjects;
    const { WIDTH, HEIGHT } = this.gameConfig;

    ball.x += this.gameState.ballSpeedX;
    ball.y += this.gameState.ballSpeedY;

    this.checkCollisions();
    this.checkScoring();
  }

  checkCollisions() {
    const { ball, paddle1, paddle2 } = this.gameObjects;

    // Bounce off walls
    if (ball.y <= 0 || ball.y + ball.size >= this.gameConfig.HEIGHT) {
      this.gameState.ballSpeedY = -this.gameState.ballSpeedY;
    }

    // Paddle collisions
    if (
      (ball.x <= paddle1.x + paddle1.width &&
        ball.y + ball.size >= paddle1.y &&
        ball.y <= paddle1.y + paddle1.height) ||
      (ball.x + ball.size >= paddle2.x &&
        ball.y + ball.size >= paddle2.y &&
        ball.y <= paddle2.y + paddle2.height)
    ) {
      this.gameState.ballSpeedX = -this.gameState.ballSpeedX;
    }
  }

  checkScoring() {
    const { ball } = this.gameObjects;
    const { WIDTH } = this.gameConfig;

    if (ball.x < 0) {
      this.gameState.score2++;
      this.resetBall();
    }
    if (ball.x > WIDTH) {
      this.gameState.score1++;
      this.resetBall();
    }
  }

  resetBall() {
    const { WIDTH, HEIGHT, BALL_SIZE } = this.gameConfig;
    const { ball } = this.gameObjects;

    ball.x = WIDTH / 2 - BALL_SIZE / 2;
    ball.y = HEIGHT / 2 - BALL_SIZE / 2;
    this.gameState.ballSpeedX = -this.gameState.ballSpeedX;
  }

  draw() {
    const { ctx } = this;
    const { WIDTH, HEIGHT } = this.gameConfig;
    const { paddle1, paddle2, ball } = this.gameObjects;
    const { score1, score2 } = this.gameState;

    // Clear canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw game objects
    ctx.fillStyle = "white";
    ctx.fillRect(paddle1.x, paddle1.y, paddle1.width, paddle1.height);
    ctx.fillRect(paddle2.x, paddle2.y, paddle2.width, paddle2.height);
    ctx.fillRect(ball.x, ball.y, ball.size, ball.size);

    // Draw center line
    ctx.beginPath();
    ctx.setLineDash([10, 15]);
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.strokeStyle = "white";
    ctx.stroke();

    // Draw scores
    ctx.font = "36px Arial";
    ctx.fillText(score1, WIDTH / 4, 50);
    ctx.fillText(score2, (WIDTH / 4) * 3, 50);
  }

  gameLoop = () => {
    this.movePaddles();
    this.moveBall();
    this.draw();
    requestAnimationFrame(this.gameLoop);
  };

  init() {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) {
      console.error("Canvas non trouvé");
      return;
    }

    this.ctx = canvas.getContext("2d");
    this.initializeGameObjects();
    this.setupEventListeners();
    this.gameLoop();
  }

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
