import Component from "../utils/Component.js";

class AlertInfo extends Component {
  constructor(message, type = "info") {
    super();
    this.state = { message };
    this.type = type;
  }

  typeToClass() {
    switch (this.type) {
      case "info":
        return "alert-info";
      case "success":
        return "alert-success";
      case "warning":
        return "alert-warning";
      case "danger":
        return "alert-danger";
      default:
        return "alert-info";
    }
  }

  template() {
    return `
        <div class="alert ${this.typeToClass(
          this.type
        )} alert-dismissible fade show text-center" role="alert"> ${
      this.state.message
    }
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
        `;
  }

  render(container) {
    if (!container) {
      throw new Error("Container is required for AlertInfo component");
    }

    this.container = container;
    super.render(this.container);
    this.container.classList.add("animate__animated", "animate__fadeIn");
  }
}

export default AlertInfo;
