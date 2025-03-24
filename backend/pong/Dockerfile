# Utiliser l'image officielle Python comme base
FROM python:3.11-slim

# Définir le répertoire de travail
WORKDIR /usr/src/app

# Copier le fichier requirements.txt dans le conteneur
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier tout le code source dans le conteneur
COPY . .

# Définir les variables d'environnement pour Django
ENV PYTHONUNBUFFERED=1

# Exposer le port 8000 pour le serveur Django
EXPOSE 8003

# Commande par défaut pour démarrer Django après les migrations
CMD ["sh", "-c", "daphne -e ssl:8003:privateKey=/etc/nginx/certs/server.key:certKey=/etc/nginx/certs/server.crt -b 0.0.0.0 api.asgi:application"]
