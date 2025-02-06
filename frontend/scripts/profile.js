import ProfileManager from "../components/Profile/ProfileManager.js";
import ProfileStats from "../components/Profile/ProfileStats.js";
import FriendsList from "../components/FriendsList.js";
import pong42 from "../services/pong42.js";
import auth from "../services/auth.js";
const init = () => {
  const profilInfoContainer = document.getElementById("profile-info");
  const profileStatsContainer = document.getElementById("profile-stats");
  const profileFriendsContainer = document.getElementById("profile-friends");

  // Initialize components
  const profileManager = new ProfileManager();
  profileManager.setState({
    profile: pong42.player,
    isEditing: false,
  });
  profileManager.render(profilInfoContainer);

  const profileStats = new ProfileStats();
  profileStats.render(profileStatsContainer);

  const friendsList = new FriendsList();
  friendsList.render(profileFriendsContainer);
  console.log("Profile initialized");
  console.log(pong42.player);
};

export { init };
