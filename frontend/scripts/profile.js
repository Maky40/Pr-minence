import ProfileManager from "../components/Profile/ProfileManager.js";
import pong42 from "../services/pong42.js";

const init = () => {
  const content = document.getElementById("content");
  const profileManager = new ProfileManager();

  // Set initial state with user data
  console.log(pong42.player);
  profileManager.setState({
    profile: pong42.player,
    isEditing: false,
  });

  // Render profile manager
  profileManager.render(content);
};

export { init };
