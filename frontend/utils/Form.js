/**
 * Fonction de validation générique pour les données de formulaire
 * @param {string} type - Le type de la donnée (file, text, email, etc.)
 * @param {any} data - La donnée à valider (string, File, etc.)
 * @param {number} maxSize - La taille maximale autorisée (en octets pour les fichiers)
 * @param {number} maxLength - La longueur maximale autorisée pour un texte
 * @param {string} pattern - Expression régulière pour valider un email ou autre format spécifique
 * @returns {Object} - Objet contenant un message d'erreur et un booléen (isValid)
 */
const _MAX_MAIL_LENGTH = 100;
const _MAX_USERNAME_LENGTH = 50;
function validateField(type, data, maxSize, maxLength, pattern) {
  // Validation de la taille des fichiers
  if (type === "file" && data instanceof File) {
    if (data.size > maxSize) {
      return {
        isValid: false,
        message: `Le fichier est trop volumineux. Taille maximale: ${
          maxSize / 1024 / 1024
        } Mo.`,
      };
    }
    return {
      isValid: true,
      message: "Fichier valide.",
    };
  }

  // Validation de la longueur d'un texte
  if (type === "text" && typeof data === "string") {
    if (data.length > maxLength) {
      return {
        isValid: false,
        message: `Le texte dépasse la longueur autorisée. Longueur maximale: ${maxLength} caractères.`,
      };
    }
    return {
      isValid: true,
      message: "Texte valide.",
    };
  }
  if (type === "username" && typeof data === "string") {
    const usernamePattern = /^[a-zA-Z0-9._-]+$/;
    if (!usernamePattern.test(data)) {
      return {
        isValid: false,
        message:
          "L'username n'est pas valide. Il doit contenir entre 3 et 50 caractères. Caractères autorisés : lettres, chiffres, tirets et underscores.",
      };
    }
    return {
      isValid: true,
      message: "Username valide.",
    };
  }
  if (type === "civil" && typeof data === "string") {
    const civilPattern = /^[A-Za-zÀ-ÿ' -]+$/;
    console.log(civilPattern.test(data), "datatest");
    if (!civilPattern.test(data)) {
      return {
        isValid: false,
        message:
          "Le prénom ou le nom n'est pas valide. Il doit contenir uniquement des lettres, des espaces, des apostrophes et des tirets.",
      };
    }
    return {
      isValid: true,
      message: "civil valide.",
    };
  }

  // Validation d'un email
  if (type === "email" && typeof data === "string") {
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailPattern.test(data) || data.length > _MAX_MAIL_LENGTH) {
      return {
        isValid: false,
        message: "L'email n'est pas valide.",
      };
    }
    return {
      isValid: true,
      message: "Email valide.",
    };
  }

  // Validation avec un motif personnalisé (par exemple pour un format spécifique)
  if (pattern && typeof data === "string") {
    const regex = new RegExp(pattern);
    if (!regex.test(data)) {
      return {
        isValid: false,
        message: "Le format de la donnée n'est pas valide.",
      };
    }
    return {
      isValid: true,
      message: "Format valide.",
    };
  }

  // Si le type est inconnu ou si les données ne correspondent pas aux critères
  return {
    isValid: false,
    message: "Type de validation non pris en charge ou données incorrectes.",
  };
}

export { validateField };
