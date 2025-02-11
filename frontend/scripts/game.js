import GameSelectionComponent from "../components/Game/GameSelectionComponent.js";

const init = () => {
  const container = document.getElementById("content");

  // S'assurer que le container est vide
  container.innerHTML = "";

  // Créer et rendre la sélection du mode
  const gameSelection = new GameSelectionComponent();
  gameSelection.render(container);
};

export { init };
