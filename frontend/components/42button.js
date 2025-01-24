import Component from '../utils/Component.js';

class Button42 extends Component {
  constructor(text = "S'inscrire avec 42") {
      super();
      this.text = text;
  }

  template() {
      return `
        <button class="btn btn-success btn-lg px-5 py-3 rounded-pill shadow-sm d-flex align-items-center"
            onclick="window.location.href='https://localhost/authentication/intra/'">
        <img src="/assets/42_Logo.svg" 
                alt="42 Logo" 
                height="30"
                class="me-2" 
                style="filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(90%) contrast(95%); transition: filter 0.3s ease">
        ${this.text}
        </button>
        `;
  }
}

export default Button42;