import Avatar from '../components/avatar.js';

const players = [
	{
		rank: 1,
		name: 'PongMaster42',
		image: 'assets/avatars/avatar1.png',
		wins: 42,
		losses: 8,
		score: 2100,
		level: { name: 'Légendaire', class: 'bg-warning' }
	},
	{
		rank: 2,
		name: 'PingMaster32',
		image: 'assets/avatars/avatar1.png',
		wins: 32,
		losses: 8,
		score: 1100,
		level: { name: 'Légendaire', class: 'bg-warning' }
	},
	{
		rank: 3,
		name: 'toto',
		image: 'assets/avatars/avatar1.png',
		wins: 42,
		losses: 8,
		score: 2100,
		level: { name: 'Légendaire', class: 'bg-warning' }
	},
	{
		rank: 4,
		name: 'trump',
		image: 'assets/avatars/avatar1.png',
		wins: 4,
		losses: 78,
		score: 20,
		level: { name: 'Légendaire', class: 'bg-warning' }
	}
	// ...autres joueurs
];

function initDashboard() {
	const tbody = document.getElementById('leaderboard-body');
	if (!tbody) {
		console.error('Tableau non trouvé');
		return;
		};
		console.log('Tableau trouvé');
	players.forEach(player => {
		const avatar = new Avatar(player.image, player.name, {
			size: '30',
			showName: true,
			classes: 'player-avatar'
		});

		const row = `
            <tr>
                <th scope="row">${player.rank}</th>
                <td>${avatar.render()}</td>
                <td class="text-success">${player.wins}</td>
                <td class="text-danger">${player.losses}</td>
                <td>${player.score}</td>
                <td><span class="badge ${player.level.class}">${player.level.name}</span></td>
            </tr>
        `;

		tbody.innerHTML += row;
	});
}
export function init() {
    console.log('Loading dashboard...');
    initDashboard();
}