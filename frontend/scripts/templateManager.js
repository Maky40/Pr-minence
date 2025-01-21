export default class TemplateManager {
  constructor(contentElement) {
    this.contentElement = contentElement;
    this.loadedScripts = new Set();
  }

  async loadTemplate(templateFile) {
    try {
      const response = await fetch(`pages/${templateFile}`);
      if (!response.ok) throw new Error('Template non trouvé');

      const html = await response.text();

      // Créer un conteneur temporaire
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // Extraire les scripts avant de vider le contenu
      const scripts = Array.from(temp.getElementsByTagName('script'));

      // Vider le contenu actuel
      this.contentElement.innerHTML = '';

      // Copier le contenu HTML
      temp.childNodes.forEach(node => {
        if (node.nodeName !== 'SCRIPT') {
          this.contentElement.appendChild(node.cloneNode(true));
        }
      });

      // Exécuter les scripts après que le DOM soit mis à jour
      await Promise.all(scripts.map(script => this.executeScript(script)));

    } catch (error) {
      console.error('Erreur lors du chargement du template:', error);
      this.contentElement.innerHTML = '<p>Erreur lors du chargement de la page.</p>';
    }
  }

  executeScript(oldScript) {
    return new Promise((resolve, reject) => {
      const newScript = document.createElement('script');

      // Copier les attributs
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });

      // Si c'est un script externe
      if (oldScript.src) {
        newScript.onload = resolve;
        newScript.onerror = reject;
      } else {
        // Si c'est un script inline
        newScript.textContent = oldScript.textContent;
        resolve();
      }

      this.contentElement.appendChild(newScript);
    });
  }
}