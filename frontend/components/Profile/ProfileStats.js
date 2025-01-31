import Component from "../../utils/Component.js";

class ProfileStats extends Component {
  template() {
    return `
<!-- Scores Tables -->
<div class="row">
    <!-- Solo Scores -->
    <div class="col-md-6 mb-4">
        <div class="card shadow-sm">
            <div class="card-header">
                <h3 class="card-title mb-0">Scores Solo</h3>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Score</th>
                                <th>Résultat</th>
                            </tr>
                        </thead>
                        <tbody id="soloScores"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <!-- Tournament Scores -->
    <div class="col-md-6 mb-4">
        <div class="card shadow-sm">
            <div class="card-header">
                <h3 class="card-title mb-0">Tournois</h3>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Tournoi</th>
                                <th>Position</th>
                                <th>Score</th>
                            </tr>
                        </thead>
                        <tbody id="tournamentScores"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
<!-- End Scores Tables -->`;
  }
}

export default ProfileStats;
