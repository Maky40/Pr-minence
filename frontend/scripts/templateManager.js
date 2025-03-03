import pong42 from "/services/pong42.js";
import auth from "../services/auth.js";
import { routes } from "./router.js";
import { changePage } from "../utils/Page.js";

export default class TemplateManager {
  constructor(contentElement = null) {
    if (!contentElement)
      this.contentElement = document.getElementById("content");
    else this.contentElement = contentElement;
    this.routes = routes;
    this.loadedScripts = new Set();
    this.activeWebSockets = [];
  }

  closeAllWebSockets() {
    this.activeWebSockets.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    });
    this.activeWebSockets = []; // Vide la liste après fermeture
  }

  cleanup() {
    // Supprimer tous les scripts existants
    const scripts = this.contentElement.querySelectorAll("script");
    Array.from(scripts).forEach((script) => script.remove());

    // Réinitialiser la liste des scripts chargés
    this.loadedScripts.clear();

    // Supprimer toutes les sockets
    this.closeAllWebSockets();
  }

  async loadTemplate(templateFile) {
    try {
      this.cleanup();
      const templateName = templateFile.replace(".html", "");
      if (!auth.authenticated) {
        await auth.initFromAPI();
      }
      if (this.routes[templateName]?.authRequired ?? false) {
        if (!auth.authenticated) {
          if (pong42.currentPage !== "connexion")
            pong42.setCurrentPage(templateName);
          changePage("connexion");
          return;
        }
      }
      const response = await fetch(`pages/${templateFile}`);
      if (!response.ok) throw new Error("Template non trouvé");

      const html = await response.text();
      const temp = document.createElement("div");
      temp.innerHTML = html;

      // On ne récupère plus les scripts inline
      this.contentElement.innerHTML = "";
      this.contentElement.textContent = "";
      this.contentElement.className = "";
      this.contentElement.classList.add("container");

      // Copier uniquement le contenu HTML sans les scripts
      temp.childNodes.forEach((node) => {
        if (node.nodeName !== "SCRIPT") {
          this.contentElement.appendChild(node.cloneNode(true));
        }
      });

      if (templateName !== "connexion" && templateName !== "signup") {
        pong42.setCurrentPage(templateName);
      }

      const modulePath = `/scripts/${templateName}.js`;
      try {
        const jsResponse = await fetch(modulePath);
        if (jsResponse.ok) {
          const module = await import(modulePath);
          if (
            module.init &&
            typeof module.init === "function" &&
            !this.loadedScripts.has(modulePath)
          ) {
            console.log(`Initialisation du module ${templateName}`);
            await module.init();
            this.loadedScripts.add(modulePath);
          }
        }
      } catch (error) {
        console.error(
          `Erreur lors du chargement du module ${templateName}:`,
          error
        );
      }
    } catch (error) {
      console.error("Erreur lors du chargement du template:", error);
      this.contentElement.innerHTML =
        "<p>Erreur lors du chargement de la page.</p>";
    }
  }
  addWebSocket(socket) {
    this.activeWebSockets.push(socket);
  }
}
