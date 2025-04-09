import Component from "../../utils/Component.js";
import DuelModeHost from "../DuelMode/DuelModeHost.js";
import DuelModeGuest from "../DuelMode/DuelModeGuest.js";
import pong42 from "/services/pong42.js";
import { changePage } from "../../utils/Page.js";
import { escapeHTML } from "../../utils/EscapeHtml.js";
import api from "../../services/api2.js";
import Toast from "../toast.js";

class GameDuelMode extends Component {
  constructor() {
    super();
    this.state = {
      mode: null,
    };
    console.log("GameDuelMode initialized");
    console.log(pong42);
  }

  async handleModeSelection(mode) {
    this.state.mode = mode;
    if (mode === "newGame") {
      const duelModeHost = new DuelModeHost();
      duelModeHost.render(this.container);
      this.destroy();
    }
    if (mode === "joinGame") {
      let match_id = document.getElementById("matchCode").value;
      match_id = escapeHTML(match_id);
      const isValidMatch = await this.verification(match_id);

      if (isValidMatch) {
        const duelModeGuest = new DuelModeGuest(match_id);
        duelModeGuest.render(this.container);
        this.destroy();
      }
    }
  }

  async verification(match_id) {
    const matchIdNum = Number(match_id);
    try {
      if (Number.isInteger(matchIdNum) && matchIdNum > 0) {
        const response = await api.apiFetch(
          "pong/match-exists/" + matchIdNum + "/",
          true,
          "GET"
        );
        if (response.data.state_code === "UPL") return true;
        else
          throw new Error("Aucun match en attente ne correspond à ce numéro");
      } else throw new Error("Sélectionner un nombre entier > 0");
    } catch (error) {
      const toast = new Toast("Error", error, "error");
      toast.show();
      return false;
    }
  }
  async afterRender() {
    pong42.player.checkUnplayedAndActiveTournament();

    // Si l'utilisateur a un tournoi en attente ou actif, on le redirige
    if (pong42.player.has_unplayed || pong42.player.has_active_tournament) {
      changePage("game");
      this.destroy();
    }

    // Attacher l'événement aux boutons de sélection du mode de jeu
    document.querySelectorAll(".game-mode-card button").forEach((button) => {
      this.attachEvent(button, "click", async (e) => {
        // Utilisation de async ici
        e.preventDefault();
        const mode = e.target.closest(".game-mode-card").dataset.mode;
        await this.handleModeSelection(mode);
      });
    });
  }

  template() {
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
                                <input type="text" class="form-control" placeholder="Code du match" id="matchCode">
                                <button class="btn btn-primary mt-3">
                                    Rejoindre le match
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
  }
}

export default GameDuelMode;
