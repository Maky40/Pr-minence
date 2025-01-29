import Component from "../../utils/Component.js";

class ProfileEdit extends Component {
  template() {
    return `
            <div class="card shadow-lg mb-4">
                <div class="card-body">
                    <form id="profileForm">
                        <div class="row">
                            <div class="col-md-3 text-center">
                                <img src="${this.state.avatar}" alt="Profile" 
                                    class="rounded-circle img-fluid mb-3"
                                    style="width: 150px; height: 150px; object-fit: cover;">
                                <div class="mb-3">
                                    <input type="file" class="form-control" name="avatar" id="avatar" accept="image/*">
                                </div>
                            </div>
                            <div class="col-md-9">
                                <div class="mb-3">
                                    <label for="username" class="form-label">Nom d'utilisateur</label>
                                    <input type="text" class="form-control" id="username" name="username" 
                                        value="${
                                          this.state.username || ""
                                        }" disabled>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="first_name" class="form-label">Prénom</label>
                                            <input type="text" class="form-control" id="first_name" name="first_name" 
                                                value="${
                                                  this.state.first_name || ""
                                                }">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="last_name" class="form-label">Nom</label>
                                            <input type="text" class="form-control" id="last_name" name="last_name" 
                                                value="${
                                                  this.state.last_name || ""
                                                }">
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="email" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="email" name="email" 
                                        value="${
                                          this.state.email || ""
                                        }" disabled>
                                </div>
                                <div class="d-flex gap-2">
                                    <button type="submit" class="btn btn-primary">Sauvegarder</button>
                                    <button type="button" id="cancelButton" class="btn btn-outline-secondary">Annuler</button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>`;
  }

  attachEventListeners() {
    const form = this.container.querySelector("#profileForm");
    const cancelButton = this.container.querySelector("#cancelButton");

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = {};

      for (let [key, value] of formData.entries()) {
        data[key] = value;
      }

      console.log("Form data:", data);
      this.emit("save", data);
    });

    cancelButton?.addEventListener("click", () => {
      this.emit("cancel");
    });
  }
}

export default ProfileEdit;
