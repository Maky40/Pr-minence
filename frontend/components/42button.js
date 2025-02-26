import Component from "../utils/Component.js";
import { ENV } from "../env.js";

class Button42 extends Component {
  constructor(text = "S'inscrire avec 42") {
    super();
    this.text = text;
    this.authUrl = `${ENV.API_URL}${ENV.URL_AUTH_INTRA}`;
  }

  template() {
    return `
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-12">
                        <div class="d-grid gap-2">
                            <button class="btn btn-success px-5 py-3 rounded-pill shadow-sm align-items-center w-100"
                                onclick="window.location.href='${this.authUrl}'">
                                <img src="/assets/42_Logo.svg" 
                                    alt="42 Logo" 
                                    height="30"
                                    class="me-2" 
                                    style="filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(90%) contrast(95%); transition: filter 0.3s ease">
                                ${this.text}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  attachEventListeners() {
    const button = this.container.querySelector("button");
    button?.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = this.authUrl;
    });
  }
}

export default Button42;
