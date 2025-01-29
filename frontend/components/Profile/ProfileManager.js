import ProfileView from "./ProfileView.js";
import ProfileEdit from "./ProfileEdit.js";
import Component from "../../utils/Component.js";
import pong42 from "../../services/pong42.js";

class ProfileManager extends Component {
  constructor() {
    super();
    this.state = {
      isEditing: false,
      profile: null,
    };
    this.view = new ProfileView();
    this.edit = new ProfileEdit();

    // Setup events immediately
    this.view.on("edit", () => {
      console.log("Edit event received in manager");
      this.setState({ isEditing: true });
    });

    this.edit.on("cancel", () => {
      console.log("Cancel event received in manager");
      this.setState({ isEditing: false });
    });

    this.edit.on("save", (profile) => {
      console.log("Save event received in manager", profile);
      pong42.player.updatePlayerInformations(profile);
      this.setState({ isEditing: false, profile });
    });
  }
  updateProfile = (newProfile) => {
    pong42.player.updatePlayerInformations(newProfile);
    this.setState({ isEditing: false, profile: newProfile });
  };
  render(container) {
    this.container = container;
    const activeComponent = this.state.isEditing ? this.edit : this.view;
    activeComponent.setState(this.state.profile);
    activeComponent.render(container);
  }
}

export default ProfileManager;
