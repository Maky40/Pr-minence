import { Router } from "../scripts/router.js";
import TemplateManager from "../scripts/templateManager.js";

export const changePage = (hash) => {
  window.location.hash = hash; // Change l'URL
  const templateManager = new TemplateManager(); // Crée un nouveau gestionnaire de template
  const router = new Router(templateManager); // Crée un nouveau routeur
  router.handleRoute(); // Gère la nouvelle route
};

window.changePage = changePage;
