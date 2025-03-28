#!/bin/bash

# Fonction pour obtenir l'adresse IP locale
get_local_ip() {
    if command -v ip &> /dev/null; then
        SERVER_IP=$(ip -o route get to 8.8.8.8 | awk '{print $7}')
    elif command -v ifconfig &> /dev/null; then
        SERVER_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1')
    else
        SERVER_IP=$(hostname -I | awk '{print $1}')
    fi

    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="localhost"
    fi
    echo "$SERVER_IP"
}

# Obtenir l'IP actuelle
DNS_NAME="42pong.ddns.net"
SERVER_IP=$(get_local_ip)

if [ -z "$SERVER_IP" ]; then
    echo "Impossible de détecter l'adresse IP."
    exit 1
fi

# Supprimer toute ligne existante contenant 42pong.ddns.net
#sudo sed -i "/$DNS_NAME/d" /etc/hosts

# Ajouter une nouvelle entrée
#echo "$SERVER_IP $DNS_NAME" | sudo tee -a /etc/hosts > /dev/null
#echo "Mise à jour de /etc/hosts avec : $SERVER_IP $DNS_NAME"
