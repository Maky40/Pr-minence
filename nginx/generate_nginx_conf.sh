#!/bin/bash

# Obtenir l'adresse IP locale
SERVER_IP=$(echo localhost)

# Vérifier si une adresse IP a été trouvée
if [ -z "$SERVER_IP" ]; then
    echo "Impossible de détecter l'adresse IP."
    exit 1
fi

# Remplacer la variable ${SERVER_IP} dans le modèle et créer nginx.conf
sed "s/\${SERVER_IP}/$SERVER_IP/g" ./nginx/nginx.template.conf > ./nginx/nginx.conf

echo "Fichier nginx.conf généré avec l'adresse IP : $SERVER_IP"
