import Component from "../utils/Component.js";

class FriendsList extends Component {
  template() {
    return `
    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h3 class="card-title mb-0">Amis</h3>
        <button id="addFriendBtn" class="btn btn-sm btn-primary d-none">
          <i class="fas fa-user-plus"></i> Ajouter
        </button>
      </div>
      <div class="card-body">
        <div class="row g-3" id="friendsList"></div>
      </div>
    </div>`;
  }
}

export default FriendsList;
