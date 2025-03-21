import Component from "../../utils/Component.js";
import api from "../services/api.js";

class InviteForPlayComponent extends Component {
  constructor(socketActivate, player) {
    super();
    this.socketActivate = socketActivate;
    this.player = player;
	this.modalContainer = document.createElement("div");
  }


  template() {
    return `
      <div class="modal fade" id="playModal" tabindex="-1" aria-labelledby="playModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content custom-modal">
            <div class="modal-header">
              <h3 class="modal-title text-primary">🎾 Invitation en cours...</h3>
            </div>
            <div class="modal-body text-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="text-muted mt-3">En attente de la réponse de votre adversaire...</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-danger w-100" id="cancel-match">❌ Annuler</button>
            </div>
          </div>
        </div>
      </div>
    `;
}

  render(container) {
    // Supprime l'ancien modal si déjà présent
    const existingModal = document.getElementById("playModal");
    if (existingModal) {
        existingModal.remove();
    }

    // Crée un nouveau conteneur modal
    this.modalContainer = document.createElement("div");
    this.modalContainer.innerHTML = this.template();

    // Ajoute au container
    container.appendChild(this.modalContainer);

    // Garde une référence et attache les événements
    this.container = this.modalContainer;
    this.attachEventListeners();
}

show() {
	const modalElement = this.container.querySelector("#playModal");
	const modal = new bootstrap.Modal(modalElement);
	modal.show();
}

closeModalMatchAccepted() {
	this.preventDestroy = true;
	this.preventSendCancelled = true;
    const modalElement = document.getElementById("playModal");
    if (modalElement) {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
            modalInstance.hide(); // Ferme le modal proprement
        }
    }
}

closeModalMatchRefused() {
	this.preventSendCancelled = true;
	this.matchDeleted = true;
    const modalElement = document.getElementById("playModal");
    if (modalElement) {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
            modalInstance.hide(); // Ferme le modal proprement
        }
    }
}
async destroy() {
	if (this.preventDestroy)
		return;
	if (this.modalContainer) {
		this.modalContainer.remove();
	}
	if (!this.matchDeleted)
		await api.apiFetch("pong/match/individual/delete", true, "POST");
	 // Réinitialise les infos du joueur
	 this.player.match_id = null;
	 this.player.paddle = null;
	 if (this.player.socketMatch) {
		this.player.socketMatch.close();
		this.player.socketMatch = null;
	}

}

attachEventListeners() {
	const modalElement = this.container.querySelector("#playModal");
	const cancelButton = modalElement.querySelector("#cancel-match");
	if (cancelButton) {
		cancelButton.addEventListener("click", () => {
			this.sendCancelled();
			bootstrap.Modal.getInstance(modalElement).hide();
		});
	}
	modalElement.addEventListener("hidden.bs.modal", () => {
		this.sendCancelled();
		this.destroy();
		document.body.focus();
	});
}

sendCancelled() {
	if (this.preventSendCancelled)
		return ;
	const payload = {
		type: 'invitation_play',
		senderId : this.player.id,
		senderName: this.player.username,
		message: "annuler",
		matchId: this.player.match_id,
	};
	this.socketActivate.socket.send(JSON.stringify(payload));
}

}



export default InviteForPlayComponent;