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
DNS_NAME="42PONG.local"
SERVER_IP=$(get_local_ip)

# Vérifier si une adresse IP a été trouvée
if [ -z "$SERVER_IP" ]; then
    echo "Impossible de détecter l'adresse IP."
    exit 1
fi

# Remplacer la variable ${SERVER_IP} dans le modèle et créer nginx.conf
# if [ -f ./nginx/nginx.template.conf ]; then
#     sed "s/\${SERVER_IP}/$DNS_NAME/g" ./nginx/nginx.template.conf > ./nginx/nginx.conf
#     echo "Fichier nginx.conf généré avec l'adresse IP : $DNS_NAME"
# else
#     echo "Le fichier template ./nginx/nginx.template.conf n'existe pas."
#     exit 1
# fi

if grep -q "42PONG.local" /etc/hosts; then
    # Mettre à jour l'entrée existante
    sudo sed -i '' "s/.*42PONG.local/$SERVER_IP 42PONG.local/g" /etc/hosts
    echo "Entrée existante mise à jour dans /etc/hosts: $SERVER_IP 42PONG.local"
else
    # Ajouter une nouvelle entrée
    echo "$SERVER_IP 42PONG.local" | sudo tee -a /etc/hosts > /dev/null
    echo "Nouvelle entrée ajoutée dans /etc/hosts: $SERVER_IP 42PONG.local"
fi