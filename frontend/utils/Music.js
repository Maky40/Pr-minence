class Music {
  constructor() {
    this.countdownAudio = new Audio("/assets/start.mp3");
    this.themeAudio = new Audio("/assets/theme.mp3");
    this.finalAudio = new Audio("/assets/final.mp3");
    this.currentAudio = null;
  }

  async play(audioType) {
    try {
      if (this.currentAudio && !this.stopping) {
        this.stopping = true;
        await this.stop();
        this.stopping = false;
      }

      switch (audioType) {
        case "countdown":
          this.currentAudio = this.countdownAudio;
          break;
        case "theme":
          this.currentAudio = this.themeAudio;
          break;
        case "final":
          this.currentAudio = this.finalAudio;
          break;
        default:
          console.error("Unknown audio type:", audioType);
          return;
      }

      this.currentAudio.currentTime = 0;
      this.currentAudio.muted = false;

      // Attendre un peu avant de jouer le nouveau son
      await new Promise((resolve) => setTimeout(resolve, 100));
      await this.currentAudio.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      this.stopping = false;
    }
  }

  async mute() {
    if (this.currentAudio) {
      this.currentAudio.muted = true;
    }
  }

  async unmute() {
    if (this.currentAudio) {
      this.currentAudio.muted = false;
    }
  }

  async stop() {
    if (this.currentAudio) {
      this.currentAudio.pause(); // Arrête la lecture
      this.currentAudio.currentTime = 0; // Réinitialise la position de lecture
      this.currentAudio = null; // Libère la référence à l'audio
    }
  }

  startCountdown(callback, updateState) {
    this.play("countdown");

    const updateCountdown = () => {
      const timeLeft = Math.ceil(
        this.countdownAudio.duration - this.countdownAudio.currentTime
      );

      // Mettre à jour le state du composant avec le nouveau countdown
      if (updateState) {
        updateState(timeLeft);
      }

      if (timeLeft <= 0) {
        this.countdownAudio.removeEventListener("timeupdate", updateCountdown);
        this.play("theme");
        if (callback) callback();
      }
    };

    this.countdownAudio.addEventListener("timeupdate", updateCountdown);
  }
}

export default Music;
