const API_URL = "https://dummyjson.com";
const LoginURL = `${API_URL}/auth/login`;
const RegisterURL = `${API_URL}/auth/register`;
const RefreshURL = `${API_URL}/auth/refresh`;
class Auth {
  constructor() {
    this.authenticated = false;
    this.user = null;
    this.token = null;
    this.refreshToken = null;
    this.listeners = new Set();
    this.initFromStorage();
  }

  initFromStorage() {
    try {
      // Get token
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found in storage");
        return;
      }

      // Get and parse user data
      let user = null;
      try {
        const userJSON = localStorage.getItem("user");
        if (!userJSON) {
          console.log("No user data found in storage");
          return;
        }
        user = JSON.parse(userJSON);
      } catch (parseError) {
        console.error("Failed to parse user data:", parseError);
        localStorage.removeItem("user"); // Clean invalid data
        return;
      }

      // Validate user object
      if (!user || !user.id || !user.username) {
        console.error("Invalid user data structure");
        return;
      }

      // Set authenticated state
      this.authenticated = true;
      this.token = token;
      this.user = user;
      console.log("Auth state restored successfully");
    } catch (error) {
      this.authenticated = false;
      this.token = null;
      this.user = null;
      console.error("Failed to initialize auth state:", error);
      // Clean up storage on error
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  async login(username, password) {
    try {
      const response = await fetch(LoginURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
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

  registerUser(userData) {
    return fetch(RegisterURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    }).then((response) => {
      if (!response.ok) throw new Error("Registration failed");
      return response.json();
    });
  }

  setSession(data) {
    this.authenticated = true;
    this.token = data.token;
    this.user = data.user;
    this.refreshToken = data.refreshToken;
    localStorage.setItem("token", data.accessToken);
    localStorage.setItem("user", JSON.stringify(data));
    this.notifyListeners("login");
  }

  logout() {
    this.authenticated = false;
    this.user = null;
    this.token = null;
    this.refreshToken = null;

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    this.notifyListeners("logout");
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
