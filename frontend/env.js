const ENV = {
  API_URL: "https://localhost/",
  URL_AUTH_INTRA: "authentication/intra/",
  WS_URL_GAME: "wss://localhost/pong/ws/pong/",
  WS_URL_AUTH: "wss://localhost/authentication/ws/online/",
  URL_AUTH_DJANGO: "authentication/login/",
  URL_AUTH_DJANGO_SIGNUP: "/authentication/signup/",
  URL_AUTH_DJANGO_LOGOUT: "/authentication/logout/",
  DEFAULT_AVATAR: "player/static/api/images/default_avatar.png",
  DEBUG: true,
  // Ajoutez d'autres variables d'environnement ici
};

// Empêcher la modification des variables d'environnement
Object.freeze(ENV);

export { ENV };

window.ENV = ENV;
