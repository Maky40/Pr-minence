import Component from "../../utils/Component.js";

class ProfileStatsFriend extends Component {
	constructor(victories, defeats, lastTwoMatches, opponent_id) {
		super();
		this.state = {
			victories,
			defeats,
			lastTwoMatches,
			opponent_id,
		};
		console.log("Opponent ID:", this.state.opponent_id);

	}

	template() {
		return `
		<div class="row">
			<div class="col-12 mb-4">
				<div class="card shadow-sm">
					<div class="card-header">
						<h4 class="card-title mb-0 text-center">Historique de matchs contre ton kopain</h4>
					</div>
					<div class="card-body">
						<p><strong>Victoires :</strong> ${this.state.victories}</p>
						<p><strong>Défaites :</strong> ${this.state.defeats}</p>
						<h4>Derniers matchs :</h4>
						<div class="table-responsive">
							<table class="table table-hover">
								<thead>
									<tr>
										<th>Date</th>
										<th>Score</th>
										<th>Résultat</th>
									</tr>
								</thead>
								<tbody id="soloScores">
									${this.state.lastTwoMatches.map(match => {
										const opponentStats = match.players.find(p => p.player_id === this.state.opponent_id);
										const myStats = match.players.find(p => p.player_id !== this.state.opponent_id);
										return `
											<tr>
												<td>${new Date(match.created).toLocaleString()}</td>
												<td>${myStats.score} - ${opponentStats.score}</td>
												<td>${myStats.is_winner ? "Victoire" : "Défaite"}</td>
											</tr>
										`;
									}).join('')}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>`;
	}
}

export default ProfileStatsFriend;