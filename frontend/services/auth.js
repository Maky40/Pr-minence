import pong42 from "./pong42.js";
import api from "./api2.js";
import Toast from "../components/toast.js";
import WebSocketAPI from "./websocket.js";
import Navbar from "../components/navbar.js";
class Auth {
  constructor() {
    this.authenticated = false;
    this.user = null;
    this.jwt_token = null;
    this.refreshToken = null;
    this.listeners = new Set();
    this.initFromAPI();
    this.urlwsauth = `${ENV.WS_URL_AUTH}`;
    this.urlauthdjango = `${ENV.URL_AUTH_DJANGO}`;
    this.urlauthdjangosignup = `${ENV.URL_AUTH_DJANGO_SIGNUP}`;
    this.urlauthdjangologout = `${ENV.URL_AUTH_DJANGO_LOGOUT}`;
    this.webSocketStatus = null;

    window.addEventListener("beforeunload", () => {
      this.cleanupWebSockets();
    });
  }

  cleanupWebSockets() {
    if (this.webSocketStatus) {
      console.log("Cleaning up authentication WebSocket connection");
      this.webSocketStatus.removeAllListeners();
      this.webSocketStatus.close();
      this.webSocketStatus = null;
    }
  }

  async initFromAPI() {
    try {
      const response = await api.apiFetch("/player/", true);
      console.log("Initializing auth state from API");
      if (response.status === 200) {
        const playerData = response.data || response;
        this.setSession(playerData);
      } else {
        if (this.authenticated) this.notifyListeners("logout");
        console.warn("No user found in API");
      }
    } catch (error) {
      this.authenticated = false;
      this.user = null;
      console.warn("Failed to initialize auth state:", error);
    }
  }

  getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  };

  checkCookie = (name) => {
    return document.cookie
      .split(";")
      .some((item) => item.trim().startsWith(name + "="));
  };

  async login(email, password) {
    try {
      const data = await api.apiFetch(this.urlauthdjango, false, "POST", {
        email,
        password,
      });
      if (data.status !== 200) {
        const toast = new Toast("error", "Erreur de connexion", "error");
        toast.show();
        throw new Error("Login failed");
      }

      // Check if the jwt_token cookie exists before proceeding
      if (!this.checkCookie("jwt_token")) {
        // If no token cookie, just navigate to the current page or home
        changePage(pong42.getCurrentPage() || "home");
      } else {
        // Only try to parse the token if it exists
        const jwt_token = this.getCookie("jwt_token");
        if (jwt_token) {
          try {
            const decodedToken = JSON.parse(atob(jwt_token.split(".")[1]));
            if (decodedToken && decodedToken.twofa) {
              changePage("#twofactor");
            } else {
              changePage(pong42.getCurrentPage() || "home");
            }
          } catch (tokenError) {
            console.error("Error parsing JWT token:", tokenError);
            changePage(pong42.getCurrentPage() || "home");
          }
        } else {
          changePage(pong42.getCurrentPage() || "home");
        }
      }
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async login2FA(code) {
    try {
      const data = { otp_code: code };
      const response = await api.apiFetch(
        "/authentication/verify-2fa/",
        true,
        "POST",
        data
      );
      if (response.status !== 200) {
        console.error("2FA failed:", response.errors);
        const toast = new Toast("error", "Erreur de code 2fa", "error");
        toast.show();
        throw new Error("2FA failed");
      }
      changePage("#home");
    } catch (error) {
      console.error("2FA error:", error);
      throw error;
    }
  }

  async registerUser(userData) {
    const data = await api.apiFetch(this.urlauthdjangosignup, false, "POST", {
      email: userData.email,
      username: userData.username,
      first_name: userData.first_name,
      last_name: userData.last_name,
      password: userData.password,
    });
    if (data.status !== 201) {
      const toast = new Toast("error", "Erreur d'inscription", "error");
      toast.show();
      let error = "";
      if (data.data.errors.email) {
        error = "<div>Email already exists</div>";
      }
      if (data.data.errors.username) {
        error += "<div>Username already exists</div>";
      }
      throw new Error(error);
    }
    await this.login(userData.email, userData.password);
    const toast = new Toast("Inscription", "Inscription validée", "info");
    toast.show();
    changePage("#home");
  }

  async setSession(data) {
    try {
      if (!data || data === undefined || !data.player) {
        console.log("No data provided for session setup");
        return;
      }
      const player = data.player;
      this.authenticated = true;
      this.user = player;

      // Check if pong42 is properly initialized first
      if (!pong42.player) {
        pong42.player = new Player();
      }
      // Only proceed with player operations if player exists
      if (pong42.player) {
        await pong42.player.init();
        await pong42.player.tournament.init();
        pong42.player.setPlayerInformations(player);
      } else {
        console.error("pong42.player is null, cannot initialize player data");
      }
      this.notifyListeners("login");
      // Initialize WebSocket status last after everything else is ready
      if (!this.webSocketStatus) {
        this.webSocketStatus = new WebSocketAPI(this.urlwsauth);

        // Use a callback that checks if player exists before using it
        this.webSocketStatus.addMessageListener("message", (data) => {
          if (pong42.player) {
            pong42.player.updateStatus("ON");
          }
        });
      }
    } catch (error) {
      console.error("Error during session setup:", error);
    }
  }

  async logout() {
    try {
      await api.apiFetch(this.urlauthdjangologout, true);
      this.logoutAndNotify();
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  logoutAndNotify() {
    try {
      // First notify listeners so components can clean up
      if (pong42.player.tournament) {
        pong42.player.tournament.destroy();
      }
      this.notifyListeners("logout");
      // Then clear authentication state
      this.authenticated = false;
      this.user = null;
      this.cleanupWebSockets();

      if (typeof pong42 !== "undefined" && pong42) {
        try {
          pong42.clearAllIntervals();
          pong42.reset();
        } catch (e) {
          console.warn("Error during pong42 cleanup:", e);
        }
      }

      // Finally change the page
      setTimeout(() => {
        changePage("#home");
      }, 10);
    } catch (error) {
      console.error("Logout error:", error);
      // Don't rethrow - we want to complete logout even if there are errors
    }
  }

  isAuthenticated() {
    return this.authenticated && this.token !== null;
  }

  getUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event) {
    this.listeners.forEach((callback) => callback(event));
  }

  async updateProfile(userData) {
    try {
      const bodyData = {
        email: userData.email,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        avatar: userData.avatar,
      };
      const updatedUser = await api.apiFetch(
        "/player/",
        true,
        "POST",
        bodyData
      );
      this.user = updatedUser;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      this.notifyListeners("profile_updated");
      return updatedUser;
    } catch (error) {
      console.error("Profile update error:", error);
      throw error;
    }
  }
}

const auth = new Auth();
export default auth;
