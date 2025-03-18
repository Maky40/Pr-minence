import Component from "../utils/Component.js";
import ProfileView from "./Profile/ProfileView.js";

export default class ModalProfile extends Component {
	constructor(profile) {
		super();

		if (!profile) {
			throw new Error("Profil non défini !");
		}

		this.state = { profile };
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
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	render(container) {
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
