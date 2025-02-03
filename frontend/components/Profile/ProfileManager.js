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
      this.setState({ isEditing: true });
    });

    this.edit.on("cancel", () => {
      this.setState({ isEditing: false });
    });

    this.edit.on("save", (profile) => {
      if (pong42.player.updatePlayerInformations(profile))
        this.setState({ isEditing: false });
      console.log(pong42.player);
      this.render(this.container);
    });
  }
  updateProfile = (newProfile) => {
    const updateAPI = pong42.player.updatePlayerInformations(newProfile);
    if (updateAPI) this.setState({ isEditing: false, profile: newProfile });
  };
  render(container) {
    this.container = container;
    const activeComponent = this.state.isEditing ? this.edit : this.view;
    activeComponent.setState(this.state.profile);
    activeComponent.render(container);
  }
}

export default ProfileManager;
