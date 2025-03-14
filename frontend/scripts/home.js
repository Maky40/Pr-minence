import auth from "../services/auth.js";

const updateUI = () => {
  try {
    const loggedSection = document.querySelector("#logged");
    const notLoggedSection = document.querySelector("#not-logged");
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
  // Wait for content to be loaded
  setTimeout(() => {
    updateUI();
    auth.addListener(() => updateUI());
  }, 0.1);
};

export { init };
