export const routes = {
  home: { template: "home.html" },
  score: { template: "score.html" },
  chat: { template: "chat.html", authRequired: true },
  connexion: { template: "connexion.html" },
  signup: { template: "signup.html" },
  game: { template: "game.html", authRequired: true },
  security: { template: "security.html", authRequired: true },
  profile: { template: "profile.html", authRequired: true },
  login42: { template: "login42.html" },
  twofactor: { template: "twofactor.html" },
};

export class Router {
  constructor(templateManager) {
    this.routes = routes;
    this.templateManager = templateManager;
  }

  init() {
    window.addEventListener("hashchange", () => this.handleRoute());
    this.handleRoute();
  }

  handleRoute() {
    const hash = window.location.hash.substring(1) || "home";
    const route = this.routes[hash];
    if (route) {
      this.templateManager.loadTemplate(route.template);
    } else {
      console.error("Route non trouvée :", hash);
      this.templateManager.loadTemplate("404.html");
    }
  }
}
