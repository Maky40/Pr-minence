import ProfileManager from "../components/Profile/ProfileManager.js";
import ProfileStats from "../components/Profile/ProfileStats.js";
import FriendsList from "../components/FriendsList.js";
import pong42 from "../services/pong42.js";
import api from "../services/api.js"

const init = () => {
  const profilInfoContainer = document.getElementById("profile-info");
  const profileStatsContainer = document.getElementById("profile-stats");
  const profileFriendsContainer = document.getElementById("profile-friends");

  // Initialize components
  const profileManager = new ProfileManager();
  profileManager.setState({
    profile: pong42.player,
    isEditing: false,
  });
  profileManager.render(profilInfoContainer);

  setStats(profileStatsContainer);

  const friendsList = new FriendsList();
  friendsList.render(profileFriendsContainer);

  //chargement du listener
};


async function setStats(profileStatsContainer) {
	// Récupération des données du joueur
	const data = await api.apiFetch("player/match-history/", true, "GET");

	const tournament_match = data.matches.filter(match => match.tournament_match);
	const match = data.matches.filter(match => !(match.tournament_match));

	// Récupération des statistiques pour les matchs de tournoi et solo
	const stats_tournament = setStats2(tournament_match);
	const stats_matches = setStats2(match);

	// Création de l'instance ProfileStats avec les données calculées
	const profileStats = new ProfileStats(stats_tournament, stats_matches);
	profileStats.render(profileStatsContainer);
  }

function setStats2(match) {

	let victories = 0;
	let defeats = 0;
	match.forEach(match => {
		const myStats = match.players.find(p => p.player_id === pong42.player.id);
		if (myStats.is_winner)
			victories++;
		else
		defeats++;
	})
	// Garder les trois derniers matchs (tri par date)
	const lastThreeMatches = match
	.sort((a, b) => new Date(b.created) - new Date(a.created))
	.slice(0, 3);

	return {
		victories,
		defeats,
		lastThreeMatches,
	}
}

export { init };
