import ModalGame from "../components/modal_tournament.js";

const msgSend = (title, textMsg, confirBtn, undoBtn, type, callbackOkFt) => {
  const modalGame = new ModalGame(
    title,
    textMsg,
    confirBtn,
    undoBtn,
    type,
    callbackOkFt
  );
  modalGame.render(document.body);
  modalGame.show();
};

const msgNewMatch = (callbackOkFt) => {
  msgSend(
    "Nouveau match pour le tournois",
    "Vous avez un nouveau match !",
    "GOOOOO !",
    "Annuler",
    "info",
    () => {
      callbackOkFt();
    }
  );
};

const msgLose = (callbackOkFt) => {
  msgSend(
    "Match perdu",
    "Le tournoi est fini pour vous ! merci d'avoir joué !",
    "Snif...",
    "Annuler",
    "danger",
    () => {
      callbackOkFt();
    }
  );
};

const msgWin = (callbackOkFt) => {
  msgSend(
    "Match gagné",
    "Vous avez gagné le tournoi !",
    "YES !",
    "Annuler",
    "success",
    () => {
      callbackOkFt();
    }
  );
};

const handleMatchResult = (
  myNextMatch,
  currentPlayerMatchInfo,
  tournamentService
) => {
  if (!myNextMatch || myNextMatch.state !== "PLY" || !currentPlayerMatchInfo) {
    return; // Conditions communes non remplies
  }

  // Cas 1: Match perdu
  if (
    !currentPlayerMatchInfo.is_winner &&
    tournamentService.iDendMessageShowed !== myNextMatch.id
  ) {
    tournamentService.stopStatusCheckInterval();
    tournamentService.iDendMessageShowed = myNextMatch.id;
    msgLose(() => {});
    return true;
  }

  // Cas 2: Match gagné + finale
  if (
    myNextMatch.round === "FN" &&
    currentPlayerMatchInfo.is_winner &&
    !tournamentService.iDendMessageShowed
  ) {
    tournamentService.stopStatusCheckInterval();
    tournamentService.iDendMessageShowed = myNextMatch.id;
    msgWin(() => {});
    return true;
  }

  return false;
};

export { msgNewMatch, handleMatchResult };
