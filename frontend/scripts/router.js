export default class Router {
  constructor(routes, templateManager) {
    this.routes = routes;
    this.templateManager = templateManager;
    this.init();
  }

  init() {
    // Gère les changements d'URL
    window.addEventListener('hashchange', () => this.handleRoute());
    // Gère la route initiale au chargement de la page
    this.handleRoute();
  }

  handleRoute() {
    const hash = window.location.hash.substring(1) || 'home'; // Par défaut, 'home'
    const route = this.routes[hash];

    if (route) {
      this.templateManager.loadTemplate(route.template);
    } else {
      console.error('Route non trouvée :', hash);
      this.templateManager.loadTemplate('404.html'); // Gestion des erreurs 404
    }
  }
}