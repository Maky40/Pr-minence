import pong42 from "../../services/pong42.js";
import Component from "../../utils/Component.js";
import AlertInfo from "../alertInfo.js";
import { validateField } from "../../utils/Form.js";

class ProfileEdit extends Component {
  template() {
    return `
            <div class="card shadow-lg mb-4">
                <div class="card-body">
                                            <div id="alert-container">
                            </div>
                    <form id="profileForm">
                        <div class="row">
                            <div class="col-md-3 text-center">
                                <img src="${this.state.avatar}" alt="Profile" 
                                    class="rounded-circle img-fluid mb-3"
                                    style="width: 150px; height: 150px; object-fit: cover;">
                                <div class="mb-3">
                                    <input type="file" class="form-control" name="avatar" id="avatar" accept="image/*">
                                </div>
                                       ${
                                         this.state.hasFile
                                           ? `
                <button type="button" class="btn btn-primary mt-2" id="uploadButton">
                    Téléverser
                </button>
            `
                                           : ""
                                       }
                            </div>

                            <div class="col-md-9">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="first_name" class="form-label">Prénom</label>
                                            <input type="text" class="form-control" id="first_name" name="first_name" 
                                                value="${
                                                  this.state.first_name || ""
                                                }" minlength="4"
                                                  maxlength="20">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="last_name" class="form-label">Nom</label>
                                            <input type="text" class="form-control" id="last_name" name="last_name" 
                                                value="${
                                                  this.state.last_name || ""
                                                }" minlength="4"
                                                  maxlength="20">
                                        </div>
                                    </div>
                                </div>
                                <div id="errorMessages" class="error-messages"></div>
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
    const avatarInput = this.container.querySelector("#avatar");
    const uploadButton = this.container.querySelector("#uploadButton");

    uploadButton?.addEventListener("click", async () => {
      try {
        const result = await pong42.player.updateAvatar(this.avatarFile);
        console.log(result);
        if (!result) {
          console.error("Error uploading avatar");
          return;
        }
        // Update state correctly - spread first, then override
        this.setState({
          ...this.state,
          hasFile: false,
          avatar: this.defaultAvatar, // If you have a default avatar
        });
        this.emit("save", pong42.player);
      } catch (error) {
        const AlerteContainer = document.getElementById("alert-container");
        const alert = new AlertInfo("Error uploading avatar", "danger");
        alert.render(AlerteContainer);
      }
    });

    avatarInput?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Check file size (ex: 5MB max)
      const maxSize = 1 * 1024 * 1024; // 2MB in bytes
      const fileSize = file.size;
      if (parseInt(file.size) > parseInt(maxSize)) {
        const AlerteContainer = document.getElementById("alert-container");
        const alert = new AlertInfo(
          "Le fichier est trop volumineux (max 1MB)",
          "danger"
        );
        alert.render(AlerteContainer);
        avatarInput.value = "";
        return;
      }

      this.avatarFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.setState({
          avatar: e.target.result,
          hasFile: true,
        });
      };
      reader.readAsDataURL(file);
    });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      let formIsValid = true; // Suivi de la validité du formulaire
      const errors = []; // Tableau pour collecter les messages d'erreur
      const formData = new FormData(form);
      const check_first_name = validateField(
        "text",
        formData.get("first_name"),
        4,
        100
      );
      if (!check_first_name.isValid) {
        formIsValid = false;
        errors.push(check_first_name.message);
      }
      const check_last_name = validateField(
        "text",
        formData.get("last_name"),
        4,
        100
      );
      if (!check_last_name.isValid) {
        formIsValid = false;
        errors.push(check_last_name.message);
      }

      if (formIsValid) {
        await pong42.player.updatePlayerInformations(formData);
        this.emit("save", pong42.player);
      } else {
        this.displayErrors(errors);
      }
    });

    cancelButton?.addEventListener("click", () => {
      this.emit("cancel");
    });
  }

  displayErrors(errors) {
    const errorDiv = document.getElementById("errorMessages");
    errorDiv.innerHTML = errors.join("<br>"); // Affiche toutes les erreurs séparées par une nouvelle ligne
    errorDiv.style.display = "block"; // Affiche le div d'erreur
  }
}

export default ProfileEdit;
