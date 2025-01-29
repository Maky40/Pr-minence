class Player {
  constructor() {
    this.id = null;
    this.email = null;
    this.first_name = null;
    this.last_name = null;
    this.username = null;
    this.avatar = null;
    this.champions = 0;
    this.wins = 0;
    this.losses = 0;
    this.two_factor = false;
    this.status = "OF";
  }

  async init() {
    try {
      const response = await fetch(PlayerURL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to initialize player state");
      if (data.status === 401) {
        changepage("#connexion");
      }

      const data = await response.json();
      this.setSession(data);
    } catch (error) {
      console.error("Failed to initialize player state:", error);
    }
  }
}
