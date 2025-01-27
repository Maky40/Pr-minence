export default class Avatar {
  constructor(imageUrl, userName, options = {}) {
    this.imageUrl = imageUrl;
    this.userName = userName;
    this.size = options.size || "30";
    this.showName = options.showName !== false;
    this.classes = options.classes || "";
  }

  render() {
    return `
            <div class="avatar-container d-flex align-items-center ${
              this.classes
            }">
                <img src="${this.imageUrl}" 
                     alt="${this.userName}" 
                     width="${this.size}" 
                     class="me-2 rounded-circle avatar-image"
                     onerror="this.src='assets/default.png'">
                ${
                  this.showName
                    ? `<span class="avatar-name">${this.userName}</span>`
                    : ""
                }
            </div>
        `;
  }
}
