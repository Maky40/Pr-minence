import Component from "../../utils/Component.js";
import pong42 from "../../services/pong42.js";

class GameDuelMode extends Component {
  constructor(container) {
    super();
    this.state = {
      mode: null,
      container: container,
    };
  }

  handleModeSelection(mode) {
    console.log("Selected mode:", mode);
    this.state.mode = mode;
    this.render(this.container);
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
    if (!this.state.mode)
      return `
        <section id="game-selection" class="container mt-5">
                <div class="row justify-content-center">
                    <div class="col-12 text-center mb-4">
                        <h2 class="text-info">Mode Duel</h2>
                    </div>
                </div>
                <div class="row justify-content-center g-4" style="min-width: 400px;">
                    <!-- Mode Classique -->
                    <div class="col-md-4 h-100" style="max-width: 18rem;">
                        <div class="card game-mode-card" data-mode="newGame">
                            <div class="card-body text-center">
                                <i class="fas fa-table-tennis fa-3x mb-3"></i>
                                <p class="card-text">Lance le défi et montre à ton pote qu’il n’a aucune chance, même à distance !</p>
                                <button class="btn btn-primary mt-3">
                                    Creer un nouveau match
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Mode Spécial -->
                    <div class="col-md-4 h-100" style="max-width: 18rem;">
                        <div class="card game-mode-card" data-mode="joinGame" style="min-height: 200px;">
                            <div class="card-body text-center">
                                <i class="fas fa-star fa-3x mb-3"></i>
                                <p class="card-text">Ton pote a déjà lancé le défi ! Viens le défier et lui faire regretter cet affront !!</p>
                                <input type="text" class="form-control" placeholder="Code du match">
                                <button class="btn btn-primary mt-3">
                                    Rejoindre le match
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    if (this.state.mode === "newGame") {
      return `
        <section id="game" class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-8 text-center">
                    <h1 class="mt-4">Le Jeu</h1>
                </div>
            </div>
        </section>
    `;
    }
    if (this.state.mode === "joinGame") {
      return `
          <section id="game" class="container mt-5">
              <div class="row justify-content-center">
                  <div class="col-md-8 text-center">
                      <h1 class="mt-4">Le Jeu</h1>
                  </div>
              </div>
        </section>
      `;
    }
  }
}

export default GameDuelMode;
