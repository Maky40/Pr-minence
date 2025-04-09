import Component from "../../utils/Component.js";
import pong42 from "../../services/pong42.js";

class ProfileView extends Component {
  constructor() {
    super();
    this.state = {
      username: "",
      first_name: "",
      last_name: "",
      email: "",
      status: "ON",
      avatar: "/assets/avatars/default.png",
    };

    this.STATUS = {
      ON: { text: "En ligne", class: "bg-success" },
      OF: { text: "Hors ligne", class: "bg-danger" },
      IG: { text: "En partie", class: "bg-warning" },
    };
  }

  getStatusBadge() {
    const status = this.STATUS[this.state.status] || this.STATUS.OF;
    return `<span class="badge ${status.class}">${status.text}</span>`;
  }
  template() {
    const isCurrentUser = this.state.username === pong42.player.username;
    return `
            <div class="card shadow-lg mb-4">
                <div class="card-body">
                    <div class="d-flex justify-content-end">
					${
            isCurrentUser
              ? `
                        <button id="editButton" class="btn btn-outline-primary">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                    `
              : ""
          }

                    </div>
                    <div class="row align-items-center">
                        <div class="col-md-3 text-center">
                            <img src="${this.state.avatar}"
                                alt="Profile"
                                class="rounded-circle img-fluid mb-3"
                                style="width: 150px; height: 150px; object-fit: cover;">
                        </div>
                        <div class="col-md-9">
                            <h2 class="display-6 mb-3">${
                              this.state.username
                            }</h2>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <p class="mb-1"><strong>Prénom:</strong> ${
                                      this.state.first_name
                                    }</p>
                                    <p class="mb-1"><strong>Nom:</strong> ${
                                      this.state.last_name
                                    }</p>
                                    ${
                                      this.state.email
                                        ? `<p class="mb-1"><strong>Email:</strong> ${this.state.email}</p>`
                                        : ""
                                    }
                                </div>
                                <div class="col-md-6">
                                    <p class="mb-1"><strong>Status:</strong> ${this.getStatusBadge()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
  }

  attachEventListeners() {
    const editButton = this.container.querySelector("#editButton");
    if (editButton) {
      // Remove any existing listeners
      editButton.replaceWith(editButton.cloneNode(true));
      const newEditButton = this.container.querySelector("#editButton");
      newEditButton.addEventListener("click", () => {
        this.emit("edit");
      });
    }
  }
}

export default ProfileView;
