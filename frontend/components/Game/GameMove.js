class GameMove {
  constructor(gameConfig) {
    this.gameConfig = gameConfig;
  }

  movePaddles(gameObjects, gameState) {
    const { PADDLE_SPEED } = this.gameConfig;
    const { keys } = gameState;

    // Move left paddle (Player 1)
    if (keys.w) {
      gameObjects.paddle1.y = Math.max(0, gameObjects.paddle1.y - PADDLE_SPEED);
    }
    if (keys.s) {
      gameObjects.paddle1.y = Math.min(
        this.gameConfig.HEIGHT - gameObjects.paddle1.height,
        gameObjects.paddle1.y + PADDLE_SPEED
      );
    }

    // Move right paddle (Player 2)
    if (keys.ArrowUp) {
      gameObjects.paddle2.y = Math.max(0, gameObjects.paddle2.y - PADDLE_SPEED);
    }
    if (keys.ArrowDown) {
      gameObjects.paddle2.y = Math.min(
        this.gameConfig.HEIGHT - gameObjects.paddle2.height,
        gameObjects.paddle2.y + PADDLE_SPEED
      );
    }
  }

  moveBall(gameObjects, gameState) {
    const ball = gameObjects.ball;
    const { paddle1, paddle2 } = gameObjects;

    // Update ball position
    ball.x += gameState.ballSpeedX;
    ball.y += gameState.ballSpeedY;

    // Ball collision with top and bottom
    if (ball.y <= 0 || ball.y + ball.size >= this.gameConfig.HEIGHT) {
      gameState.ballSpeedY = -gameState.ballSpeedY;
    }

    // Ball collision with paddles
    this.handlePaddleCollision(ball, paddle1, paddle2, gameState);

    // Ball out of bounds (scoring)
    this.handleScoring(ball, gameState);
  }

  handlePaddleCollision(ball, paddle1, paddle2, gameState) {
    // Left paddle collision
    if (
      ball.x <= paddle1.x + paddle1.width &&
      ball.y + ball.size >= paddle1.y &&
      ball.y <= paddle1.y + paddle1.height
    ) {
      ball.x = paddle1.x + paddle1.width;
      gameState.ballSpeedX = -gameState.ballSpeedX;
    }

    // Right paddle collision
    if (
      ball.x + ball.size >= paddle2.x &&
      ball.y + ball.size >= paddle2.y &&
      ball.y <= paddle2.y + paddle2.height
    ) {
      ball.x = paddle2.x - ball.size;
      gameState.ballSpeedX = -gameState.ballSpeedX;
    }
  }

  handleScoring(ball, gameState) {
    // Point for player 2
    if (ball.x < 0) {
      gameState.score2++;
      this.resetBall(ball);
    }
    // Point for player 1
    if (ball.x > this.gameConfig.WIDTH) {
      gameState.score1++;
      this.resetBall(ball);
    }
  }

  resetBall(ball) {
    ball.x = this.gameConfig.WIDTH / 2;
    ball.y = this.gameConfig.HEIGHT / 2;
  }
}

export default GameMove;
