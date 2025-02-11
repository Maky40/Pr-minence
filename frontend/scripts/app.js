import Navbar from "../components/navbar.js";
import { changePage } from "../utils/Page.js";
import { Router } from "./router.js";
import TemplateManager from "./templateManager.js";
import WebSocketAPI from "../services/websocket.js";
import pong42 from "../services/pong42.js";

const webSocketGame = new WebSocketAPI("wss://localhost/pong/ws/pong/");

webSocketGame.addMessageListener("message", (data) => {
  console.log(data);
});

const navbar = new Navbar();
const content = document.getElementById("content");
const templateManager = new TemplateManager(content);
const router = new Router(templateManager);

const loadComponent = async (componentName) =>
  (document.getElementById(`${componentName}-placeholder`).innerHTML =
    await loadComponentTemplate(componentName));
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

document.addEventListener("DOMContentLoaded", loadComponent("footer"));

document.addEventListener("DOMContentLoaded", () => {
  navbar.render(document.getElementById("navbar-placeholder"));
});

document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-locallink]");
  if (link) {
    e.preventDefault();
    const hash = link.getAttribute("href");
    changePage(hash);
  }
});

router.init();
