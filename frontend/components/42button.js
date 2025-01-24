import Component from '../utils/Component.js';

class Button42 extends Component {
  constructor(text = "S'inscrire avec 42") {
      super();
      this.text = text;
  }

  template() {
      return `
          <button class="btn btn-success btn-lg px-5 py-3 rounded-pill shadow-sm" 
                  onclick="window.location.href='https://localhost/authentication/intra/'">
              <img src="/assets/42_Logo.svg" 
                   alt="42 Logo" 
                   height="30"
                   class="me-2" 
                   style="filter: brightness(0.8); transition: filter 0.3s ease"
                   onmouseover="this.style.filter='brightness(1)'"
                   onmouseout="this.style.filter='brightness(0.8)'">
              ${this.text}
          </button>`;
  }
}

export default Button42;