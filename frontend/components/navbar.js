import Component from "../utils/Component.js";
import auth from "../services/auth.js";
import ModalAlert from "./modal.js";
import pong42 from "../services/pong42.js";
import { changePage } from "../utils/Page.js";

export default class Navbar extends Component {
  initListeners() {
    if (this.isInitialized) return;
    auth.addListener((event) => {
      if (event === "logout") {
        this.setState({ isAuthenticated: false });
        this.unsbuscribeToEvents();
        this.render(this.container);
      }
      if (event === "login") {
        this.setState({ isAuthenticated: true });
        this.subscribeToEvents();
      }
      pong42.player.addListener("gameStatusChanged", (isPlaying) => {
        this.setState({ isPlaying: isPlaying });
        if (isPlaying || pong42.player.isInGame || pong42.matchInOtherTab) {
          this.setupBeforeUnloadListener();
        }
        if (!isPlaying) {
          this.disableRefreshWarning();
        }
      });
      pong42.player.addListener("update", (player) => {
        this.setState({ player: player });
        this.render(this.container);
      });
      pong42.player.addListener("updateTournament", () => {
        this.setState({ tournament: null });
        this.render(this.container);
      });
      pong42.on("match_update", (data) => {
        this.render(this.container);
        console.log("Match update received:", data);
        if (data != "game_over_or_aborted" || pong42.currentPage === "game") {
          this.disableRefreshWarning();
          changePage("home");
          return;
        }
        this.setupBeforeUnloadListener();
      });
    });
  }
  get_status_display(status) {
    const statusMap = {
      PN: "En attente",
      BG: "Commencé",
      FN: "Fini",
      CA: "Annulé",
    };
    return statusMap[status] || "Unknown";
  }

  constructor() {
    super();
    this.state = {
      isAuthenticated: auth.authenticated,
      isPlaying: false,
    };
    this.initListeners();
    console.log("Navbar initialized");
  }
  setupBeforeUnloadListener() {
    const handleBeforeUnload = (event) => {
      if (this.state.isPlaying) {
        const message =
          "Attention! Quitter ou rafraîchir la page peut interrompre votre partie en cours.";
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    this.beforeUnloadHandler = handleBeforeUnload;
  }
  disableRefreshWarning() {
    if (this.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    }
  }
  unsbuscribeToEvents() {
    pong42.player.tournament.off("tournamentLeft");
    if (pong42.player.tournament) {
      console.log("Unsubscribing from tournament events");
      pong42.player.tournament.off("update", this.handleTournamentUpdate);
    }
    pong42.off("match_update");
  }
  subscribeToEvents() {
    pong42.player.tournament.on("tournamentLeft", (tournament) => {
      this.setState({ tournament: null });
      this.render(this.container);
    });
    if (pong42.player.tournament) {
      console.log("Subscribing to tournament events");
      pong42.player.tournament.on("update", this.handleTournamentUpdate);
    }
  }

  handleTournamentUpdate = (tournament) => {
    console.log("[NAVBARR] - Tournament update received:", tournament);
    this.setState({ tournament });
    console.log("[NAVBARR] - Tournament state updated:", this.state.tournament);

    if (this.container) {
      this.render(this.container);
    }
  };

  destroy() {
    this.disableRefreshWarning();
    this.unsbuscribeToEvents();
    this.beforeUnloadHandler = null;
    super.destroy();
  }

  template() {
    if (this.state.isPlaying) {
      return "";
    }

    return `
      <nav class="navbar navbar-expand-lg navbar-dark" style="background: linear-gradient(to right, #1a1a1a, #2d2d2d);">
        <div class="container-fluid">
          <a class="navbar-brand fw-bold" href="#">
            <span class="text-warning">PONG</span>
            <span class="text-info">42</span>
          </a>
          <button class="navbar-toggler border-info" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
              <li class="nav-item">
                <a class="nav-link px-3" href="#home">
                  <i class="fas fa-home me-2"></i>Accueil
                </a>
              </li>
               ${
                 this.state.isAuthenticated && !pong42.matchInOtherTab
                   ? `
      <li class="nav-item">
        <a class="nav-link px-3" href="#game">
          <i class="fas fa-gamepad text-danger me-2"></i>Jouer
        </a>
      </li>
      `
                   : ""
               }
              ${
                this.state.isAuthenticated
                  ? `
                  <li class="nav-item">
                    <a class="nav-link px-3" href="#chat">
                      <i class="fas fa-comments text-info me-2"></i>Chat
                    </a>
                  </li>
                  `
                  : ""
              }
              ${
                this.state.isAuthenticated && pong42.matchInOtherTab
                  ? `
                  <li class="nav-item">
                    <span class="nav-link px-3 text-warning">
                      <i class="fas fa-exclamation-triangle me-2"></i>Match en cours dans un autre onglet
                    </span>
                  </li>
                  `
                  : ""
              }
            </ul>
            <ul class="navbar-nav ms-auto">
              ${
                !this.state.isAuthenticated
                  ? `
                  <li class="nav-item">
                    <a class="nav-link btn btn-outline-info mx-2 px-4" href="#connexion">
                      <i class="fas fa-sign-in-alt me-2"></i>Connexion
                    </a>
                  </li>
                  <li class="nav-item">
                    <a class="nav-link btn btn-info mx-2 px-4" href="#signup">
                      <i class="fas fa-user-plus me-2"></i>S'inscrire
                    </a>
                  </li>
                `
                  : this.state.tournament &&
                    this.state.tournament.tournamentStatus !== "FN"
                  ? `
                  <li class="nav-item text-sm">
                    <a href="#game" class="btn ${
                      this.state.tournament.tournamentStatusDisplayClass
                    } mx-2 px-4" id="tournamentStatusBtn" data-locallink>
                      Tournament Status: ${
                        this.state.tournament
                          ? this.state.tournament.tournamentStatusDisplayName
                          : "N/A"
                      }
                    </a>
                  </li>
                  `
                  : ""
              }
              ${
                this.state.isAuthenticated
                  ? `
                  <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle d-flex align-items-center btn btn-outline-info mx-2 px-4" href="#" role="button"
                      data-bs-toggle="dropdown" aria-expanded="false">
                      <img src="${
                        pong42.player.avatar
                      }" alt="Avatar" class="rounded-circle me-2" width="35" height="35">
                      <span id="userPseudo">${pong42.player.username}</span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                      <li>
                        <a class="dropdown-item" href="#profile" data-locallink>
                          <i class="fas fa-user me-2"></i>Mon profil
                        </a>
                      </li>
                      ${
                        pong42.player.from_42
                          ? ""
                          : `
                      <li>
                        <a class="dropdown-item" href="#security" data-locallink>
                          <i class="fas fa-lock me-2"></i>sécurité
                        </a>
                      </li>
                      `
                      }
                      <li>
                        <hr class="dropdown-divider">
                      </li>
                      <li>
                        <button class="nav-link btn btn-outline-danger mx-2 px-4 custom-danger" id="logoutBtn">
                          <i class="fas fa-sign-out-alt me-2"></i>Déconnexion
                        </button>
                      </li>
                    </ul>
                  </li>
                  `
                  : ""
              }
            </ul>
          </div>
        </div>
      </nav>`;
  }

  attachEventListeners() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      const newLogoutBtn = logoutBtn.cloneNode(true);
      logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);

      // Now attach the event with the tracked method
      this.attachEvent(newLogoutBtn, "click", () => {
        const modal = new ModalAlert(
          "Êtes-vous sûr de vouloir vous déconnecter ?",
          "La raquette orpheline va pleurer... et la balle va disparaître dans le vide numérique.",
          "Quitter",
          "Annuler",
          "danger"
        );
        modal.render(document.body);
        modal.show();
      });
    }
  }
}
