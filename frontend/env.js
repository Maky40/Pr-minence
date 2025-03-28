const API_HOST = "42pong.zapto.org:8443";

const ENV = {
  API_URL: `https://${API_HOST}/`,
  URL_AUTH_INTRA: "authentication/intra/",
  WS_URL_GAME: `wss://${API_HOST}/pong/ws/pong/`,
  WS_URL_AUTH: `wss://${API_HOST}/authentication/ws/online/`,
  WS_URL_CHAT: `wss://${API_HOST}/chat/ws/chat/`,
  URL_AUTH_DJANGO: "authentication/login/",
  URL_AUTH_DJANGO_SIGNUP: "/authentication/signup/",
  URL_AUTH_DJANGO_LOGOUT: "/authentication/logout/",
  DEFAULT_AVATAR: "player/static/api/images/default_avatar.png",
  DEBUG: true,
};

// Empêcher la modification des variables d'environnement
Object.freeze(ENV);

export { ENV };

window.ENV = ENV;
