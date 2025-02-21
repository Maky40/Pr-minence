#!/bin/bash

# Fonction pour obtenir l'adresse IP locale
get_local_ip() {
    # Essayer d'abord avec 'ip' (Linux)
    if command -v ip &> /dev/null; then
        SERVER_IP=$(ip -o route get to 8.8.8.8 | sed -n 's/.*src \([0-9.]\+\).*/\1/p')
    # Sinon, essayer avec 'ifconfig' (macOS et anciens Linux)
    elif command -v ifconfig &> /dev/null; then
        SERVER_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1')
    # Sinon, utiliser 'hostname' (moins fiable)
    else
        SERVER_IP=$(hostname -I | awk '{print $1}')
    fi

    # Si aucune IP n'est trouvée, retourner localhost
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="localhost"
    fi

    echo "$SERVER_IP"
}

# Obtenir l'adresse IP locale
SERVER_IP=$(get_local_ip)

# Vérifier si une adresse IP a été trouvée
if [ -z "$SERVER_IP" ]; then
    echo "Impossible de détecter l'adresse IP."
    exit 1
fi

# Remplacer la variable ${SERVER_IP} dans le modèle et créer nginx.conf
if [ -f ./nginx/nginx.template.conf ]; then
    sed "s/\${SERVER_IP}/$SERVER_IP/g" ./nginx/nginx.template.conf > ./nginx/nginx.conf
    echo "Fichier nginx.conf généré avec l'adresse IP : $SERVER_IP"
else
    echo "Le fichier template ./nginx/nginx.template.conf n'existe pas."
    exit 1
fi