import Component from "../utils/Component.js";

class Toast extends Component {
  constructor(title = "Notification", message = "", type = "info") {
    super();
    this.title = title;
    this.message = message;
    this.type = type;
    this.toastContainer = document.createElement("div");
  }

  getTypeStyles() {
    const styles = {
      success: {
        icon: "check-circle",
        color: "text-success",
        bgColor: "bg-success",
      },
      error: {
        icon: "exclamation-circle",
        color: "text-danger",
        bgColor: "bg-danger",
      },
      warning: {
        icon: "exclamation-triangle",
        color: "text-warning",
        bgColor: "bg-warning",
      },
      info: { icon: "info-circle", color: "text-info", bgColor: "bg-info" },
    };
    return styles[this.type] || styles.info;
  }

  template() {
    const styles = this.getTypeStyles();
    return `
            <div class="toast-container position-fixed bottom-0 end-0 p-3">
                <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header">
                        <i class="fas fa-${styles.icon} ${styles.color} me-2"></i>
                        <strong class="me-auto">${this.title}</strong>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                    <div class="toast-body ${styles.bgColor} text-light">
                        ${this.message}
                    </div>
                </div>
            </div>`;
  }

  show(message = this.message, type = this.type) {
    // Conversion robuste du message en string
    this.message =
      typeof message === "string"
        ? message
        : message instanceof Error
        ? message.message
        : JSON.stringify(message, null, 2);

    this.type = type;

    // Détruire le toast existant s'il y en a un
    if (this.container) {
      this.destroy();
    }

    // Créer le nouveau toast
    this.toastContainer.innerHTML = this.template();
    document.body.appendChild(this.toastContainer);
    this.container = this.toastContainer;

    // Initialiser et afficher le toast Bootstrap
    const toastElement = this.container.querySelector(".toast");
    const toast = new bootstrap.Toast(toastElement);
    toast.show();

    // Auto-destruction après disparition
    toastElement.addEventListener("hidden.bs.toast", () => {
      this.destroy();
    });
  }

  destroy() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}

export default Toast;
