export default class Component {
  constructor() {
    this.state = {};
    this.container = null;
    this.events = new Map();
  }

  on(eventName, callback) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    this.events.get(eventName).add(callback);
    return () => this.events.get(eventName).delete(callback);
  }

  emit(eventName, data) {
    if (!this.events) {
      console.warn("No events map initialized");
      return;
    }

    const handlers = this.events.get(eventName);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error("Error in event handler:", error);
        }
      });
    }
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
  }

  attachEventListeners() {
    // Override in child class
  }

  destroy() {
    this.events.clear();
    if (this.container) {
      this.container.innerHTML = "";
      this.container = null;
    }
  }
}
