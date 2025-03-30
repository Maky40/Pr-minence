import Component from "../../../utils/Component.js";
import GameTournoiLobby from "./GameTournoiLobby.js";
import pong42 from "../../../services/pong42.js";
import { escapeHTML } from "../../../utils/EscapeHtml.js";

class GameTournoisMode extends Component {
  constructor() {
    super();
    this.state = {
      mode: null,
      tournaments: [],
      error: null,
      loading: false,
      initialized: false,
      tournament: null,
    };

    // Bind all handler methods to preserve "this" context
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleCreateTournament = this.handleCreateTournament.bind(this);
    this.handleRefreshTournaments = this.handleRefreshTournaments.bind(this);
    this.handleJoinTournament = this.handleJoinTournament.bind(this);

    // Define event listeners with proper bindings
    this.tournamentLoadedListener = (data) => {
      this.setState({
        tournaments: data.tournaments || [],
        loading: false,
        initialized: true,
      });

      if (data.current_tournament) {
        this.setState({ tournament: data.current_tournament });
        this.goToLobby(data.current_tournament.id);
      }
    };

    this.playerInTournamentListener = (tournament) => {
      if (this.container) {
        this.goToLobby(tournament.id);
      }
    };

    // Store cleanup functions
    this.cleanupFunctions = [];
  }

  // Clean handler for input validation
  handleInputChange(e) {
    const isValid = e.target.value.trim() !== "";
    e.target.classList.toggle("is-invalid", !isValid);
    e.target.classList.toggle("is-valid", isValid);
  }

  // Clean handler for creating tournaments
  async handleCreateTournament(e) {
    e.preventDefault();
    const inputElement = document.getElementById("tournamentName");
    if (!inputElement) return;

    console.log("Creating tournament...");
    const inputValue = escapeHTML(inputElement.value.trim());

    if (!inputValue) {
      inputElement.classList.add("is-invalid");
      return;
    }

    try {
      this.setState({ loading: true, error: null });
      await this.createTournament(inputValue);
      inputElement.value = "";
      inputElement.classList.remove("is-valid");
    } catch (error) {
      this.setState({
        error: error.message,
        loading: false,
      });
    }
  }

  // Clean handler for refreshing tournaments
  async handleRefreshTournaments(e) {
    e.preventDefault();
    try {
      this.setState({ loading: true, error: null });
      await pong42.player.tournament.getTournaments();
      console.log(this.state.tournaments);
      this.showNoTournament();
    } catch (error) {
      console.error("Failed to load tournaments:", error);
      this.setState({
        error: error.message,
        loading: false,
      });
    }
  }

  // Clean handler for joining tournaments
  handleJoinTournament(e) {
    e.preventDefault();
    const tournamentId = e.currentTarget.dataset.tournamentId;
    if (tournamentId) {
      this.joinTournament(tournamentId);
    } else {
      console.error("No tournament ID found on button");
    }
  }

  goToLobby(tournamentId) {
    if (!this.container) return;
    if (!tournamentId) {
      console.error("Tournament ID is null or undefined");
      return;
    }
    const lobby = new GameTournoiLobby(tournamentId);
    lobby.render(this.container);
    this.destroy();
  }

  async createTournament(name) {
    try {
      await pong42.player.tournament.createTournament(name);
    } catch (error) {
      this.setState({
        error: error.message,
        loading: false,
      });
      this.update();
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
        const lobby = new GameTournoiLobby(tournamentId);
        lobby.render(this.container);
        this.destroy();
      } else {
        this.setState({
          error: response.message || "Failed to join tournament",
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

  // Completely rewritten event setup method
  setupFormHandlers() {
    // Get all elements we need to attach handlers to
    const input = document.getElementById("tournamentName");
    const createButton = document.getElementById("createTournamentBtn");
    const refreshButton = document.getElementById("actualiserBtn");
    const joinButtons = document.querySelectorAll("[data-tournament-id]");

    // Skip if required elements don't exist
    if (!input || !createButton || !refreshButton) {
      console.warn("Some required elements are missing");
      return;
    }

    // Replace elements with clones to remove any existing handlers
    const newInput = input.cloneNode(true);
    const newCreateButton = createButton.cloneNode(true);
    const newRefreshButton = refreshButton.cloneNode(true);

    input.parentNode.replaceChild(newInput, input);
    createButton.parentNode.replaceChild(newCreateButton, createButton);
    refreshButton.parentNode.replaceChild(newRefreshButton, refreshButton);

    // Attach new event handlers
    this.attachEvent(newInput, "input", this.handleInputChange);
    this.attachEvent(newCreateButton, "click", this.handleCreateTournament);
    this.attachEvent(newRefreshButton, "click", this.handleRefreshTournaments);

    // Handle join buttons
    joinButtons.forEach((button) => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      this.attachEvent(newButton, "click", this.handleJoinTournament);
    });
  }

  async afterRender() {
    // Set up event handlers first
    this.setupFormHandlers();

    // Load tournaments if not already initialized
    if (!this.state.initialized && !this.state.loading) {
      console.log("Loading tournaments...");
      try {
        // Clean up previous event listeners
        this.cleanupFunctions.forEach((cleanup) => cleanup());
        this.cleanupFunctions = [];

        // Register new event listeners
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

        // Start loading tournaments
        this.setState({ loading: true });
        await pong42.player.tournament.getTournaments();

        // If already in a tournament, go to lobby
        if (pong42.player.tournament.tournamentId) {
          this.goToLobby(pong42.player.tournament.tournamentId);
        }

        this.showNoTournament();
      } catch (error) {
        console.error("Failed to load tournaments:", error);
        this.setState({
          error: error.message,
          loading: false,
          initialized: true,
        });
      }
    }
  }

  destroy() {
    // Clean up all event listeners
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];

    if (this.interval) {
      clearInterval(this.interval);
    }

    super.destroy();
  }

  showNoTournament() {
    const noTourElement = document.getElementById("noTour");
    if (
      !this.state.tournaments.length ||
      (this.state.tournaments.length === 1 &&
        this.state.tournaments[0].players_count === 8)
    ) {
      if (noTourElement) {
        noTourElement.innerHTML = `
          <tr>
            <td colspan="2" class="text-center py-4">
              Aucun tournoi disponible pour le moment
            </td>
          </tr>
        `;
      }
    } else if (noTourElement) {
      noTourElement.innerHTML = "";
    }
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
                                    aria-describedby="tournamentNameHelp"
                                    minlength="3"
                                    maxlength="100">
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
                                        : tournaments.map((tournament) => {
                                            return tournament.players_count < 8
                                              ? `
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
                                              : `
                                              <tr>
                                                <td colspan="2" class="fs-5 py-4 text-muted">
                                                  ${tournament.name} est complet
                                                </td>
                                              </tr>
                                            `;
                                          })
                                    }
                                    </tbody>
                                </table>
                                <div id='noTour'></div>
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
            </div>
        </section>
      `;
    }

    return "";
  }
}

export default GameTournoisMode;
