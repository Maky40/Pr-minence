import Component from "../utils/Component.js";
import auth from "../services/auth.js";

/**
 * Modal Alert Component
 * @extends Component
 * @description Creates a customizable modal dialog with support for different styles and actions
 * @example
 * // Create an info modal
 * const infoModal = new ModalAlert("Info", "This is an info message", "OK", "Cancel", "info");
 * infoModal.render(document.body);
 * infoModal.show();
 *
 * // Create a danger modal
 * const dangerModal = new ModalAlert("Warning", "Are you sure?", "Yes", "No", "danger");
 * dangerModal.render(document.body);
 * dangerModal.show();
 */

export default class ModalGame extends Component {
  constructor(
    title,
    message,
    confirmText = "OK",
    cancelText = "Annuler",
    type = "info",
    callbackConfirm
  ) {
    super();
    this.title = title;
    this.message = message;
    this.confirmText = confirmText;
    this.cancelText = cancelText;
    this.type = type;
    this.callbackConfirm = callbackConfirm;
    this.modalContainer = document.createElement("div");
  }

  getTypeStyles() {
    return this.type === "danger"
      ? {
          icon: "fa-exclamation-triangle text-warning",
          confirmBtn: "btn-outline-danger",
          border: "var(--neon-red)",
        }
      : {
          icon: "fa-info-circle text-info",
          confirmBtn: "btn-outline-info",
          border: "var(--neon-blue)",
        };
  }

  template() {
    const styles = this.getTypeStyles();
    return `
        <div class="modal fade" id="alertModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content" style="background: linear-gradient(to right, #1a1a1a, #2d2d2d); border: 1px solid ${styles.border};">
                    <div class="modal-header border-info">
                        <h5 class="modal-title text-info" id="modalLabel">
                            <i class="fas ${styles.icon} me-2"></i>${this.title}
                        </h5>
                    </div>
                    <div class="modal-body text-light">
                        ${this.message}
                    </div>
                    <div class="modal-footer border-info">
                        <button type="button" class="btn ${styles.confirmBtn}" id="confirmBtn">
                            ${this.confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
  }

  render(container) {
    this.modalContainer.innerHTML = this.template();
    container.appendChild(this.modalContainer);
    this.container = this.modalContainer;
    this.attachEventListeners();
  }
  show() {
    const modal = new bootstrap.Modal(
      this.container.querySelector("#alertModal")
    );
    modal.show();
  }
  destroy() {
    if (this.modalContainer) {
      this.modalContainer.remove();
    }
  }

  attachEventListeners() {
    const confirmBtn = this.container.querySelector("#confirmBtn");
    const cancelBtn = this.container.querySelector("#cancelBtn");
    const modalElement = this.container.querySelector("#alertModal");

    confirmBtn.addEventListener("click", () => {
      bootstrap.Modal.getInstance(modalElement).hide();
      this.callbackConfirm();
      this.destroy();
    });

    modalElement.addEventListener("hidden.bs.modal", () => {
      this.destroy();
    });
  }
}
