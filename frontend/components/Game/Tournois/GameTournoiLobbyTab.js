import Component from "../../../utils/Component.js";
import { renderMatchesByState } from "./GameTournoiMatch.js";

import {
  statusAffichage,
  roundAffichage,
  isPlayerIdPresent,
} from "./GameTournoiLib.js";
class GameTournoiLobbyTab extends Component {
  constructor(
    tournament,
    leaveTournamentFtn,
    startTournamentFtn,
    joinTournamentMatchFtn
  ) {
    super();
    this.tournament = tournament;
    this.leaveTournament = leaveTournamentFtn;
    this.startTournament = startTournamentFtn;
    this.joinTournamentMatch = joinTournamentMatchFtn;
    this.loading = false;
    this.waitingForPlayers = false;
  }

  afterRender() {
    const startTournamentButton =
      this.container.querySelector("#joinMatchButton");
    const joinMatchButtons = this.container.querySelector("#joinMatchButton");
    const leaveButton = this.container.querySelector("#leaveTournamentButton");
    this.attachEvent(startTournamentButton, "click", async (e) => {
      e.preventDefault();
      try {
        this.setState({ loading: true });
        await this.startTournament(this.tournament.id);
      } catch (error) {
        this.setState({
          error: error.message,
          loading: false,
        });
      }
    });
    console.log(this.tournament.current_round);
    this.attachEvent(leaveButton, "click", (e) => {
      e.preventDefault();
      this.leaveTournament();
    });
    this.attachEvent(joinMatchButtons, "click", (e) => {
      e.preventDefault();
      if (this.waitingForPlayers) return;
      this.waitingForPlayers = true;
      const matchId = e.target.getAttribute("data-match-id");
      this.joinTournamentMatch(matchId);
      this.destroy();
    });
  }

  template() {
    if (this.loading) {
      return `
      <div class="container mt-5">
        <div class="card shadow">
          <div class="card-body">
            <div class="d-flex justify-content-center align-items-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    return `
      <div class="container mt-5">
        <div class="card">
          <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
            <div class="d-flex justify-content-between align-items-center w-100 pb-2">
              <h3 class="mb-0">${this.tournament.name}</h3>
              <div class="d-flex align-items-center">
                <i class="fas fa-layer-group me-2"></i>
                <h4 class="mb-0">${roundAffichage(
                  this.tournament.current_round
                )}</h4>
              </div>
            </div>
            ${
              this.tournament.status === "PN"
                ? `<button class="btn btn-outline-danger" id="leaveTournamentButton">
                  ${
                    this.tournament.creator
                      ? "Annuler le tournoi"
                      : "Quitter le tournoi"
                  }
                </button>`
                : ""
            }
            ${
              this.tournament.creator &&
              this.tournament.status === "PN" &&
              this.tournament.players_count >= 8
                ? `<button class="btn btn-outline-success" id="startTournamentButton">
                    Démarrer le tournoi
                  </button>`
                : ""
            }
          </div>
          ${
            this.tournament.status === "PN"
              ? `
          <div class="card-body">
            <div class="row">
                  <div class="card-header">
                    <h4 class="mb-0">Nombre de joueurs inscrit :${
                      this.tournament.players_count || 0
                    }</h4>
              </div>
            </div>`
              : ``
          }
            ${
              this.tournament.status === "PN"
                ? `
              <div class="alert alert-info mt-4 text-center">
                <h4 class="alert-heading">En attente du début du tournoi</h4>
                <p class="mb-0">
                  ${
                    this.tournament.requiredPlayers
                      ? `${this.tournament.players?.length || 0}/${
                          this.tournament.requiredPlayers
                        } joueurs requis`
                      : "En attente de joueurs supplémentaires..."
                  }
                </p>
              </div>
            `
                : `
            <!-- Affichage des matchs par catégorie -->
            ${renderMatchesByState(
              this.tournament.matches,
              "UPL",
              this.tournament.current_round,
              this.joinTournamentMatch
            )}
            ${renderMatchesByState(
              this.tournament.matches,
              "PLY",
              this.tournament.current_round,
              this.joinTournamentMatch
            )}
            
            ${
              !this.tournament.matches?.some(
                (match) => match.round === this.tournament.current_round
              )
                ? '<div class="alert alert-info mt-4 text-center">Aucun match pour ce round</div>'
                : ""
            }
          `
            }
          </div>
        </div>
      </div>
    `;
  }
}

export default GameTournoiLobbyTab;
