import Component from "../../../utils/Component.js";
import GameTournoiLobby from "./GameTournoiLobby.js";
import pong42 from "../../../services/pong42.js";
import { escapeHTML } from "../../../utils/EscapeHtml.js"

class GameTournoisMode extends Component {
  constructor() {
    super();
    this.state = {
      mode: null,
      tournaments: [],
      error: null,
      loading: false,
      initialized: false,
    };

    // Store event listener reference for cleanup
    this.tournamentLoadedListener = (data) => {
      this.setState({
        tournaments: data.tournaments || [],
        loading: false,
        initialized: true,
      });
    };

    this.playerInTournamentListener = (tournament) => {
      if (this.container) {
        this.goToLobby(tournament.id);
      }
    };

    // Stocker les fonctions de nettoyage des écouteurs
    this.cleanupFunctions = [];
  }

  goToLobby(tournamentId) {
    if (!this.container) return;
    const lobby = new GameTournoiLobby(tournamentId);
    lobby.render(this.container);
    this.destroy();
  }

  async createTournament(name) {
    try {
      this.setState({ loading: true, error: null });
      await pong42.player.tournament.createTournament(name);
    } catch (error) {
      this.setState({
        error: error.message,
        loading: false,
      });
      this.update();
    }
  }

  async getTournaments() {
    console.log("Fetching tournaments...");
    try {
      const response = await fetch(this.baseUrl, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tournaments");
      }

      const data = await response.json();
      // Check if player is already in a tournament
      if (data.current_tournament) {
        this.emit("playerInTournament", data.current_tournament);
        return data.current_tournament;
      }
      this.emit("tournamentsLoaded", {
        tournaments: data.tournaments || [],
      });
      return data;
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      this.emit("tournamentsLoaded", { tournaments: [] });
      throw error;
    }
  }

  async joinTournament(tournamentId) {
    try {
      this.setState({ loading: true, error: null });
      const response = await pong42.player.tournament.joinTournament(
        tournamentId
      );
      if (response.statusCode === 200 && this.container) {
        const lobby = new GameTournoiLobby(this.container);
        lobby.render(this.container);
        this.destroy();
      } else {
        this.setState({
          error: response.message,
          loading: false,
        });
      }
    } catch (error) {
      this.setState({
        error: error.message,
        loading: false,
      });
      this.update();
    }
  }

  handleModeSelection(mode) {
    console.log("Selected mode:", mode);
    this.state.mode = mode;
    if (mode === "newGame") {
      console.log("Create game");
    }
    if (mode === "joinGame") {
      console.log("Join game");
    }
    return;
  }

  handleJoinTournament(tournamentId) {
    this.joinTournament(tournamentId);
  }

  async afterRender() {
    // Ne charger les tournois qu'une seule fois au démarrage
    if (!this.state.initialized && !this.state.loading) {
      console.log("Loading tournaments... from afterRender from ");
      try {
        // Enregistrer les écouteurs et stocker les fonctions de nettoyage
        const cleanupTournamentsLoaded = pong42.player.tournament.on(
          "tournamentsLoaded",
          this.tournamentLoadedListener
        );
        const cleanupTournamentCreated = pong42.player.tournament.on(
          "tournamentCreatedOrJoinOrIn",
          this.playerInTournamentListener
        );
        this.cleanupFunctions.push(cleanupTournamentsLoaded);
        this.cleanupFunctions.push(cleanupTournamentCreated);
        this.setState({ loading: true });
        await pong42.player.tournament.getTournaments();
        if (pong42.player.tournament.tournamentId) this.goToLobby();
      } catch (error) {
        console.error("Failed to load tournaments:", error);
        this.setState({
          error: error.message,
          loading: false,
          initialized: true,
        });
      }
    }
    this.setupFormHandlers();
  }

  setupFormHandlers() {
    const input = document.getElementById("tournamentName");
    const createButton = document.getElementById("createTournamentBtn");
    const actualiserButton = document.getElementById("actualiserBtn");
    const buttons = document.querySelectorAll("[data-tournament-id]");

    if (!input || !createButton) return;
    const newInput = input.cloneNode(true);
    const newButton = createButton.cloneNode(true);

    input.parentNode.replaceChild(newInput, input);
    createButton.parentNode.replaceChild(newButton, createButton);

    this.attachEvent(newInput, "input", (e) => {
      const isValid = e.target.value.trim() !== "";
      e.target.classList.toggle("is-invalid", !isValid);
      e.target.classList.toggle("is-valid", isValid);
    });

    this.attachEvent(newButton, "click", async (e) => {
      e.preventDefault();
	  let InputValue = escapeHTML(newInput.value.trim());
      if (!InputValue) {
        newInput.classList.add("is-invalid");
        return;
      }
      try {
        this.setState({ loading: true, error: null });
        await this.createTournament(InputValue);
        newInput.value = "";
        newInput.classList.remove("is-valid");
      } catch (error) {
        this.setState({
          error: error.message,
          loading: false,
        });
      }
    });
    this.attachEvent(actualiserButton, "click", async (e) => {
      e.preventDefault();
      try {
        this.setState({ loading: true, error: null });
        await pong42.player.tournament.getTournaments();
      } catch (error) {
        console.error("Failed to load tournaments:", error);
        this.setState({
          error: error.message,
          loading: false,
          initialized: true,
        });
      }
    });
    buttons.forEach((button) => {
      this.attachEvent(button, "click", (e) => {
        e.preventDefault();
        const tournamentId = e.target.dataset.tournamentId;
        this.handleJoinTournament(tournamentId);
      });
    });
  }
  destroy() {
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];
    if (this.interval) {
      clearInterval(this.interval);
    }
    super.destroy();
  }

  template() {
    if (!this.state.mode) {
      const tournaments = this.state.tournaments || [];
      return `
        <section id="game-selection" class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-12 text-center mb-5">
                    <h2 class="text-info display-4">Mode Tournoi</h2>
                </div>
            </div>
            <div class="row justify-content-center align-items-stretch g-4">
                <!-- New Tournoi -->
                <div class="col-md-5">
                    <div class="card game-mode-card h-100 shadow-lg" data-mode="newGame">
                             <div class="card-body d-flex flex-column justify-content-between p-5">
                              <div class="text-center">
                                  <i class="fas fa-table-tennis fa-4x mb-4 text-primary"></i>
                                  <p class="card-text fs-5 my-4 lh-lg">Prêt à écraser la concurrence ? Lance un défi et montre à tes potes qui est le boss du pong !</p>
                              </div>
                              <div class="form-group">
                                  <input type="text"
                                        class="form-control form-control-lg"
                                        placeholder="Nom du tournoi *"
                                        required
                                        id="tournamentName"
                                        aria-describedby="tournamentNameHelp">
                                  <div class="invalid-feedback">
                                      Veuillez entrer un nom pour le tournoi
                                  </div>
                                  <small id="tournamentNameHelp" class="form-text text-muted">
                                      * Champ obligatoire
                                  </small>
                              </div>
                              <div class="text-center mt-3">
                                  <button class="btn btn-primary btn-lg px-5 py-3" id="createTournamentBtn">
                                      Créer un tournoi
                                  </button>
                              </div>
                          </div>
                    </div>
                </div>

                <!-- rejoindre tournoi -->
                <div class="col-md-6">
                    <div class="card game-mode-card h-100 shadow-lg" data-mode="joinGame">
                        <div class="card-body d-flex flex-column p-5">
                            <div class="text-center mb-4">
                                <i class="fas fa-star fa-4x mb-4 text-warning"></i>
                                <p class="card-text fs-5 lh-lg">Envie de te mesurer aux meilleurs ? Rejoins un tournoi et prouve que tu es le roi du pong !</p>
                            </div>
                                    <div class="table-responsive mt-auto">
                                      <table class="table table-hover align-middle">
                                          <tbody>
                                          ${
                                            this.state.loading
                                              ? `<tr><td colspan="2" class="text-center">
                                                    <div class="spinner-border text-primary" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                </td></tr>`
                                              : tournaments.length
                                              ? tournaments
                                                  .map(
                                                    (tournament) => `
                                                        <tr>
                                                            <td class="fs-5 py-4">${tournament.name}</td>
                                                            <td class="text-end">
                                                                <button class="btn btn-primary btn-lg px-4"
                                                                        data-tournament-id="${tournament.id}">
                                                                    Rejoindre
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    `
                                                  )
                                                  .join("")
                                              : `<tr>
                                                        <td colspan="2" class="text-center py-4">
                                                            Aucun tournoi disponible pour le moment
                                                        </td>
                                                    </tr>`
                                          }
                                          </tbody>
                                      </table>
                                      ${
                                        this.state.error
                                          ? `<div class="alert alert-danger mt-3" role="alert">
                                              ${this.state.error}
                                            </div>`
                                          : ""
                                      }
                                  </div>
                                  <div class="text-center mt-3">
                                  <button class="btn btn-primary btn-lg px-5 py-3" id="actualiserBtn">
                                      Actualiser
                                  </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        `;
    }
  }
}

export default GameTournoisMode;
