import Component from "../../utils/Component.js";
import GameDuelMode from "./GameDuelMode.js";
import GameTournoiMode from "./Tournois/GameTournoiMode.js";
import pong42 from "../../services/pong42.js";

class GameSelectionComponent extends Component {
  constructor() {
    super();
    this.selectedMode = null;
    this.handleModeSelection = this.handleModeSelection.bind(this);
  }

  handleModeSelection(mode) {
    console.log("Selected mode:", mode);
    this.selectedMode = mode;

    if (mode === "duelMode") {
      const duelMode = new GameDuelMode();
      duelMode.render(this.container);
    }
    if (mode === "TournoiMode") {
      const gameTournoiMode = new GameTournoiMode();
      gameTournoiMode.render(this.container);
    }
    // Ici vous pouvez ajouter la logique pour gérer la sélection du mode
  }

  async afterRender() {
    await pong42.player.checkUnplayedAndActiveTournament();
    console.log("GameSelectionComponent", pong42.player);
    if (pong42.player.has_active_tournament) {
      this.handleModeSelection("TournoiMode");
    }

    document.getElementById("start-match")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleModeSelection("duelMode");
    });
    document.getElementById("cancel-match")?.addEventListener("click", (e) => {
      e.preventDefault();
      pong42.player.cancelMatch();
    });
    document
      .getElementById("start-tournament")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleModeSelection("TournoiMode");
      });
  }

  template() {
    return `
      <section id="game-selection" class="container mt-5">
        <div class="row justify-content-center">
          <div class="col-12 text-center mb-4">
            <h2 class="text-info">Select Game Mode</h2>
          </div>
        </div>
        <div class="row justify-content-center g-4">
          <!-- Mode Classique -->
          ${
            pong42.player.has_unplayed
              ? `<div class="col-md-4">
                  <div class="card game-mode-card h-100" data-mode="duelMode">
                    <div class="card-body text-center">
                      <i class="fas fa-table-tennis fa-3x mb-3"></i>
                      <h3 class="card-title">Mode Duel</h3>
                      <p class="card-text">${pong42.player.has_unplayed}Le défi est déjà lancé et tu es en plein match ! Mais si tu veux, tu peux l'annuler à tout moment grâce au bouton. Montre à ton pote qu'il n'a aucune chance, même à distance !</p>
                      <button class="btn btn-warning mt-3" id="cancel-match">
                        Annuler tous les matchs 
                      </button>
                    </div>
                  </div>
                </div>`
              : `<div class="col-md-4">
                  <div class="card game-mode-card h-100" data-mode="duelMode">
                    <div class="card-body text-center">
                      <i class="fas fa-table-tennis fa-3x mb-3"></i>
                      <h3 class="card-title">Mode Duel</h3>
                      <p class="card-text">Lance le défi et montre à ton pote qu'il n'a aucune chance, même à distance !</p>
                      <button class="btn btn-primary mt-3" id="start-match">
                        Select
                      </button>
                    </div>
                  </div>
                </div>`
          }
          <!-- Mode Spécial -->
          <div class="col-md-4">
            <div class="card game-mode-card h-100" data-mode="TournoiMode">
              <div class="card-body text-center">
                <i class="fas fa-star fa-3x mb-3"></i>
                <h3 class="card-title"> Mode Tournoi</h3>
                <p class="card-text">Affronte tout le monde dans un tournoi épique et fais claquer la victoire dans le Pong !</p>
                <button class="btn btn-primary mt-3" id="start-tournament">
                  Select
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
