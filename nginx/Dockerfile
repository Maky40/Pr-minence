# Utiliser une image officielle Nginx
FROM nginx:latest

# Copier les fichiers frontend dans le répertoire approprié du conteneur
COPY ./frontend /usr/share/nginx/html

# Copier le fichier de configuration nginx.conf dans le conteneur
COPY nginx.conf /etc/nginx/nginx.conf

# Copier les certificats SSL dans le conteneur
COPY ./certs /etc/nginx/certs

# Exposer le port 443 pour HTTPS
EXPOSE 443
