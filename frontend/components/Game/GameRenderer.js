class GameRenderer {
  constructor(canvas, gameConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.gameConfig = gameConfig;

    // Définir les dimensions du canvas
    this.canvas.width = gameConfig.WIDTH;
    this.canvas.height = gameConfig.HEIGHT;
    this.previousScores = { score1: 0, score2: 0 };
    this.scoreAnimationStart = 0;
    this.SCORE_ANIMATION_DURATION = 500;
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
    this.ctx.fillStyle = paddle.color;
    this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  }

  drawBall(ball) {
    this.ctx.fillStyle = "rgba(255, 255, 108, 0.8)";
    this.ctx.beginPath();  // Commencer le chemin pour dessiner le cercle
    this.ctx.arc(ball.x + ball.size / 2, ball.y + ball.size / 2, ball.size / 2, 0, Math.PI * 2);
    this.ctx.fill();
  }
}

export default GameRenderer;
