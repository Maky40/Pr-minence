import { getCookie, setCookie, eraseCookie } from "../utils/cookie.js";

const API_URL = "https://localhost";
const LoginURL = `${API_URL}/authentication/login/`;
const logoutURL = `${API_URL}/authentication/logout/`;
const RegisterURL = `${API_URL}/authentication/signup/`;
const RefreshURL = `${API_URL}/auth/refresh`;
const getMyInfoURL = `${API_URL}/player`;
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
      const headers = {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      };
      const response = await fetch(getMyInfoURL, headers);
      if (!response.ok) throw new Error("No user found in API");
      const data = await response.json();
      if (data.status === 200) {
        this.setSession(data);
        console.log("Auth state restored from API");
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
      const response = await fetch(LoginURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error("Login failed");
      const data = await response.json();
      this.setSession(data);
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async registerUser(userData) {
    const response = await fetch(RegisterURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userData.email,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        password: userData.password,
      }),
    });
    if (!response.ok) throw new Error("Registration failed");
    console.log("Register response:", response);
    const data = await response.json();
    if (data.status !== 201) {
      console.error("Registration failed:", data.errors);
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
    changePage("#home");
  }

  async setSession(data) {
    const player = data.player;
    console.log("Player:", player);
    this.authenticated = true;
    this.user = player;
    this.notifyListeners("login");
  }

  async logout() {
    const headers = {
      method: "GET",
    };
    const response = await fetch(logoutURL, headers);
    console.log("Logout response:", response);
    if (!response.ok) throw new Error("Logout failed");
    this.authenticated = false;
    this.user = null;
    this.notifyListeners("logout");
    changePage("#home");
  }

  async refreshSession() {
    try {
      const response = await fetch(RefreshURL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.refreshToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Token refresh failed");

      const data = await response.json();
      this.setSession(data);
      return data;
    } catch (error) {
      this.logout();
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
    console.log("Auth event:", event);
    this.listeners.forEach((callback) => callback(event));
  }

  async updateProfile(userData) {
    try {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) throw new Error("Profile update failed");

      const updatedUser = await response.json();
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
