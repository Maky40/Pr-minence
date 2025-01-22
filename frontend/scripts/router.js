export default class Router {
  constructor(routes, templateManager) {
    this.routes = routes;
    this.templateManager = templateManager;
    this.init();
  }

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }

  handleRoute() {
    const hash = window.location.hash.substring(1) || 'home';
    const route = this.routes[hash];

    if (route) {
      this.templateManager.loadTemplate(route.template);
    } else {
      console.error('Route non trouvée :', hash);
      this.templateManager.loadTemplate('404.html');
    }
  }
}