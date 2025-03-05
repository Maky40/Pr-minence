const statusAffichage = (status) => {
  //convertissage des status en francais
  //    ('UPL', 'En attente des joueurs'),
  //    ('PLY', 'Terminé'),
  switch (status) {
    case "UPL":
      return "En attente des joueurs";
    case "PLY":
      return "Terminé";
    default:
      return "Erreur";
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
  if (
    parseInt(playersList[0].player.id) === parseInt(playerId) ||
    parseInt(playersList[1].player.id) === parseInt(playerId)
  )
    return true;
  return false;
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
  return this.state.tournament.matches.find(
    (match) => parseInt(match.id) === parseInt(matchId)
  );
};

export {
  statusAffichage,
  roundAffichage,
  isPlayerIdPresent,
  getPlayerFromList,
  getMatchInfo,
};
