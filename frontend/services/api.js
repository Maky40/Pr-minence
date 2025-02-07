import Toast from "../components/toast.js";

class Api {
  constructor() {
    this.baseUrl = "https://localhost";
    this.authentificatHeader = {
      credentials: "include",
    };
    this.simpleHeader = {};
  }
  makeUrl(path) {
    return `${this.baseUrl}${path}`;
  }
  makeHeader(data, auth, method, isFile = false) {
    let baseHeader = {
      method,
      credentials: auth ? "include" : undefined,
    };

    if (!isFile && data) {
      baseHeader.headers = { "Content-Type": "application/json" };
      baseHeader.body = JSON.stringify(data);
    } else if (isFile && data) {
      // Remove Content-Type header for FormData.
      // The browser will set it with the proper boundary.
      baseHeader.body = data;
    }

    return baseHeader;
  }

  async apiFetch(
    url,
    auth = false,
    method = "GET",
    data = null,
    isFile = false
  ) {
    try {
      const fetchUrl = this.makeUrl(url);
      const headers = this.makeHeader(data, auth, method, isFile);
      const response = await fetch(fetchUrl, headers);

      // For logout, accept any successful response
      if (url === "/authentication/logout/") {
        return response.ok;
      }

      // Check if response is ok
      if (!response.ok) {
        console.log("Response error:", response);
        const awaitResponse = await response.json();
        throw new Error(`${awaitResponse.message}`);
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
      console.log("Fetch error:", error.message);
      throw error;
    }
  }
}

const api = new Api();
export default api;
