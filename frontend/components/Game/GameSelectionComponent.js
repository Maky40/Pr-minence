import Component from "../../utils/Component.js";
import GameDuelMode from "./GameDuelMode.js";
import GameTournoiMode from "./Tournois/GameTournoiMode.js";
import GameLocal from "./localmode/GameLocal.js";
import pong42 from "../../services/pong42.js";
import { changePage } from "../../utils/Page.js";

class GameSelectionComponent extends Component {
  constructor() {
    super();
    console.log("[DEBUG] GameSelectionComponent constructor");
    this.selectedMode = null;
    this.handleModeSelection = this.handleModeSelection.bind(this);
    this.state = {
      loading: true,
      error: null,
      initialized: false,
    };
  }

  handleModeSelection(mode) {
    this.selectedMode = mode;

    // Nettoyage avant de changer de mode
    this.detachAllEvents();

    let component = null;

    try {
      switch (mode) {
        case "duelMode":
          component = new GameDuelMode();
          break;
        case "tournamentMode":
          component = new GameTournoiMode();
          break;
        case "localMode":
          component = new GameLocal();
          break;
        default:
          console.error(`Mode inconnu: ${mode}`);
          return;
      }

      if (component && this.container) {
        // Rendre le nouveau composant
        component.render(this.container);

        // Une fois le nouveau composant rendu, détruire celui-ci
        this.destroy();
      }
    } catch (error) {
      console.error(`Erreur lors du changement de mode vers ${mode}:`, error);
      this.state.error = `Impossible de charger le mode ${mode}`;
      if (this.container) super.render(this.container);
    }
  }
  /**
   * Attache les écouteurs d'événements aux boutons
   */
  attachEventListeners() {
    try {
      // Mode Duel
      const startMatchBtn = document.getElementById("start-match");
      if (startMatchBtn) {
        this.attachEvent(startMatchBtn, "click", (e) => {
          e.preventDefault();
          this.handleModeSelection("duelMode");
        });
      }

      // Annulation de match
      const cancelMatchBtn = document.getElementById("cancel-match");
      if (cancelMatchBtn) {
        this.attachEvent(cancelMatchBtn, "click", (e) => {
          e.preventDefault();
          pong42.player.cancelMatch();
          this.state.loading = true;
          this.render(this.container);
        });
      }

      // Mode Local
      const startLocalBtn = document.getElementById("start-locaca");
      if (startLocalBtn) {
        this.attachEvent(startLocalBtn, "click", (e) => {
          e.preventDefault();
          this.handleModeSelection("localMode");
        });
      }

      // Mode Tournoi
      const startTournamentBtn = document.getElementById("start-tournament");
      if (startTournamentBtn) {
        this.attachEvent(startTournamentBtn, "click", (e) => {
          e.preventDefault();
          const button = e.target;
          button.disabled = true;
          button.textContent = "Chargement...";
          button.classList.add("disabled");
          this.handleModeSelection("tournamentMode");
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'attachement des événements:", error);
    }
  }

  /**
   * Exécuté après le rendu du composant
   */
  afterRender() {
    this.attachEventListeners();
  }

  /**
   * Rendu du composant
   * @param {HTMLElement} container - Élément conteneur
   */
  async render(container) {
    try {
      this.container = container;

      // Afficher un chargement
      this.state.loading = true;
      super.render(container);

      // Vérifier les tournois actifs
      await pong42.player.checkUnplayedAndActiveTournament();

      // Redirection automatique vers le tournoi si actif
      if (pong42.player.has_active_tournament) {
        console.log("Tournoi actif détecté, redirection...");
        this.handleModeSelection("tournamentMode");
        return;
      }

      this.state.loading = false;
      super.render(container);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      this.state.loading = false;
      this.state.error = "Impossible de charger les données de jeu";
      super.render(container);
    }
  }

  template() {
    if (pong42.matchInOtherTab) {
      return `
        <div class="container mt-5">
          <div class="card alert alert-danger card-body">
            <h4>Erreur</h4>
            <p>Une partie est déjà en cours dans un autre onglet</p>
            <button class="btn btn-primary mt-3" onclick="changePage('home')">Retour à l'accueil</button>
          </div>
        </div>
      `;
    }

    if (this.state.loading) {
      return `
        <div class="container mt-5">
          <div class="text-center">
            <div class="card">
              <div class="card-body">
                <h3>Chargement...</h3>
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Chargement...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (this.state.error) {
      return `
        <div class="container mt-5">
          <div class="alert alert-danger">
            <h4>Erreur</h4>
            <p>${this.state.error}</p>
            <button class="btn btn-primary mt-3" onclick="changePage('home')">Retour à l'accueil</button>
          </div>
        </div>
      `;
    }

    return `
      <section id="game-selection" class="container mt-5">
        <div class="row justify-content-center">
          <div class="col-12 text-center mb-4">
            <h2 class="text-info">Select Game Mode</h2>
          </div>
        </div>
        <div class="row justify-content-center g-4">
          <!-- Mode Duel -->
          <div class="col-md-4">
            <div class="card game-mode-card h-100">
              <div class="card-body text-center">
                <i class="fas fa-table-tennis fa-3x mb-3 text-primary"></i>
                <h3 class="card-title">Mode Duel</h3>
                <p class="card-text">Lance le défi et montre à ton pote qu'il n'a aucune chance, même à distance !</p>
                <button class="btn btn-primary mt-3" id="start-match">
                  <i class="fas fa-gamepad me-2"></i>Lancer un duel
                </button>
              </div>
            </div>
          </div>
          <!-- Mode Tournoi -->
          <div class="col-md-4">
            <div class="card game-mode-card h-100">
              <div class="card-body text-center">
                <i class="fas fa-trophy fa-3x mb-3 text-warning"></i>
                <h3 class="card-title">Mode Tournoi</h3>
                <p class="card-text">Affronte tout le monde dans un tournoi épique et fais claquer la victoire dans le Pong !</p>
                <button class="btn btn-primary mt-3" id="start-tournament">
                  <i class="fas fa-star me-2"></i>Participer
                </button>
              </div>
            </div>
          </div>
          <!-- Mode Local -->
          <div class="col-md-4">
            <div class="card game-mode-card h-100">
              <div class="card-body text-center">
                <i class="fas fa-users fa-3x mb-3 text-success"></i>
                <h3 class="card-title">Mode Local</h3>
                <p class="card-text">Affronte ton copain IRL, ou joue tout seul pour t'entraîner</p>
                <button class="btn btn-primary mt-3" id="start-locaca">
                  <i class="fas fa-play-circle me-2"></i>Jouer
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }
}
export default GameSelectionComponent;
