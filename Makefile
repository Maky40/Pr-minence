# Nom de ton projet ou de tes services Docker
PROJECT_NAME = transcendance

# Services Docker (à ajuster selon tes services)
DOCKER_COMPOSE = docker compose
DOCKER_COMPOSE_FILE = docker-compose.yml

# Commandes
NGINX_SCRIPT = nginx/generate_nginx_conf.sh  # Chemin vers ton script .sh qui génère nginx.conf

.PHONY: build up start stop restart logs clean create_nginx_conf

# Cible par défaut (si tu fais simplement "make")
all: build

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
