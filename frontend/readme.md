# Frontend Project Documentation

## Project Structure

- `pages/`: HTML templates
- `scripts/`: JavaScript files
- `styles/`: CSS stylesheets
- `services/`: API interactions
- `components/`: Reusable UI components
- `assets/`: Images and static resources

## Creating a New Page

### 1. HTML Template

Create your page template in `pages/` directory:

```html
<!-- Example: pages/mypage.html -->
<div class="mypage-container">
  <!-- Your HTML content -->
</div>
```

### 2. JavaScript File

Create corresponding JS file in `scripts/` directory:

```javascript
// Example: scripts/mypage.js
function init() {
  // Your initialization code
}

export { init };
```

### 3. Add Route

Add your route in `app.js`:

```javascript
const routes = {
  home: { template: "home.html" },
  score: { template: "score.html" },
  chat: { template: "chatBox.html" },
  connexion: { template: "connexion.html" },
  signup: { template: "signup.html" },
  game: { template: "game.html" },
  // Add your new route here
  mypage: { template: "mypage.html" },
};
```

## Link Handling

To maintain the Single Page Application behavior, links are intercepted to prevent page reloads. Use the `data-locallink` attribute on anchor tags:

```html
<a href="/home" data-locallink>Home</a>
```

The following JavaScript code handles these links:

```javascript
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-locallink]");
  if (link) {
    e.preventDefault();
    const hash = link.getAttribute("href");
    changePage(hash);
  }
});
```

The routing system uses a `changePage` function to handle navigation:

```javascript
window.changePage = (hash) => {
  window.location.hash = hash; // Updates URL
  router.handleRoute(); // Handles the new route
};
```

This function:

- Updates the URL hash without page reload
- Triggers the router to handle the new route
- Can be called programmatically: `changePage('/home')`

This ensures smooth navigation without page refreshes.

## Component System

### Base Component Class

The project uses a component-based architecture with state management:

```javascript
class Component {
  constructor() {
    this.state = {};
    this.container = null;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.update();
  }

  // Lifecycle hooks
  beforeRender() {} // Called before rendering
  afterRender() {} // Called after rendering
  attachEventListeners() {} // For event handling
}
```

### Component Lifecycle

1. Construction: Initialize state and props
2. beforeRender: Pre-render preparations
3. render: DOM updates
4. attachEventListeners: Setup event handlers
5. afterRender: Post-render operations

### Example Component (Button42)

```javascript
class Button42 extends Component {
  constructor(text) {
    super();
    this.text = text;
  }

  template() {
    return `
            <button class="btn btn-success">
                <img src="/assets/42_Logo.svg" alt="42 Logo">
                ${this.text}
            </button>`;
  }
}
```

### Creating New Components

1. Create a new class extending Component:

```javascript
import Component from "../utils/Component.js";

export default class MyComponent extends Component {
  constructor(text) {
    super();
    this.text = text;
  }

  template() {
    return `<div class="my-component">${this.text}</div>`;
  }
}
```

2. Using the component:

```javascript
import MyComponent from "../components/MyComponent.js";

function init() {
  const myComponent = new MyComponent("Hello World");
  myComponent.render(document.getElementById("target-container"));
}
```

This component system allows for:

- Reusable UI elements
- Consistent rendering patterns
- Easy maintenance and updates
- Clean separation of concerns

## Progress Status

### Completed Features

- ✅ Homepage
- ✅ Scores page
- ✅ Login system
- ✅ Basic registration
- ✅ 🔄 Registration System
- ✅ Complete signup process
- 🔐 Authentication
  - Connected/Disconnected state management
- ✅ Profile display (ui)
- 👤 Profile Management
  ✅ Profile picture management
  ✅ Profile editing
- 🔐 Authentication
  - Protected routes

### In progress Features

- 👤 Profile Management
  - Add password change (ui)
  - double authentification management.

### Todo List

- 🏆 Tournament System
  - Tournament creation
  - Tournament participation
  - Tournament listing/browsing
- 🔐 Authentication
  - Connected/Disconnected state management
  - Authorization levels

## Development Guidelines

- Place API calls in `services/` directory
- Use components for reusable UI elements
- Keep styles organized in `styles/` directory
- Store media assets in `assets/` directory
