export default class Component {
  constructor() {
    this.state = {};
    this.container = null;
    this.events = new Map();
    this.domEventListeners = [];
  }

  //Gestion des ecouteurs d'evenements du DOM
  attachEvent(element, type, handler) {
    if (!element) return null;

    element.addEventListener(type, handler);
    const listenerInfo = { element, type, handler };
    this.domEventListeners.push(listenerInfo);
    return listenerInfo;
  }

  // Nouvelle méthode pour détacher un seul écouteur
  detachEvent(listenerInfo) {
    if (!listenerInfo || !listenerInfo.element) return;

    listenerInfo.element.removeEventListener(
      listenerInfo.type,
      listenerInfo.handler
    );
    const index = this.domEventListeners.indexOf(listenerInfo);
    if (index !== -1) {
      this.domEventListeners.splice(index, 1);
    }
  }

  // Méthode pour détacher tous les écouteurs
  detachAllEvents() {
    this.domEventListeners.forEach(({ element, type, handler }) => {
      if (element) {
        element.removeEventListener(type, handler);
      }
    });
    this.domEventListeners = [];
  }

  // Méthode pour ajouter un écouteur d'événement personnalisé
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
    this.container.innerHTML = `<section id="content" class="py-4">
    <!-- Dynamic content will be inserted here -->
    </section>;`;
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
    this.detachAllEvents();
  }
}
