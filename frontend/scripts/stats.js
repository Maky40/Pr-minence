import api from "../services/api.js";
import { changePage } from "../utils/Page.js";
import { renderStats, renderMatchHistory, renderError } from "./stats-ui.js";

export async function init() {
  const hash = window.location.hash.substring(1);
  const username = await verificationHash(hash);
  if (!username) {
	renderError();
	return ;}
  await loadPage(username);
}

async function verificationHash(hash) {
  const username = hash.split("-")[1];
  if (!username) return false;
  return username;
}

async function loadPage(username) {
	const playerData = await api.apiFetch("/player/?username=" + username, true, "GET");
	const matchHistory = await api.apiFetch(`/player/match-history/?username=${username}`, true, "GET");

	if (playerData.status === 200 && matchHistory.statusCode === 200) {
	  const player = playerData.players[0];
	  const matches = matchHistory.matches;

	  // Calcul des statistiques
	  const stats = calculateStats(player, matches);

	  // Rendu de l'interface
	  renderStats(player, stats);
	  renderMatchHistory(matches, username);
	  createCharts(stats, matches, username);
	} else {
		renderError();
	}
  }

  function calculateStats(player, matches) {
	const tournamentMatches = matches.filter(match => match.tournament_match);
	// const tournamentWins = tournamentMatches.filter(match => {
	// 	const currentPlayer = match.players.find(p => p.username === player.username);
	// 	return currentPlayer && currentPlayer.is_winner;
	// }).length;
	const tournamentWins = player.champions;
	const tournamentLosses = tournamentMatches.filter(match => {
		const currentPlayer = match.players.find(p => p.username === player.username);
		return currentPlayer && !currentPlayer.is_winner;
	}).length;
	const winRate = player.wins / (player.wins + player.losses) * 100 || 0;
	const tournamentParticipation = tournamentLosses + player.champions;
	let defeatRate;
	if (player.wins + player.losses > 0) {
		defeatRate = 100 - winRate;
	} else {
		defeatRate = 0;
	}
	return {
	  winRate,
	  tournamentWins,
	  tournamentParticipation,
	  totalMatches: player.wins + player.losses,
	  defeatRate,
	  };
  }

  function createCharts(stats, matches, username) {
	// Trier les matchs par date
	const sortedMatches = matches.sort((a, b) => new Date(a.created) - new Date(b.created));

	// Regrouper les matchs par jour
	const matchesByDay = sortedMatches.reduce((acc, match) => {
	  const date = new Date(match.created).toLocaleDateString('fr-FR');
	  if (!acc[date]) acc[date] = { wins: 0, losses: 0 };
	  const currentPlayer = match.players.find(p => p.username === username);
	  if (currentPlayer && currentPlayer.is_winner) {
		acc[date].wins++;
	  } else {
		acc[date].losses++;
	  }
	  return acc;
	}, {});

	// Extraire les données
	const labels = Object.keys(matchesByDay);
	const winsData = labels.map(date => matchesByDay[date].wins);
	const lossesData = labels.map(date => matchesByDay[date].losses);

	// Limiter à 10 jours
	const maxDays = 10;
	const slicedLabels = labels.slice(0, maxDays);
	const slicedWinsData = winsData.slice(0, maxDays);
	const slicedLossesData = lossesData.slice(0, maxDays);


	console.log("Labels:", slicedLabels);
	console.log("Victoires par jour:", slicedWinsData);
	console.log("Défaites par jour:", slicedLossesData);

	// Win Rate Chart (Doughnut)
	const winRateCtx = document.getElementById('winRateChart').getContext('2d');
	new Chart(winRateCtx, {
	  type: 'doughnut',
	  data: {
		labels: ['Victoires', 'Défaites'],
		datasets: [{
		  data: [stats.winRate, stats.defeatRate], // Utiliser les données réelles de victoires/défaites
		  backgroundColor: ['#28a745', '#dc3545'],
		  borderColor: '#ffffff',
		  borderWidth: 2,
		}]
	  },
	  options: {
		plugins: {
		  legend: {
			labels: {
			  color: '#ffffff', // Police blanche
			},
		  },
		},
		title: {
		  display: true,
		  text: 'Taux de victoire',
		  color: '#ffffff', // Titre en blanc
		  font: {
			size: 16,
		  },
		},
		responsive: true,
		maintainAspectRatio: false,
	  }
	});

	// Match History Chart (Line Chart)
	const matchHistoryCtx = document.getElementById('matchHistoryChart');
	const ctx = matchHistoryCtx.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: slicedLabels,
        datasets: [{
          label: 'Victoires',
          data: slicedWinsData,
          backgroundColor: 'rgba(40, 167, 69, 0.2)',
          borderColor: '#28a745',
          borderWidth: 2,
          fill: true,
        }, {
          label: 'Défaites',
          data: slicedLossesData,
          backgroundColor: 'rgba(220, 53, 69, 0.2)',
          borderColor: '#dc3545',
          borderWidth: 2,
          fill: true,
        }]
      },
      options: {
        scales: {
          x: {
            ticks: {
              color: '#ffffff',
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
          },
          y: {
            ticks: {
              color: '#ffffff',
              beginAtZero: true,
			  stepSize: 1,
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: '#ffffff',
            },
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      }
    });
  }
