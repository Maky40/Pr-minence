const init = () => {
  console.log("Script du jeu chargé");

  // Select the canvas and set up context
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    console.error("Canvas non trouvé");
    return;
  }
  const ctx = canvas.getContext("2d");

  // Canvas dimensions
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // Game object dimensions
  const PADDLE_WIDTH = 10;
  const PADDLE_HEIGHT = 100;
  const BALL_SIZE = 15;

  // Speeds
  const PADDLE_SPEED = 5;
  let ballSpeedX = 4;
  let ballSpeedY = 4;

  // Game objects
  const paddle1 = {
    x: 10,
    y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  };
  const paddle2 = {
    x: WIDTH - PADDLE_WIDTH - 10,
    y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  };
  const ball = {
    x: WIDTH / 2 - BALL_SIZE / 2,
    y: HEIGHT / 2 - BALL_SIZE / 2,
    size: BALL_SIZE,
  };

  // Scores
  let score1 = 0;
  let score2 = 0;

  // Key states
  const keys = { w: false, s: false, ArrowUp: false, ArrowDown: false };

  // Event listeners for key input
  document.addEventListener("keydown", (event) => {
    if (event.key in keys) keys[event.key] = true;
  });
  document.addEventListener("keyup", (event) => {
    if (event.key in keys) keys[event.key] = false;
  });

  // Function to move paddles
  function movePaddles() {
    if (keys.w && paddle1.y > 0) paddle1.y -= PADDLE_SPEED;
    if (keys.s && paddle1.y < HEIGHT - PADDLE_HEIGHT) paddle1.y += PADDLE_SPEED;
    if (keys.ArrowUp && paddle2.y > 0) paddle2.y -= PADDLE_SPEED;
    if (keys.ArrowDown && paddle2.y < HEIGHT - PADDLE_HEIGHT)
      paddle2.y += PADDLE_SPEED;
  }

  // Function to move ball
  function moveBall() {
    ball.x += ballSpeedX;
    ball.y += ballSpeedY;

    // Bounce off top and bottom walls
    if (ball.y <= 0 || ball.y + ball.size >= HEIGHT) {
      ballSpeedY = -ballSpeedY;
    }

    // Check for paddle collisions
    if (
      (ball.x <= paddle1.x + paddle1.width &&
        ball.y + ball.size >= paddle1.y &&
        ball.y <= paddle1.y + paddle1.height) ||
      (ball.x + ball.size >= paddle2.x &&
        ball.y + ball.size >= paddle2.y &&
        ball.y <= paddle2.y + paddle2.height)
    ) {
      ballSpeedX = -ballSpeedX;
    }

    // Check for scoring
    if (ball.x < 0) {
      score2++;
      resetBall();
    }
    if (ball.x > WIDTH) {
      score1++;
      resetBall();
    }
  }

  // Function to reset ball
  function resetBall() {
    ball.x = WIDTH / 2 - BALL_SIZE / 2;
    ball.y = HEIGHT / 2 - BALL_SIZE / 2;
    ballSpeedX = -ballSpeedX;
  }

  // Function to draw game objects
  function draw() {
    // Clear canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw paddles
    ctx.fillStyle = "white";
    ctx.fillRect(paddle1.x, paddle1.y, paddle1.width, paddle1.height);
    ctx.fillRect(paddle2.x, paddle2.y, paddle2.width, paddle2.height);

    // Draw ball
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

  // Main game loop
  function gameLoop() {
    movePaddles();
    moveBall();
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Start the game loop
  gameLoop();
};

export { init };
