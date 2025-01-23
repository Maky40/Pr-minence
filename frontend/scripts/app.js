import TemplateManager from './templateManager.js';
import Router from './router.js';

// Sélectionne le conteneur pour le contenu dynamique
const content = document.getElementById('content');

// Initialise le gestionnaire de templates
const templateManager = new TemplateManager(content);

// Définit les routes
const routes = {
  home: { template: 'home.html' },
  score: { template: 'score.html' },
  chat: { template: 'chatBox.html' },
  connexion: { template: 'connexion.html' },
  signup: { template: 'signup.html' },
  game: { template: 'game.html' },
};

// Initialise le routeur
const router = new Router(routes, templateManager);

async function loadNavbar() {
    try {
        const response = await fetch('/components/navbar.html');
        const html = await response.text();
        document.getElementById('nav-placeholder').innerHTML = html;
    } catch (error) {
        console.error('Erreur lors du chargement de la navbar:', error);
    }
}

window.changePage = (hash) => {
  window.location.hash = hash; // Change l'URL
  router.handleRoute(); // Gère la nouvelle route
};

document.addEventListener('DOMContentLoaded', loadNavbar);

//fonction qui surcharge les liens pour ne pas recharger la page
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-locallink]');
  if (link) {
      e.preventDefault();
      const hash = link.getAttribute('href');
      changePage(hash);
  }
});