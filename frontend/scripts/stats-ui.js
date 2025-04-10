export function renderStats(player, stats) {
	const container = document.querySelector('.container');
	container.innerHTML = `
	  <div class="row">
		<!-- Statistiques textuelles -->
		<div class="col-md-4">
		  <div class="card">
			<div class="card-body">
			  <h5 class="card-title">Statistiques ${player.username}</h5>
			  <p></p>
			  <p>Total des Matchs: ${stats.totalMatches}</p>
			  <p>Victoires: ${player.wins}</p>
			  <p>Défaites: ${player.losses}</p>
			  <p>Taux de victoire: ${stats.winRate.toFixed(2)}%</p>
			  <p>Tournois remportés: ${stats.tournamentWins}</p>
			  <p>Participation en tournois: ${stats.tournamentParticipation}</p>
			</div>
		  </div>
		</div>

		<!-- Camembert (Win Rate Chart) -->
		<div class="col-md-4">
		  <canvas id="winRateChart" height="200"></canvas>
		</div>

		<!-- Graphique Linéaire (Match History Chart) -->
		<div class="col-md-4">
		  <canvas id="matchHistoryChart" height="300"></canvas>
		</div>
	  </div>

	  <!-- Historique des matchs -->
	  <div class="row mt-5">
		<div class="col-md-12">
		  <h3>Historique des matchs</h3>
		  <table class="table table-striped match-history"></table>
		</div>
	  </div>
	`;
  }
  export function renderMatchHistory(matches, username) {
	const table = document.querySelector('.match-history');
	table.innerHTML = `
	  <thead>
		<tr>
		  <th>Date</th>
		  <th>Adversaire</th>
		  <th>Score</th>
		  <th>Résultat</th>
		</tr>
	  </thead>
	  <tbody></tbody>
	`;

	const tbody = table.querySelector('tbody');
	matches.forEach(match => {
	  const opponent = match.players.find(p => p.username !== username);
	  const currentPlayer = match.players.find(p => p.username === username);
	  const row = document.createElement('tr');
	  row.innerHTML = `
		<td>${new Date(match.created).toLocaleString()}</td>
		<td>${opponent.username}</td>
		<td>${currentPlayer.score} - ${opponent.score}</td>
		<td>${currentPlayer.is_winner ? 'Victoire' : 'Défaite'}</td>
	  `;
	  tbody.appendChild(row);
	});
  }

  export function renderError() {
	const table = document.querySelector('.container');
	table.innerHTML = `
	  <div class="error-container mt-5 text-center">
        <h1 class="display-1 fw-bold">4🎮4</h1>
        <h2 class="display-4 mb-4 text-light">Oups ! La page a fait rage quit !</h2>
        <p class="lead mb-4 text-light">On dirait que tu as perdu cette manche...</p>
        <button class="btn btn-primary btn-lg" onclick="changePage('#home')">
            Retour à la base
        </button>
    </div>
	`;
  }