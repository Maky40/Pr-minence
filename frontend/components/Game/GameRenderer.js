class GameRenderer {
  constructor(canvas, gameConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.gameConfig = gameConfig;

    // Définir les dimensions du canvas
    this.canvas.width = gameConfig.WIDTH;
    this.canvas.height = gameConfig.HEIGHT;
  }

  draw(gameObjects, gameState) {
    // Nettoyer le canvas
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.gameConfig.WIDTH, this.gameConfig.HEIGHT);

    // Dessiner la ligne centrale
    this.drawCenterLine();

    // Dessiner les raquettes
    this.ctx.fillStyle = "white";
    this.drawPaddle(gameObjects.paddle1);
    this.drawPaddle(gameObjects.paddle2);

    // Dessiner la balle
    this.drawBall(gameObjects.ball);

    // Dessiner les scores
    this.drawScore(gameState.score1, gameState.score2);
  }

  drawCenterLine() {
    this.ctx.beginPath();
    this.ctx.setLineDash([10, 15]); // Ligne pointillée
    this.ctx.moveTo(this.gameConfig.WIDTH / 2, 0);
    this.ctx.lineTo(this.gameConfig.WIDTH / 2, this.gameConfig.HEIGHT);
    this.ctx.strokeStyle = "white";
    this.ctx.stroke();
    this.ctx.setLineDash([]); // Réinitialiser le style de ligne
  }

  drawPaddle(paddle) {
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  }

  drawBall(ball) {
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(ball.x, ball.y, ball.size, ball.size);
  }

  drawScore(score1, score2) {
    this.ctx.fillStyle = "white";
    this.ctx.font = "48px Arial";
    this.ctx.textAlign = "center";

    // Score gauche
    this.ctx.fillText(score1.toString(), this.gameConfig.WIDTH / 4, 50);

    // Score droite
    this.ctx.fillText(score2.toString(), (this.gameConfig.WIDTH / 4) * 3, 50);
  }
}

export default GameRenderer;
