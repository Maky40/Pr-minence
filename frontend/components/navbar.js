import Component from "../utils/Component.js";
import auth from "../services/auth.js";
import ModalAlert from "./modal.js";
import pong42 from "../services/pong42.js";

export default class Navbar extends Component {
  initListeners() {
    auth.addListener((event) => {
      if (event === "login" || event === "logout")
        if (auth.authenticated) {
          this.setState({ isAuthenticated: true });
        } else {
          this.setState({ isAuthenticated: false });
        }
    });
    pong42.player.addListener("update", (player) => {
      this.setState({ player: player });
      this.render(this.container);
    });
    pong42.player.tournament.on("update", (tournament) => {
      this.setState({ tournament: tournament });
      this.render(this.container);
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
    };
    this.initListeners();
  }

  template() {
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
              <li class="nav-item">
                <a class="nav-link px-3" href="#score">
                  <i class="fas fa-trophy text-warning me-2"></i>Légendes
                </a>
              </li>
              ${
                this.state.isAuthenticated
                  ? `
                  <li class="nav-item">
                    <a class="nav-link px-3" href="#game">
                      <i class="fas fa-gamepad text-danger me-2"></i>Jouer
                    </a>
                  </li>
                  <li class="nav-item">
                    <a class="nav-link px-3" href="#chat">
                      <i class="fas fa-comments text-info me-2"></i>Chat
                    </a>
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
                    this.state.tournament.tournamentStatus
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
      logoutBtn.addEventListener("click", () => {
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
