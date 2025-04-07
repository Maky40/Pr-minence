/**
 * Fonction de validation générique pour les données de formulaire
 * @param {string} type - Le type de la donnée (file, text, email, etc.)
 * @param {any} data - La donnée à valider (string, File, etc.)
 * @param {number} maxSize - La taille maximale autorisée (en octets pour les fichiers)
 * @param {number} maxLength - La longueur maximale autorisée pour un texte
 * @param {string} pattern - Expression régulière pour valider un email ou autre format spécifique
 * @returns {Object} - Objet contenant un message d'erreur et un booléen (isValid)
 */
function validateField(type, data, maxSize, maxLength, pattern) {
    // Validation de la taille des fichiers
    if (type === 'file' && data instanceof File) {
      if (data.size > maxSize) {
        return {
          isValid: false,
          message: `Le fichier est trop volumineux. Taille maximale: ${maxSize / 1024 / 1024} Mo.`
        };
      }
      return {
        isValid: true,
        message: 'Fichier valide.'
      };
    }
  
    // Validation de la longueur d'un texte
    if (type === 'text' && typeof data === 'string') {
      if (data.length > maxLength) {
        return {
          isValid: false,
          message: `Le texte dépasse la longueur autorisée. Longueur maximale: ${maxLength} caractères.`
        };
      }
      return {
        isValid: true,
        message: 'Texte valide.'
      };
    }
  
    // Validation d'un email
    if (type === 'email' && typeof data === 'string') {
      const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
      if (!emailPattern.test(data)) {
        return {
          isValid: false,
          message: "L'email n'est pas valide."
        };
      }
      return {
        isValid: true,
        message: 'Email valide.'
      };
    }
  
    // Validation avec un motif personnalisé (par exemple pour un format spécifique)
    if (pattern && typeof data === 'string') {
      const regex = new RegExp(pattern);
      if (!regex.test(data)) {
        return {
          isValid: false,
          message: "Le format de la donnée n'est pas valide."
        };
      }
      return {
        isValid: true,
        message: 'Format valide.'
      };
    }
  
    // Si le type est inconnu ou si les données ne correspondent pas aux critères
    return {
      isValid: false,
      message: 'Type de validation non pris en charge ou données incorrectes.'
    };
  }
  
export {validateField};
  