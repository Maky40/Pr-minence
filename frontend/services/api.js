import Toast from "../components/toast.js";

class Api {
  constructor() {
    this.baseUrl = "https://localhost";
    this.authentificatHeader = {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    };
    this.simpleHeader = {
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
  makeUrl(path) {
    return `${this.baseUrl}${path}`;
  }
  makeHeader(data, auth, method) {
    const baseHeader = {
      ...(auth ? this.authentificatHeader : this.simpleHeader),
      method,
    };

    return data ? { ...baseHeader, body: JSON.stringify(data) } : baseHeader;
  }

  async apiFetch(url, auth = false, method = "GET", data = null) {
    try {
      const fetchUrl = this.makeUrl(url);
      const headers = this.makeHeader(data, auth, method);
      const response = await fetch(fetchUrl, headers);

      // For logout, accept any successful response
      if (url === "/authentication/logout/") {
        return response.ok;
      }

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      if (response.status === 401) {
        const toast = new Toast(
          "Session expired",
          "Please login again",
          "error"
        );
        toast.show();
        changePage("login");
      }
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else if (response.status === 204) {
        return null; // No content
      } else if (contentType && contentType.includes("text/html")) {
        return response.ok; // Return true for successful HTML responses
      } else {
        const text = await response.text();
        throw new Error(`Invalid response type: ${contentType}, body: ${text}`);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  }
}

const api = new Api();
export default api;
