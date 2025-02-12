import Component from "../../utils/Component.js";
import pong42 from "../../services/pong42.js";

class GameSearchFriendComponent extends Component {
  constructor() {
    super();
    this.state = {
      friends: [],
      selectedFriend: null,
      loading: true,
      error: null,
    };
  }

  async getFriends() {
    try {
      this.state.loading = true;
      // Update state without triggering a re-render
      this.state.friends = await pong42.player.getFriends();
      this.state.loading = false;
      // Manually update the content without calling render
      this.updateContent();
    } catch (error) {
      console.error("Failed to load friends:", error);
      this.state.error = "Impossible de charger la liste d'amis";
      this.state.loading = false;
      this.updateContent();
    }
  }

  // New method to update content without full re-render
  updateContent() {
    if (this.container) {
      this.container.innerHTML = this.template();
      this.attachEventListeners();
    }
  }

  // Separate method for event listeners
  attachEventListeners() {
    document.querySelectorAll(".friend-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const friendId = e.currentTarget.dataset.friendId;
        this.selectFriend(friendId);
      });
    });
  }

  afterRender() {
    // Only fetch friends once after initial render
    if (this.state.friends.length === 0) {
      this.getFriends();
    }
  }

  template() {
    if (this.state.loading) {
      return `
              <div class="container mt-5">
                  <div class="d-flex justify-content-center">
                      <div class="spinner-border text-primary"></div>
                  </div>
              </div>
          `;
    }

    return `
          <div class="container mt-5">
              <div class="card bg-dark">
                  <div class="card-header">
                      <h3 class="text-info">Qui va subir ta domination au pong ?</h3>
                  </div>
                  <div class="card-body">
                      ${
                        this.state.error
                          ? `<div class="alert alert-danger">${this.state.error}</div>`
                          : this.renderFriendsList()
                      }
                  </div>
              </div>
          </div>
      `;
  }

  renderFriendsList() {
    if (this.state.friends.length === 0) {
      return `<p class="text-center text-warning">Tes amis sont trop occupés... ou ils t'évitent.</p>`;
    }

    return `
          <div class="list-group">
              ${this.state.friends
                .map(
                  (friend) => `
                  <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center friend-item" 
                       data-friend-id="${friend.id}">
                      <div class="d-flex align-items-center">
                          <img src="${
                            friend.avatar
                          }" class="rounded-circle me-3" width="40">
                          <div>
                              <h6 class="mb-0">${friend.username}</h6>
                              <small class="text-${
                                friend.status === "ON" ? "success" : "danger"
                              }">
                                  ${
                                    friend.status === "ON"
                                      ? "Online"
                                      : "Offline"
                                  }
                              </small>
                          </div>
                      </div>
                      ${
                        friend.status === "ON"
                          ? `
                          <button class="btn btn-sm btn-primary">
                              Défier
                          </button>
                      `
                          : ""
                      }
                  </div>
              `
                )
                .join("")}
          </div>
      `;
  }
}

export default GameSearchFriendComponent;
