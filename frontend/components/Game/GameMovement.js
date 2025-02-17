export class GameMovement {
  constructor(gameObjects, gameConfig, gameState) {
    this.gameObjects = gameObjects;
    this.gameConfig = gameConfig;
    this.gameState = gameState;
  }

  updatePaddlePosition(keys, playerPaddle, sendMove) {
    const { PADDLE_SPEED, HEIGHT } = this.gameConfig;
    const paddle =
      playerPaddle === "left"
        ? this.gameObjects.paddle1
        : this.gameObjects.paddle2;
    const controls =
      playerPaddle === "left"
        ? { up: "w", down: "s" }
        : { up: "ArrowUp", down: "ArrowDown" };

    if (keys[controls.up] && paddle.y > 0) {
      paddle.y -= PADDLE_SPEED;
      sendMove(paddle.y);
    }
    if (keys[controls.down] && paddle.y < HEIGHT - paddle.height) {
      paddle.y += PADDLE_SPEED;
      sendMove(paddle.y);
    }
  }

  updateBallPosition(isHost, sendBallPosition, sendScore) {
    if (!isHost) return;

    const { ball } = this.gameObjects;
    const { WIDTH, HEIGHT } = this.gameConfig;

    ball.x += ball.speedX;
    ball.y += ball.speedY;

    if (ball.y <= 0 || ball.y + ball.size >= HEIGHT) {
      ball.speedY = -ball.speedY;
    }

    if (this.checkPaddleCollision()) {
      ball.speedX = -ball.speedX;
    }

    if (ball.x <= 0 || ball.x + ball.size >= WIDTH) {
      let score1 = this.gameObjects.score1 || 0;
      let score2 = this.gameObjects.score2 || 0;
      if (ball.x <= 0) {
        score2++;
        this.gameObjects.score2 = score2;
      } else {
        score1++;
        this.gameObjects.score1 = score1;
      }

      // Envoyer les deux scores
      sendScore({
        type: "score",
        score1: score1,
        score2: score2,
      });
      this.resetBall();
    }

    sendBallPosition({
      type: "ball",
      x: ball.x,
      y: ball.y,
    });
  }

  checkPaddleCollision() {
    const { ball, paddle1, paddle2 } = this.gameObjects;

    return (
      (ball.x <= paddle1.x + paddle1.width &&
        ball.y >= paddle1.y &&
        ball.y <= paddle1.y + paddle1.height) ||
      (ball.x + ball.size >= paddle2.x &&
        ball.y >= paddle2.y &&
        ball.y <= paddle2.y + paddle2.height)
    );
  }

  resetBall() {
    const { WIDTH, HEIGHT, BALL_SPEED } = this.gameConfig;
    this.gameObjects.ball = {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      size: this.gameConfig.BALL_SIZE,
      speedX: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      speedY: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    };
  }
}
