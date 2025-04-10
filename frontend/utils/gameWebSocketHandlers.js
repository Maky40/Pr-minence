import GameComponent from "../components/Game/GameComponent.js";
import pong42 from "../services/pong42.js";
import WebSocketAPI from "../services/websocket.js";
import { ENV } from "../env.js";

/**
 * Creates and initializes a WebSocket connection for a game match
 * @param {Object} component - The component instance
 * @param {string} matchId - The ID of the match to connect to
 * @param {Object} options - Additional options
 * @returns {WebSocketAPI} The WebSocket instance
 */

function generateRamdomMatchId() {
  // Generate a random match ID
  const randomMatchId = Math.floor(Math.random() * 1000000);
  return randomMatchId;
}

function reuseExistingWebSocket(component, options = {}) {
  // Si aucune connexion existante ou si on force une nouvelle connexion
  if (!pong42.player.socketMatch || options.forceNewConnection) {
    return null;
  }

  console.log("[GAME] Réutilisation d'une connexion WebSocket existante");

  // Utiliser la connexion existante
  const existingSocket = pong42.player.socketMatch;

  // Mettre à jour la référence dans le composant
  component.webSocketMatch = existingSocket;

  // Vérifier si la connexion est toujours active
  if (existingSocket.isConnected()) {
    console.log("[GAME] La connexion existante est active");

    // On ne réinitialise pas les écouteurs existants, mais on peut ajouter
    // des écouteurs spécifiques au composant si nécessaire
    if (options.addComponentListeners) {
      setupComponentSpecificListeners(component, existingSocket, options);
    }

    return existingSocket;
  } else {
    console.log(
      "[GAME] La connexion existante est inactive, création d'une nouvelle"
    );
    // On continue avec la création d'une nouvelle connexion
    // Nettoyer d'abord l'ancienne
    existingSocket.removeAllListeners();
    return null;
  }
}

export function initializeGameWebSocket(component, matchId, options = {}) {
  // If matchId is empty, use base URL for host connections
  const existingSocket = reuseExistingWebSocket(component, options);
  if (existingSocket) {
    return existingSocket;
  }
  if (pong42.player.socketMatch && !options.forceNewConnection) {
    console.log("[GAME] Réutilisation d'une connexion WebSocket existante");

    // Utiliser la connexion existante
    const existingSocket = pong42.player.socketMatch;

    // Mettre à jour la référence dans le composant
    component.webSocketMatch = existingSocket;

    // Vérifier si la connexion est toujours active
    if (existingSocket.isConnected()) {
      console.log("[GAME] La connexion existante est active");

      // On ne réinitialise pas les écouteurs existants, mais on peut ajouter
      // des écouteurs spécifiques au composant si nécessaire
      if (options.addComponentListeners) {
        setupComponentSpecificListeners(component, existingSocket, options);
      }

      return existingSocket;
    } else {
      console.log(
        "[GAME] La connexion existante est inactive, création d'une nouvelle"
      );
      // On continue avec la création d'une nouvelle connexion
      // Nettoyer d'abord l'ancienne
      existingSocket.removeAllListeners();
    }
  }
  const wsUrlBase = options.local ? ENV.WS_URL_LOCAL : ENV.WS_URL_GAME;
  const wsUrlGame = `${wsUrlBase}${
    matchId || (options.local ? generateRamdomMatchId() : "")
  }/`;

  // Create WebSocket and store it
  const webSocketMatch = new WebSocketAPI(wsUrlGame);

  // Store in component and global state
  component.webSocketMatch = webSocketMatch;
  pong42.player.socketMatch = webSocketMatch;

  // Add a special handler for host mode (when no matchId is provided)
  if (options.local) {
    console.log("[GAME] Local mode detected, setting up local WebSocket");
    pong42.player.paddle = "left";
  }
  if (!matchId && options.isHost) {
    webSocketMatch.addMessageListener("message", (data) => {
      try {
        const message = JSON.parse(data);

        // Handle initial match ID assignment for host
        if (message.match_id && !component.state.matchId) {
          console.log("[GAME] Received match ID:", message.match_id);

          // Update component state
          component.setState({
            matchId: message.match_id,
            paddle: message.paddle || "left",
            waitingGuest: true,
            loading: false,
            isConnected: true,
          });

          // Update global state
          pong42.player.match_id = message.match_id;
          pong42.player.paddle = message.paddle || "left";

          return;
        }

        // Otherwise, use the standard message handler
        handleGameWebSocketMessage(component, webSocketMatch, data);
      } catch (error) {
        console.error("[GAME] Error parsing initial message:", error);
      }
    });
  } else {
    // Standard event listeners for guests or matches with known IDs
    setupStandardWebSocketListeners(component, webSocketMatch, options);
  }

  return webSocketMatch;
}

/**
 * Sets up standard event listeners for game WebSocket
 */
function setupStandardWebSocketListeners(
  component,
  webSocketMatch,
  options = {}
) {
  // Connection open handler
  webSocketMatch.addMessageListener("open", () => {
    console.log("[GAME] WebSocket connection established");

    component.setState({
      loading: true,
      isConnected: true,
      local: options.local || false,
      ...(options.waitingGuest !== undefined
        ? { waitingGuest: options.waitingGuest }
        : {}),
    });
  });

  // Message handler
  webSocketMatch.addMessageListener("message", (data) => {
    handleGameWebSocketMessage(component, webSocketMatch, data);
  });
}

/**
 * Standard message handler for game WebSocket messages
 */
export function handleGameWebSocketMessage(component, webSocketMatch, data) {
  try {
    const message = JSON.parse(data);
    console.log("[GAME] Message received:", message);

    // Error handling
    if (message.error) {
      console.error("[GAME] Error message:", message.error);
      component.setState({
        error: message.error,
        loading: false,
        isConnected: false,
      });
      cleanupGameWebSocket(component, webSocketMatch);
      return;
    }

    if (message.type === "players_info") {
      console.log("[GAME] Players info received:", message);
      // Handle players info
      component.setState({
        player1: message.left_username,
        player2: message.right_username,
      });
      return;
    }
    // Handle "Connexion WebSocket établie" message
    if (message.message === "Connexion WebSocket établie") {
      handleConnectionEstablished(component, message);
      return;
    }

    // Handle game_start message
    if (message.type === "game_start") {
      handleGameStart(component, webSocketMatch);
      return;
    }
    // Other message handling can be added here
  } catch (error) {
    console.error("[GAME] Error parsing message:", error, "Raw data:", data);
    component.setState({
      error: "Erreur lors du traitement des données du serveur",
      loading: false,
      isConnected: false,
    });
    cleanupGameWebSocket(component, webSocketMatch);
  }
}

/**
 * Handle the "Connexion WebSocket établie" message
 */
export function handleConnectionEstablished(component, message) {
  console.log("[GAME] Connection established with paddle assignment");

  // Update component state
  component.paddle = message.paddle;
  component.matchId = message.match_id;

  // Update global state
  pong42.player.paddle = message.paddle;
  pong42.player.match_id = message.match_id;
}

/**
 * Handle the game_start message
 */
export function handleGameStart(component, webSocketMatch) {
  console.log("[GAME] Game start message received, preparing game...");

  // Set a small countdown before starting to ensure synchronization
  component.setState({
    startingGame: true,
    countdown: 3, // 3-second countdown before game actually starts
  });

  // Don't clean up websocket immediately to prevent race conditions
  // We'll let the GameComponent take over the websocket

  // Reset player waiting state
  pong42.player.waitingMatch = false;
  pong42.player.waitingMatchID = 0;

  // Use a timeout to ensure synchronization between players
  setTimeout(() => {
    console.log("[GAME] Starting game now!");

    // Now we can safely remove listeners before the GameComponent takes over
    webSocketMatch.removeAllListeners();

    // Create and render game component
    const game = new GameComponent(component.state.local);
    game.updatePlayerNames({
      player1: component.state.player1,
      player2: component.state.player2,
    });
    if (component.container) {
      // Check if component still mounted
      pong42.tabManager.notifyGameStarted(
        component.state.matchId,
        component.state.paddle
      );
      game.render(component.container);
    }
  }, 100); // 1-second delay helps synchronize both players

  return true;
}

/**
 * Clean up WebSocket connections and state
 */
export function cleanupGameWebSocket(component, webSocketMatch) {
  if (webSocketMatch) {
    webSocketMatch.removeAllListeners();
    component.webSocketMatch = null;
  }

  if (component.isConnecting) {
    component.isConnecting = false;
  }

  if (component.hasJoinedMatch) {
    component.hasJoinedMatch = false;
  }

  // Only nullify the global socket if we're not transitioning to a game
  if (!component.state?.startingGame) {
    pong42.player.socketMatch = null;
  }
}
