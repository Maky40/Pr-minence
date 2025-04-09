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

.PHONY: build up start stop restart logs clean create_nginx_conf

# Cible par défaut (si tu fais simplement "make")
all: ssl-certs build 

# Build Docker images et démarre les conteneurs
build: create_nginx_conf
	@echo "Building Docker images and starting containers..."
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d --build

# Démarre les conteneurs en arrière-plan
up: create_nginx_conf
	@echo "Starting Docker containers..."
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d

# Démarre les conteneurs en mode interactif
start: create_nginx_conf
	@echo "Starting Docker containers in interactive mode..."
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up

# Arrêter les conteneurs en cours
stop:
	@echo "Stopping Docker containers..."
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down

# Redémarre les conteneurs
restart: stop up

ssl-certs:
	@if [ ! -f nginx/certs/private.key ] && [ ! -f nginx/certs/certificate.crt ]; then \
		echo "$(GREEN)SSL certificates not found, generating...$(NC)"; \
		mkdir -p nginx/certs; \
		openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
		-keyout nginx/certs/private.key -out nginx/certs/certificate.crt \
		-config nginx/ssl.conf; \
	else \
		echo "$(GREEN)SSL certificates already exist.$(NC)"; \
	fi


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


re: fclean
	@echo "Rebuilding project..."
	@$(MAKE)
	@echo "Rebuild complete!"
