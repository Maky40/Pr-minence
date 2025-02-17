class GameRenderer {
  constructor(canvas, gameConfig) {
    this.ctx = canvas.getContext("2d");
    this.gameConfig = gameConfig;
  }

  draw(gameObjects, gameState) {
    const { WIDTH, HEIGHT } = this.gameConfig;
    const { paddle1, paddle2, ball } = gameObjects;
    const { score1, score2 } = gameState;

    // Clear canvas
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw game objects
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(paddle1.x, paddle1.y, paddle1.width, paddle1.height);
    this.ctx.fillRect(paddle2.x, paddle2.y, paddle2.width, paddle2.height);
    this.ctx.fillRect(ball.x, ball.y, ball.size, ball.size);

    // Draw center line
    this.drawCenterLine(WIDTH, HEIGHT);

    // Draw scores
    this.drawScores(score1, score2, WIDTH);
  }

  drawCenterLine(width, height) {
    this.ctx.beginPath();
    this.ctx.setLineDash([10, 15]);
    this.ctx.moveTo(width / 2, 0);
    this.ctx.lineTo(width / 2, height);
    this.ctx.strokeStyle = "white";
    this.ctx.stroke();
  }

  drawScores(score1, score2, width) {
    this.ctx.font = "36px Arial";
    this.ctx.fillStyle = "white";
    this.ctx.fillText(score1, width / 4, 50);
    this.ctx.fillText(score2, (width / 4) * 3, 50);
  }
}

export default GameRenderer;
