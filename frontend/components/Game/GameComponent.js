import Component from "../../utils/Component.js";

class GameComponent extends Component {
  constructor() {
    super();
    this.ws = null;  // WebSocket
    this.matchId = null;
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
    const { WIDTH, HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_SIZE } = this.gameConfig;

    this.gameObjects = {
      paddle1: { x: 10, y: HEIGHT / 2 - PADDLE_HEIGHT / 2, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
      paddle2: { x: WIDTH - PADDLE_WIDTH - 10, y: HEIGHT / 2 - PADDLE_HEIGHT / 2, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
      ball: { x: WIDTH / 2 - BALL_SIZE / 2, y: HEIGHT / 2 - BALL_SIZE / 2, size: BALL_SIZE },
    };
  }

  setupWebSocket(matchId) {
    this.matchId = matchId;
    let wsUrl = `ws://localhost:8000/ws/pong/${matchId}/`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("Connexion WebSocket établie");
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "match_start") {
        console.log("Match prêt ! Début du jeu.");
      }
      if (data.type === "move") {
        if (data.player === "left") this.gameObjects.paddle1.y = data.position;
        if (data.player === "right") this.gameObjects.paddle2.y = data.position;
      }
      if (data.type === "score") {
        this.gameState.score1 = data.score1;
        this.gameState.score2 = data.score2;
      }
      if (data.type === "ball") {
        this.gameObjects.ball.x = data.x;
        this.gameObjects.ball.y = data.y;
      }
    };

    this.ws.onclose = () => {
      console.log("Connexion WebSocket fermée");
    };
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

  movePaddles() {
    const { PADDLE_SPEED } = this.gameConfig;
    const { paddle1, paddle2 } = this.gameObjects;
    const { keys } = this.gameState;

    if (keys.w && paddle1.y > 0) {
      paddle1.y -= PADDLE_SPEED;
      this.sendMove("left", paddle1.y);
    }
    if (keys.s && paddle1.y < this.gameConfig.HEIGHT - paddle1.height) {
      paddle1.y += PADDLE_SPEED;
      this.sendMove("left", paddle1.y);
    }
    if (keys.ArrowUp && paddle2.y > 0) {
      paddle2.y -= PADDLE_SPEED;
      this.sendMove("right", paddle2.y);
    }
    if (keys.ArrowDown && paddle2.y < this.gameConfig.HEIGHT - paddle2.height) {
      paddle2.y += PADDLE_SPEED;
      this.sendMove("right", paddle2.y);
    }
  }

  moveBall() {
    const { ball } = this.gameObjects;
    ball.x += this.gameState.ballSpeedX;
    ball.y += this.gameState.ballSpeedY;
    this.sendBallPosition(ball.x, ball.y);
  }

  setupEventListeners() {
    document.addEventListener("keydown", (event) => {
      if (event.key in this.gameState.keys) this.gameState.keys[event.key] = true;
    });

    document.addEventListener("keyup", (event) => {
      if (event.key in this.gameState.keys) this.gameState.keys[event.key] = false;
    });
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

  init(matchId) {
    this.setupWebSocket(matchId);
    const canvas = document.getElementById("gameCanvas");
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

