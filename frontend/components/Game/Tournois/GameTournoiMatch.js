import { statusAffichage, isPlayerIdPresent } from "./GameTournoiLib.js";
import pong42 from "/services/pong42.js";

/**
 * Affiche les badges des joueurs avec leurs informations
 */
const playerDisplayBadge = (
  currentPlayer,
  otherPlayer,
  match,
  align = "start"
) => {
  if (!currentPlayer || !currentPlayer.player || !otherPlayer) {
    console.error("Données de joueur incomplètes:", {
      currentPlayer,
      otherPlayer,
    });
    return `<div class="alert alert-danger">Données du joueur manquantes</div>`;
  }

  // Utiliser des valeurs par défaut pour score
  const currentScore = currentPlayer.score || 0;
  const otherScore = otherPlayer.score || 0;
  // Déterminer le statut visuel du joueur
  let statusColor =
    match.state !== "PLY"
      ? "dark"
      : currentScore > otherScore
      ? "success"
      : "danger";

  // Badge de victoire pour les matchs terminés
  const victoryBadge =
    currentScore > otherScore && match.state === "PLY"
      ? '<i class="fas fa-trophy text-warning fa-lg" aria-label="Vainqueur"></i>'
      : "";

  // Classes d'alignement
  const textAlign = align === "start" ? "text-start" : "text-end";
  const flexAlign = align === "start" ? "" : "flex-row-reverse";

  return `
    <div class="player-card ${textAlign}">
      <div class="d-flex align-items-center ${flexAlign} gap-2 mb-1">
        <img src="${currentPlayer.player.avatar}" 
             alt="${currentPlayer.player.username}" 
             class="rounded-circle border border-3 border-${statusColor}" 
             width="42" height="42" />
        <div>
          <h6 class="fw-bold mb-0 lh-1">${currentPlayer.player.username}</h6>
          ${
            match.state === "PLY"
              ? `<span class="badge bg-${statusColor} mt-1 p-2" style="min-width: 200px;">
              ${victoryBadge} ${currentPlayer.score} points
            </span>`
              : ""
          }
        </div>
      </div>
    </div>`;
};

/**
 * Affiche les matchs filtrés par état et round
 */
const renderMatchesByState = (
  matches,
  state,
  currentRound,
  joinMatchCallback
) => {
  // Configuration par état
  const config = {
    UPL: {
      title: "Matchs en cours",
      bgClass: "primary",
      cardClass: "primary",
      icon: "gamepad",
      emptyMessage: "Aucun match en cours pour ce round",
    },
    PLY: {
      title: "Matchs terminés",
      bgClass: "success",
      cardClass: "secondary",
      icon: "flag-checkered",
      emptyMessage: "Aucun match terminé pour ce round",
    },
  };

  // Filtrer les matchs
  const filteredMatches =
    matches?.filter(
      (match) => match.state === state && match.round === currentRound
    ) || [];

  // Retourner vide si aucun match
  if (filteredMatches.length === 0) {
    return "";
  }

  return `
    <div class="card ">
      <div class="card-header bg-${config[state].bgClass} bg-opacity-10 py-2">
        <h4 class="mb-0 d-flex align-items-center justify-content-center">
          <i class="fas fa-${config[state].icon} me-2 text-${
    config[state].bgClass
  }"></i>
          ${statusAffichage(state)}
        </h4>
      </div>
      
      <div class="card-body px-1 py-2">
        ${filteredMatches
          .map(
            (match) => `
          <div class="match-card border-bottom pb-2 mb-2">           
            <!-- Contenu du match avec joueurs -->
            <div class="position-relative">
              <div class="row align-items-center g-0 px-2">
                <!-- Joueur 1 -->
                <div class="col-5">
                  ${playerDisplayBadge(
                    match.players[0],
                    match.players[1],
                    match,
                    "start"
                  )}
                </div>
                
                <!-- Éclair central (pour matchs en cours) -->
                <div class="col-2 text-center">
                  ${
                    state === "UPL"
                      ? `<div class="d-flex justify-content-center">
                      <span class="badge rounded-pill bg-dark p-2">
                        <i class="fas fa-bolt text-warning fa-beat-fade"></i>
                      </span>
                    </div>`
                      : ``
                  }
                </div>
                
                <!-- Joueur 2 -->
                <div class="col-5">
                  ${playerDisplayBadge(
                    match.players[1],
                    match.players[0],
                    match,
                    "end"
                  )}
                </div>
              </div>
            </div>
            
            <!-- Bouton pour rejoindre (si nécessaire) -->
            ${
              isPlayerIdPresent(pong42.player.id, match.players) &&
              state === "UPL"
                ? `<div class="text-center mt-3">
                <button class="btn btn-success px-4 py-2 btn-join-match" 
                        data-match-id="${match.id}"
                        id="joinMatchButton"
                        >
                  <i class="fas fa-gamepad me-2 fa-2x"></i>Rejoindre le match
                </button>
              </div>`
                : ""
            }
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
};

export { renderMatchesByState };
