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
    mypage: { template: "mypage.html" }
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

## Progress Status

### Completed Features
- ✅ Homepage
- ✅ Scores page
- ✅ Login system
- ✅ Basic registration

### Todo List
- 🔄 Registration System
  - Complete signup process
  - Add password recovery
- 👤 Profile Management
  - Profile display
  - Profile editing
  - Profile picture management
- 🏆 Tournament System
  - Tournament creation
  - Tournament participation
  - Tournament listing/browsing
- 🔐 Authentication
  - Connected/Disconnected state management
  - Protected routes
  - Authorization levels

## Development Guidelines
- Place API calls in `services/` directory
- Use components for reusable UI elements
- Keep styles organized in `styles/` directory
- Store media assets in `assets/` directory