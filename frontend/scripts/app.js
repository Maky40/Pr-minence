import TemplateManager from "./templateManager.js";
import Router from "./router.js";

//class component
class Component {
  render(container) {
    container.innerHTML = this.template();
  }
}

// Sélectionne le conteneur pour le contenu dynamique
const content = document.getElementById("content");

// Initialise le gestionnaire de templates
const templateManager = new TemplateManager(content);

// Définit les routes
const routes = {
  home: { template: "home.html" },
  score: { template: "score.html" },
  chat: { template: "chatBox.html" },
  connexion: { template: "connexion.html" },
  signup: { template: "signup.html" },
  game: { template: "game.html" },
  resetPassword: { template: "resetPassword.html" },
  profile: { template: "profile.html" },
};

// Initialise le routeur
const router = new Router(routes, templateManager);

const loadComponentTemplate = async (componentName) => {
  try {
    const response = await fetch(`/components/${componentName}.html`);
    return await response.text();
  } catch (error) {
    console.error(
      `Erreur lors du chargement du composant ${componentName}:`,
      error
    );
  }
};

const loadComponent = async (componentName) =>
  (document.getElementById(`${componentName}-placeholder`).innerHTML =
    await loadComponentTemplate(componentName));

window.changePage = (hash) => {
  window.location.hash = hash; // Change l'URL
  router.handleRoute(); // Gère la nouvelle route
};

document.addEventListener("DOMContentLoaded", loadComponent("footer"));
document.addEventListener("DOMContentLoaded", loadComponent("navbar"));

//fonction qui surcharge les liens pour ne pas recharger la page
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-locallink]");
  if (link) {
    e.preventDefault();
    const hash = link.getAttribute("href");
    changePage(hash);
  }
});
