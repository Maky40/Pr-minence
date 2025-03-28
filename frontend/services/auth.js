import pong42 from "./pong42.js";
import api from "./api.js";
import Toast from "../components/toast.js";
import WebSocketAPI from "./websocket.js";

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
		console.log("INIT API");
      const data = await api.apiFetch("/player/", true);
      if (data.status === 200) {
        this.setSession(data);
      } else {
		if (this.authenticated)
			this.notifyListeners("logout");
        console.error("No user found in API");
      }
    } catch (error) {
      this.authenticated = false;
      this.user = null;

      console.error("Failed to initialize auth state:", error);
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
      if (!this.checkCookie("jwt_token"))
        changePage(pong42.getCurrentPage() || "home");
      const jwt_token = this.getCookie("jwt_token");
      const decodedToken = JSON.parse(atob(jwt_token.split(".")[1]));
      if (decodedToken.twofa) changePage("#twofactor");
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
      console.error("Registration failed:", data.errors);
      const toast = new Toast("error", "Erreur d'inscription", "error");
      toast.show();
      let error = "";
      if (data.errors.email) {
        error = "<div>Email already exists</div>";
      }
      if (data.errors.username) {
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
	console.log("JE PASSE");
    const player = data.player;
    this.authenticated = true;
    this.user = player;
    pong42.player.setPlayerInformations(player);
    this.notifyListeners("login");
    if (!this.webSocketStatus) {
      this.webSocketStatus = new WebSocketAPI(this.urlwsauth);
      this.webSocketStatus.addMessageListener("message", (data) => {
        pong42.player.updateStatus("ON");
      });
    }
  }

  async logout() {
    try {
      const response = await api.apiFetch(this.urlauthdjangologout, true);
	if (this.authenticated == true){
		this.logoutAndNotify()}
      this.cleanupWebSockets();
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  logoutAndNotify() {
	try {
		console.log("JE SUIS DANS LOGOUTANDNOTIFY------------------------------------------------------")
		this.authenticated = false;
		this.user = null;
		const toast = new Toast("Success", "Déconnexion réussie", "success");
		toast.show();
		this.notifyListeners("logout");
		if (pong42.getCurrentPage() === "home")
			changePage("#");
		else
			changePage("#home");
	} catch (error) {
		console.error("Logout error:", error);
		throw error;
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
