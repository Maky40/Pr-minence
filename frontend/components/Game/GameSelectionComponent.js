import Component from "../../utils/Component.js";
import GameSearchFriendComponent from "./GameSearchFriendComponents.js";

class GameSelectionComponent extends Component {
  constructor() {
    super();
    this.selectedMode = null;
    this.handleModeSelection = this.handleModeSelection.bind(this);
  }

  handleModeSelection(mode) {
    console.log("Selected mode:", mode);
    this.selectedMode = mode;
    const searchFriend = new GameSearchFriendComponent();
    searchFriend.render(this.container);
    // Ici vous pouvez ajouter la logique pour gérer la sélection du mode
  }

  afterRender() {
    document.querySelectorAll(".game-mode-card button").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const mode = e.target.closest(".game-mode-card").dataset.mode;
        this.handleModeSelection(mode);
      });
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
                    <div class="col-md-4">
                        <div class="card game-mode-card h-100" data-mode="classic">
                            <div class="card-body text-center">
                                <i class="fas fa-table-tennis fa-3x mb-3"></i>
                                <h3 class="card-title">Mode Duel</h3>
                                <p class="card-text">Lance le défi et montre à ton pote qu’il n’a aucune chance, même à distance !</p>
                                <button class="btn btn-primary mt-3">
                                    Select
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Mode Spécial -->
                    <div class="col-md-4">
                        <div class="card game-mode-card h-100" data-mode="special">
                            <div class="card-body text-center">
                                <i class="fas fa-star fa-3x mb-3"></i>
                                <h3 class="card-title"> Mode Tournoi</h3>
                                <p class="card-text">Affronte tout le monde dans un tournoi épique et fais claquer la victoire dans le Pong !</p>
                                <button class="btn btn-primary mt-3">
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
