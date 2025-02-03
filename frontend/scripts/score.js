import Avatar from "../components/avatar.js";

const players = [
  {
    rank: 1,
    name: "TRUMP2025",
    image: "assets/avatars/default.png",
    wins: 42,
    losses: 8,
    score: 2100,
    level: { name: "Légendaire", class: "bg-danger" },
  },
  {
    rank: 2,
    name: "MUSK22",
    image: "assets/avatars/default.png",
    wins: 32,
    losses: 11,
    score: 1100,
    level: { name: "Maître", class: "bg-warning" },
  },
  {
    rank: 3,
    name: "PUTINE2024",
    image: "assets/avatars/default.png",
    wins: 20,
    losses: 38,
    score: 700,
    level: { name: "Expert", class: "bg-primary" },
  },
  {
    rank: 4,
    name: "TRUMP2020",
    image: "assets/avatars/default.png",
    wins: 4,
    losses: 378,
    score: 20,
    level: { name: "Novice", class: "bg-secondary" },
  },
  {
    rank: 3,
    name: "MACRON2022",
    image: "assets/avatars/default.png",
    wins: 1,
    losses: 493,
    score: 11,
    level: { name: "Novice", class: "bg-secondary" },
  },
  // ...autres joueurs
];

function initDashboard() {
  const tbody = document.getElementById("leaderboard-body");

  if (!tbody) {
    console.error("Tableau non trouvé");
    return;
  }
  //clean le tableau avant de le recharger
  tbody.innerHTML = "";
  players.forEach((player) => {
    const avatar = new Avatar(player.image, player.name, {
      size: "30",
      showName: true,
      classes: "player-avatar",
    });

    const row = `
            <tr>
                <th scope="row">${player.rank}</th>
                <td>${avatar.render()}</td>
                <td class="text-success">${player.wins}</td>
                <td class="text-danger">${player.losses}</td>
                <td>${player.score}</td>
                <td><span class="badge ${player.level.class}">${
      player.level.name
    }</span></td>
            </tr>
        `;

    tbody.innerHTML += row;
  });
}
export function init() {
  console.log("Loading dashboard...");
  initDashboard();
}
