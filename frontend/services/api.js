
import Toast from "../components/toast.js";
import { ENV } from "../env.js";

class Api {
  constructor() {
    this.baseUrl = `${ENV.API_URL}`;
    this.urlAuthDjangoLogout = `${ENV.API_URL}${ENV.URL_AUTH_DJANGO_LOGOUT}`;
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
	console.log(`apiFetch called with:`, { url, auth, method, data, isFile });
    try {
      const fetchUrl = this.makeUrl(url);
      const headers = this.makeHeader(data, auth, method, isFile);
      console.log(`Fetching: ${fetchUrl}`, headers);
		const response = await fetch(fetchUrl, headers);
		console.log("Response received:", response);

      // For logout, accept any successful response
      if (url === this.urlAuthDjangoLogout) {
        return response.ok;
      }
      if (response.status === 400) {
        const awaitResponse = await response.json();
        throw new Error(awaitResponse.error);
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
      if (response.status === 404) {
        const toast = new Toast("API error", "Resource not found", "error");
        toast.show();
        throw new Error("Resource not found");
      }
      // Check if response is ok
      if (!response.ok) {
        console.log("Response error:", response);
        const awaitResponse = await response.json();
        throw new Error(`${awaitResponse.message}`);
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
