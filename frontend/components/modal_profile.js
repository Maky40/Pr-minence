import Component from "../utils/Component.js";
import ProfileView from "./Profile/ProfileView.js";
import ProfileStatsFriend from "./Profile/ProfileStatsFriend.js";
import api from "../services/api.js"

export default class ModalProfile extends Component {
	constructor(profile) {
		super();

		if (!profile) {
			throw new Error("Profil non défini !");
		}
		this.state = {
			profile,
			victories: 0,
			defeats: 0,
			lastTwoMatches: []
		 };
		 this.state.profile.email = null;
		this.modalContainer = document.createElement("div");
	}

	template() {
		return `
			<div class="modal fade" id="profileModal" tabindex="-1" aria-labelledby="profileModalLabel" aria-hidden="true">
				<div class="modal-dialog modal-lg">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title">${this.state.profile.username}</h5>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
						</div>
						<div class="modal-body" id="profileContainer">
							<!-- ProfileView sera inséré ici -->
						</div>
						<div class="modal-body" id="profileStatsFriendContainer">
							<!-- ProfileStatsFriend sera inséré ici -->
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	async setStats() {
		const data = await api.apiFetch("player/match-history/", true, "GET")
		const opponentId = this.state.profile.id;
		const matchesBetween = data.matches.filter(match => match.players.some(p => p.player_id === opponentId));
		let victories = 0;
		let defeats = 0;
		matchesBetween.forEach(match => {
			const myStats = match.players.find(p => p.player_id === opponentId);
			if (myStats.is_winner)
				defeats++;
			else
				victories++;
		})
		// Garder les deux derniers matchs (tri par date)
		const lastTwoMatches = matchesBetween
		.sort((a, b) => new Date(b.created) - new Date(a.created))
		.slice(0, 2);
		console.log("Derniers matchs : ", lastTwoMatches);

		// Met à jour l'état dans ModalProfile
		this.setState({ victories, defeats, lastTwoMatches });
	}
	async render(container) {
		// Vérifie si le modal existe déjà pour éviter les doublons
		if (document.getElementById("profileModal")) {
			return;
		}

		this.modalContainer.innerHTML = this.template();
		container.appendChild(this.modalContainer);

		// Création et rendu du ProfileView dans le modal
		const profileView = new ProfileView();
		profileView.setState(this.state.profile);
		profileView.render(this.modalContainer.querySelector("#profileContainer"));

		// Création et rendu du ProfileStatsFriend dans le modal
		await this.setStats();
		const profileStatsFriend = new ProfileStatsFriend(this.state.victories, this.state.defeats, this.state.lastTwoMatches, this.state.profile.id);
		profileStatsFriend.render(this.modalContainer.querySelector("#profileStatsFriendContainer"));

		this.container = this.modalContainer;
		this.attachEventListeners();
	}

	show() {
		const modalElement = this.container.querySelector("#profileModal");
		const modal = new bootstrap.Modal(modalElement);
		modal.show();
	}

	destroy() {
		if (this.modalContainer) {
			this.modalContainer.remove();
		}
	}

	attachEventListeners() {
		const modalElement = this.container.querySelector("#profileModal");
		modalElement.addEventListener("hidden.bs.modal", () => {
			this.destroy();
			document.body.focus();
		});
	}
}
