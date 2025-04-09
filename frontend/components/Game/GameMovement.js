export class GameMovement {
  constructor(gameObjects, gameConfig, gameState) {
    this.gameObjects = gameObjects;
    this.gameConfig = gameConfig;
    this.gameState = gameState;
  }

  /**
   * Envoie uniquement des commandes "up", "down" ou "stop"
   * au serveur, selon les touches enfoncées par l'utilisateur.
   */
  updatePaddlePosition(keys, playerPaddle, sendDirection) {
    const controls =
      playerPaddle === "left"
        ? { up: "w", down: "s" }
        : { up: "ArrowUp", down: "ArrowDown" };

    // Si la touche "haut" est enfoncée
    if (keys[controls.up]) {
      sendDirection("up");
    }
    // Sinon si la touche "bas" est enfoncée
    else if (keys[controls.down]) {
      sendDirection("down");
    }
    // Sinon, pas de touche (ou les deux, etc.) => "stop"
    else {
      sendDirection("stop");
    }
  }

  updateLocalPaddles(keys, sendLocalMove) {
    // 1) Déterminer direction du paddle gauche (w / s)
    let leftDir = "";
    if (keys["w"]) leftDir = "up";
    else if (keys["s"]) leftDir = "down";

    // 2) Déterminer direction du paddle droit (ArrowUp / ArrowDown)
    let rightDir = "";
    if (keys["ArrowUp"]) rightDir = "up";
    else if (keys["ArrowDown"]) rightDir = "down";

    // 3) Envoie un message "local_move"
    sendLocalMove(leftDir, rightDir);
  }
}
