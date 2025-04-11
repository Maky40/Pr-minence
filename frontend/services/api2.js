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
    try {
      const fetchUrl = this.makeUrl(url);
      const headers = this.makeHeader(data, auth, method, isFile);
      const response = await fetch(fetchUrl, headers);

      // For logout, accept any successful response
      if (url === this.urlAuthDjangoLogout) {
        return response.ok;
      }

      // Gestion améliorée des réponses 400
      if (response.status === 400) {
        try {
          // Clonons la réponse pour éviter les problèmes de "body already read"
          const clonedResponse = response.clone();
          const responseData = await clonedResponse.json();
          // Extraction intelligente du message d'erreur
          let errorMessage = "Bad request";

          if (responseData.error) {
            errorMessage = responseData.error;
          } else if (responseData.message) {
            errorMessage = responseData.message;
          } else if (responseData.detail) {
            errorMessage = responseData.detail;
          } else if (typeof responseData === "object") {
            // Pour les réponses avec des champs d'erreur multiples (comme les formulaires)
            errorMessage = Object.entries(responseData)
              .map(([field, errors]) => {
                if (Array.isArray(errors)) {
                  return `${field}: ${errors.join(", ")}`;
                } else {
                  return `${field}: ${errors}`;
                }
              })
              .join(" | ");
          }

          // Retourner un objet structuré pour une meilleure gestion côté client
          return {
            status: 400,
            success: false,
            message: errorMessage,
            errors: responseData,
            rawResponse: responseData,
          };
        } catch (parseError) {
          console.error("[API] Failed to parse 400 response:", parseError);

          // Essayer de récupérer le texte brut
          try {
            const textResponse = await response.clone().text();
            console.log("[API] 400 response text:", textResponse);

            const toast = new Toast(
              "Erreur de requête",
              textResponse || "Format de réponse invalide",
              "error"
            );
            toast.show();

            return {
              status: 400,
              success: false,
              message: textResponse || "Format de réponse invalide",
              errors: { _error: textResponse },
            };
          } catch (textError) {
            console.error("[API] Failed to get response text:", textError);
            throw new Error("Impossible de traiter la réponse du serveur");
          }
        }
      }

      // Les autres cas d'erreur restent inchangés
      if (response.status === 401) {
        const toast = new Toast(
          "Session expirée",
          "Veuillez vous reconnecter",
          "error"
        );
        toast.show();
        changePage("login");
        return { status: 401, success: false };
      }

      if (response.status === 404) {
        const toast = new Toast("Erreur API", "Ressource non trouvée", "error");
        toast.show();
        return { status: 404, success: false, message: "Resource not found" };
      }

      // Check if response is ok
      if (!response.ok) {
        // Gestion spécifique des erreurs de serveur (5xx)
        if (response.status >= 500) {
          // Créer un message d'erreur approprié selon le code d'erreur
          let errorMessage;
          switch (response.status) {
            case 502:
              errorMessage =
                "Erreur de passerelle (Bad Gateway). Le serveur API est probablement indisponible.";
              break;
            case 503:
              errorMessage =
                "Service temporairement indisponible. Veuillez réessayer plus tard.";
              break;
            case 504:
              errorMessage =
                "Délai d'attente de la passerelle dépassé. Le serveur API met trop de temps à répondre.";
              break;
            default:
              errorMessage = `Erreur serveur (${response.status}). Veuillez réessayer plus tard.`;
          }

          // Afficher un toast avec le message d'erreur
          const toast = new Toast("Erreur serveur", errorMessage, "error");
          toast.show();

          // Retourner un objet d'erreur structuré
          return {
            status: response.status,
            success: false,
            message: errorMessage,
            errors: { _serverError: response.statusText },
          };
        }

        // Tenter de parser comme JSON pour les autres types d'erreurs
        try {
          const contentType = response.headers.get("content-type");

          // Si ce n'est pas du JSON, ne pas essayer de parser
          if (contentType && !contentType.includes("application/json")) {
            const errorText = await response.text();

            const errorMessage = `Erreur ${response.status}: ${response.statusText}`;
            const toast = new Toast("Erreur API", errorMessage, "error");
            toast.show();

            return {
              status: response.status,
              success: false,
              message: errorMessage,
              rawText: errorText.substring(0, 500),
            };
          }

          // Tenter de parser comme JSON
          const errorData = await response.json();
          const errorMessage =
            errorData.message || errorData.detail || "Erreur serveur";

          const toast = new Toast("Erreur API", errorMessage, "error");
          toast.show();

          return {
            status: response.status,
            success: false,
            message: errorMessage,
            errors: errorData,
          };
        } catch (parseError) {
          // Si on ne peut pas parser la réponse comme JSON
          console.error("[API] Failed to parse error response:", parseError);

          try {
            const errorText = await response.text();
            const errorMessage = `Erreur ${response.status}: ${response.statusText}`;
            const toast = new Toast("Erreur API", errorMessage, "error");
            toast.show();

            return {
              status: response.status,
              success: false,
              message: errorMessage,
              rawText: errorText.substring(0, 500),
            };
          } catch (textError) {
            console.error("[API] Failed to read error response:", textError);

            const errorMessage = `Erreur ${response.status} - Impossible de lire la réponse`;
            const toast = new Toast("Erreur API", errorMessage, "error");
            toast.show();

            return {
              status: response.status,
              success: false,
              message: errorMessage,
            };
          }
        }
      }
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const jsonResponse = await response.json();
        return {
          status: response.status,
          success: true,
          data: jsonResponse,
        };
      } else if (response.status === 204) {
        return { status: 204, success: true, data: null }; // No content
      } else if (contentType && contentType.includes("text/html")) {
        return { status: response.status, success: true }; // HTML response
      } else {
        // Tentative de récupération du texte
        const text = await response.text();
        // Si ça ressemble à du JSON, essayer de le parser
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          try {
            const jsonData = JSON.parse(text);
            return {
              status: response.status,
              success: true,
              data: jsonData,
            };
          } catch (e) {
            console.error("[API] Failed to parse as JSON:", e);
          }
        }

        return {
          status: response.status,
          success: true,
          data: text,
        };
      }
    } catch (error) {
      console.error("[API] Fetch error:", error);
      const toast = new Toast("Erreur de connexion", error.message, "error");
      toast.show();
      throw error;
    }
  }
}

const api = new Api();
export default api;
