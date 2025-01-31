import pong42 from "./pong42.js";
import api from "./api.js";
import Toast from "../components/toast.js";

class Auth {
  constructor() {
    this.authenticated = false;
    this.user = null;
    this.jwt_token = null;
    this.refreshToken = null;
    this.listeners = new Set();
    this.initFromAPI();
  }

  async initFromAPI() {
    try {
      const data = await api.apiFetch("/player/", true);
      if (data.status === 200) {
        this.setSession(data);
      } else {
        console.error("No user found in API");
      }
    } catch (error) {
      this.authenticated = false;
      this.user = null;

      console.error("Failed to initialize auth state:", error);
    }
  }

  async login(email, password) {
    try {
      const data = await api.apiFetch("/authentication/login/", false, "POST", {
        email,
        password,
      });
      console.log("======Login successful:", data);
      if (data.status !== 200) {
        console.error("Login failed:", data.errors);
        const toast = new Toast("error", "Erreur de connexion", "error");
        toast.show();
        throw new Error("Login failed");
      }
      const toast = new Toast(
        "Bienvenue",
        "Bienvenue " + pong42.player.username,
        "info"
      );
      toast.show();
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async registerUser(userData) {
    const data = await api.apiFetch("/authentication/signup/", false, "POST", {
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
    const player = data.player;
    this.authenticated = true;
    this.user = player;
    pong42.player.setPlayerInformations(player);
    this.notifyListeners("login");
  }

  async logout() {
    try {
      const response = await api.apiFetch("/authentication/logout/", true);
      this.authenticated = false;
      this.user = null;
      const toast = new Toast("Success", "Déconnexion réussie", "success");
      toast.show();
      this.notifyListeners("logout");
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
