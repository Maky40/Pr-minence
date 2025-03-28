#!/bin/bash
# Informations de votre compte No-IP
source .env

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

if [ -z "$HOSTNAME_noip" ]; then
    echo "Erreur : La variable HOSTNAME_noip n'est pas définie dans le fichier .env"
    exit 1
fi

rm nginx/nginx.conf
sed "s/%SERVEUR_NAME%/$HOSTNAME_noip/g" nginx/nginx.template.conf > nginx/nginx.conf  
# Obtenir l'IP actuelle
SERVER_IP=$(get_local_ip)

if [ -z "$SERVER_IP" ]; then
    echo "Impossible de détecter l'adresse IP."
    exit 1
fi

# URL de l'API No-IP pour la mise à jour de l'IP
URL="https://dynupdate.no-ip.com/nic/update?hostname=$HOSTNAME_noip&myip=$SERVER_IP"

# Mise à jour de l'adresse IP
update_ip() {
    RESPONSE=$(curl -u $USERNAME_noip:$PASSWORD_noip "$URL")
    echo "Réponse de No-IP : $HOSTNAME_noip"
}

# Exécution de la mise à jour
update_ip