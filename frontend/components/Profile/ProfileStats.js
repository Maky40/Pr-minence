import Component from "../../utils/Component.js";
import pong42 from "../../services/pong42.js"

class ProfileStats extends Component {
	constructor(tournamentStats, soloStats) {
	  super();
	  this.state = {
		tournamentStats,
		soloStats,
	  };
	}

	template() {
	  const { victories: tournamentVictories, defeats: tournamentDefeats, lastThreeMatches: lastThreeTournamentMatches } = this.state.tournamentStats;
	  const { victories: soloVictories, defeats: soloDefeats, lastThreeMatches: lastThreeSoloMatches } = this.state.soloStats;

	  return `
  <!-- Scores Tables -->
  <div class="row">
	  <!-- Solo Scores -->
	  <div class="col-md-6 mb-4">
		  <div class="card shadow-sm">
			  <div class="card-header">
				  <h3 class="card-title mb-0">Scores Solo</h3>
			  </div>
			  <div class="card-body">
				  <p>Victoires : ${soloVictories} | Défaites : ${soloDefeats}</p>
				  <div class="table-responsive">
					  <table class="table table-hover">
						  <thead>
							  <tr>
								  <th>Date</th>
								  <th>Score</th>
								  <th>Résultat</th>
							  </tr>
						  </thead>
						  <tbody>
							  ${lastThreeSoloMatches.map(match => `
								  <tr>
									  <td>${new Date(match.created).toLocaleDateString()}</td>
									  <td>${match.players.find(p => p.player_id === pong42.player.id)?.score} - ${match.players.find(p => p.player_id !== pong42.player.id)?.score}</td>
									  <td>${match.players.find(p => p.player_id === pong42.player.id)?.is_winner ? '✅ Victoire' : '❌ Défaite'}</td>
								  </tr>
							  `).join("")}
						  </tbody>
					  </table>
				  </div>
			  </div>
		  </div>
	  </div>

	  <!-- Tournament Scores -->
	  <div class="col-md-6 mb-4">
		  <div class="card shadow-sm">
			  <div class="card-header">
				  <h3 class="card-title mb-0">Tournois</h3>
			  </div>
			  <div class="card-body">
				  <p>Victoires : ${tournamentVictories} | Défaites : ${tournamentDefeats}</p>
				  <div class="table-responsive">
					  <table class="table table-hover">
						  <thead>
							  <tr>
								  <th>Date</th>
								  <th>Score</th>
								  <th>Résultat</th>
							  </tr>
						  </thead>
						  <tbody>
							  ${lastThreeTournamentMatches.map(match => `
								  <tr>
									  <td>${new Date(match.created).toLocaleDateString()}</td>
									  <td>${match.players.find(p => p.player_id === pong42.player.id)?.score} - ${match.players.find(p => p.player_id !== pong42.player.id)?.score}</td>
									  <td>${match.players.find(p => p.player_id === pong42.player.id)?.is_winner ? '✅ Victoire' : '❌ Défaite'}</td>
								  </tr>
							  `).join("")}
						  </tbody>
					  </table>
				  </div>
			  </div>
		  </div>
	  </div>
  </div>
  <!-- End Scores Tables -->`;
	}
  }

export default ProfileStats;
