export default class Component {
  constructor() {
    this.state = {};
    this.container = null;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    if (this.container) this.update();
  }

  beforeRender() {
    // Hook before rendering
  }

  afterRender() {
    // Hook after rendering
  }

  template() {
    return "";
  }

  update() {
    if (this.container) {
      this.render(this.container);
      this.afterRender();
    }
  }

  render(container) {
    if (!container) throw new Error("Container is required");
    this.container = container;
    this.beforeRender();
    container.innerHTML = this.template();
    this.attachEventListeners();
    this.afterRender();
    console.log("Component rendered:", this.constructor.name, this.state);
  }

  attachEventListeners() {
    // Override in child class
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = "";
      this.container = null;
    }
  }
}
