class Music {
  constructor() {
    this.countdownAudio = new Audio("/assets/start.mp3");
    this.themeAudio = new Audio("/assets/theme.mp3");
    this.finalAudio = new Audio("/assets/final.mp3");
    this.currentAudio = null;
  }

  play(audioType) {
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
    this.currentAudio.play();
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio.muted = true;
    }
  }
}

export default Music;
