import auth from "../services/auth.js";

const updateUI = () => {
  try {
    const loggedSection = document.querySelector("#logged");
    const notLoggedSection = document.querySelector("#not-logged");
    console.log(
      "Updating UI based on authentication state:",
      auth.authenticated
    );
    if (!loggedSection || !notLoggedSection) {
      return;
    }

    if (auth.authenticated) {
      notLoggedSection.classList.remove("d-none");
      loggedSection.classList.add("d-none");
    } else {
      loggedSection.classList.remove("d-none");
      notLoggedSection.classList.add("d-none");
    }
  } catch (error) {
    console.error("Error updating home UI:", error);
  }
};

const init = () => {
  // Mettre à jour l'UI immédiatement
  updateUI();

  // Écouter les événements d'authentification
  auth.addListener(updateUI); // CORRIGÉ: Passe la référence à la fonction
};

export { init };
