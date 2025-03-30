const statusAffichage = (status) => {
  //convertissage des status en francais
  //    ('UPL', 'En attente des joueurs'),
  //    ('PLY', 'Terminé'),
  let div = `<div class="d-flex align-items-center justify-content-center text-dark" >`;
  switch (status) {
    case "UPL":
      return (div += `<i class="fas fa-clock fa-2x" ml-2></i><p class="m-3">En attente des joueurs</p></div>`);
    case "PLY":
      //return `<i class="fas fa-flag-checkered" aria-hidden="true" fa-4x></i> Terminé`;
      return (div += `<i class="fas fa-flag-checkered fa-2x"></i> <p class="m-3">Terminé</p></div>`);
    default:
      return "🐞 Erreur";
  }
};

const roundAffichage = (round) => {
  //convertissage des rounds en francais
  //    ('QU', 'Quart de finale'),
  //    ('HF', 'Demi-finale'),
  //    ('FN', 'Finale'),
  switch (round) {
    case "QU":
      return "Quart de finale";
    case "HF":
      return "Demi-finale";
    case "FN":
      return "Finale";
    default:
      return "Erreur";
  }
};

const isPlayerIdPresent = (playerId, playersList) => {
  if (!playersList || !Array.isArray(playersList) || !playerId) {
    return false;
  }
  return playersList.some(
    (item) =>
      item && item.player && parseInt(item.player.id) === parseInt(playerId)
  );
};
const getPlayerFromList = (playerId, playersList) => {
  if (parseInt(playersList[0].player.id) === parseInt(playerId)) {
    return playersList[0].player;
  }

  // Vérifier le deuxième joueur
  if (parseInt(playersList[1].player.id) === parseInt(playerId)) {
    return playersList[1].player;
  }
  // Si aucun joueur ne correspond, retourner null
  return null;
};
const getMatchInfo = (matchId, matches) => {
  return matches.find((match) => parseInt(match.id) === parseInt(matchId));
};

export {
  statusAffichage,
  roundAffichage,
  isPlayerIdPresent,
  getPlayerFromList,
  getMatchInfo,
};
