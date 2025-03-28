#!/bin/bash

# Informations de votre compte No-IP
USERNAME="maretin@protonmail.com"
PASSWORD="PDxRLT23@9K3*2"
HOSTNAME="42pong.ddns.net"  # Remplacez par votre nom d'hôte No-IP

# IP privée que vous voulez envoyer à No-IP (par exemple, une IP dans votre réseau local)
PRIVATE_IP="10.11.1.6"  # Remplacez par l'adresse IP privée que vous souhaitez utiliser

# URL de l'API No-IP pour la mise à jour de l'IP
URL="https://dynupdate.no-ip.com/nic/update?hostname=$HOSTNAME&myip=$PRIVATE_IP"

# Mise à jour de l'adresse IP
update_ip() {
    RESPONSE=$(curl -u $USERNAME:$PASSWORD "$URL")
    echo "Réponse de No-IP : $RESPONSE"
}

# Exécution de la mise à jour
update_ip