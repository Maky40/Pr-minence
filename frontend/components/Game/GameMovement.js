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
  }
  
