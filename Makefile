# Nom de ton projet ou de tes services Docker
PROJECT_NAME = transcendance

# Services Docker (à ajuster selon tes services)
DOCKER_COMPOSE = docker compose
DOCKER_COMPOSE_FILE = docker-compose.yml

# Commandes
NGINX_SCRIPT = nginx/generate_nginx_conf.sh  # Chemin vers ton script .sh qui génère nginx.conf

# No-IP DUC Configuration
NOIP_VERSION = 3.3.0
NOIP_TARBALL = noip-duc_$(NOIP_VERSION).tar.gz
NOIP_FOLDER = noip-duc_$(NOIP_VERSION)
NOIP_INSTALL_DIR = $(HOME)/.local/noip  # Installation dans le répertoire local
NOIP_BINARY = $(NOIP_INSTALL_DIR)/noip-duc
# Variables pour ARM
ARCH := $(shell uname -m)
NOIP_ARCH := amd64 # Default arch
ifeq ($(ARCH),armv7l) # 32-bit ARM
	NOIP_ARCH := armhf
endif
ifeq ($(ARCH),aarch64) # 64-bit ARM
	NOIP_ARCH := arm64
endif
NOIP_DEB = noip-duc_$(NOIP_VERSION)_$(NOIP_ARCH).deb

# Fichier de configuration No-IP (à adapter)
NOIP_CONF = noip.conf

.PHONY: build up start stop restart logs clean create_nginx_conf install_noip configure_noip start_noip

# Cible par défaut (si tu fais simplement "make")
all: build

# Build Docker images et démarre les conteneurs
build: create_nginx_conf install_noip configure_noip start_noip
	@echo "Building Docker images and starting containers..."
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d --build

# Démarre les conteneurs en arrière-plan
up: create_nginx_conf install_noip configure_noip start_noip
	@echo "Starting Docker containers..."
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d

# Démarre les conteneurs en mode interactif
start: create_nginx_conf install_noip configure_noip start_noip
	@echo "Starting Docker containers in interactive mode..."
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up

# Arrêter les conteneurs en cours
stop:
	@echo "Stopping Docker containers..."
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down

# Redémarre les conteneurs
restart: stop up

# Voir les logs des conteneurs
logs:
	@echo "Displaying logs from Docker containers..."
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs -f

# Nettoie les conteneurs, réseaux, volumes et images inutilisés
fclean:
	@echo "Cleaning up Docker environment ..."
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down --volumes --rmi all --remove-orphans
	@echo "Cleanup complete!"

# Crée le fichier nginx.conf
create_nginx_conf:
	@echo "Creating nginx.conf using the script..."
	@bash $(NGINX_SCRIPT)

# Installation de No-IP DUC dans un répertoire local
install_noip:
	@echo "Installing No-IP DUC locally..."
	@if [ ! -d "$(NOIP_INSTALL_DIR)" ]; then \
		mkdir -p $(NOIP_INSTALL_DIR); \
		wget --content-disposition https://www.noip.com/download/linux/latest -O $(NOIP_TARBALL); \
		tar xf $(NOIP_TARBALL); \
		cd $(NOIP_FOLDER)/binaries; \
		dpkg -x $(NOIP_DEB) $(NOIP_INSTALL_DIR); \
		cd ../..; \
		rm -rf $(NOIP_FOLDER); \
		rm -f $(NOIP_TARBALL); \
	else \
		echo "No-IP DUC is already installed in $(NOIP_INSTALL_DIR)"; \
	fi

# Configuration de No-IP (nécessite un fichier noip.conf pré-configuré)
configure_noip:
	@echo "Configuring No-IP DUC..."
	@if [ ! -f "$(NOIP_CONF)" ]; then \
		echo "Error: $(NOIP_CONF) not found.  Please create it."; \
		exit 1; \
	fi
	@echo "Copying configuration file..."
	@cp $(NOIP_CONF) $(NOIP_INSTALL_DIR)/etc/no-ip2.conf

# Démarrage de No-IP DUC
start_noip:
	@echo "Starting No-IP DUC..."
	@$(NOIP_BINARY) -c $(NOIP_INSTALL_DIR)/etc/no-ip2.conf

re: fclean
	@echo "Rebuilding project..."
	@$(MAKE)
	@echo "Rebuild complete!"
