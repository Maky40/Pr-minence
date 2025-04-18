"""
Django settings for player project.

Generated by 'django-admin startproject' using Django 5.1.4.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.1/ref/settings/
"""

from pathlib import Path
from os import getenv
from dotenv import load_dotenv


# === 1. Chemins dynamiques ===
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/player/api/
PLAYER_DIR = BASE_DIR.parent  # backend/player/
BACKEND_DIR = PLAYER_DIR.parent  # backend/
PROJECT_ROOT = BACKEND_DIR.parent  # Racine du projet



CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

DATA_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024

DOTENV_PATH = BASE_DIR.parent.parent.parent / '.env'
load_dotenv(DOTENV_PATH)
IP_ADDRESS = getenv("IP_ADDRESS")
# === 2. Sécurité ===
SECRET_KEY = getenv("DJANGO_SECRET_KEY")  # Clé par défaut si non définie
DEBUG = True  # Toujours en mode debug pour le développement local
ALLOWED_HOSTS = [
    '*'     # Hôte utilisé dans votre conteneur Docker
]

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("redis", 6379)],
        },
    },
}

# === 3. Applications Django ===
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",  # Django REST Framework
    "api",  # Application spécifique au microservice player
]

# === 4. Middlewares ===
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# === 5. URLs et point d'entrée ===
ROOT_URLCONF = "api.urls"  # Chemin vers le fichier urls.py de l'application
WSGI_APPLICATION = "api.wsgi.application"



TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'api.wsgi.application'
# === 6. Base de données ===
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": getenv("POSTGRES_DB"),  # Nom de la base par défaut si non défini
        "USER": getenv("POSTGRES_USER"),  # Utilisateur par défaut
        "PASSWORD": getenv("POSTGRES_PASSWORD"),  # Mot de passe par défaut
        "HOST": getenv("POSTGRES_HOST", "db"),  # Hôte PostgreSQL (localhost)
        "PORT": getenv("POSTGRES_PORT", "5432")  # Port PostgreSQL
    }
}

# === 7. Validation des mots de passe ===
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# === 8. Internationalisation ===
LANGUAGE_CODE = "en-us"  # Langue par défaut
TIME_ZONE = "Europe/Paris"  # Zone horaire française
USE_I18N = True
USE_TZ = True

# === 9. Fichiers statiques et médias ===
STATIC_URL = "/static/"
STATIC_ROOT = PLAYER_DIR / "static/"
MEDIA_URL = "/player/media/"
MEDIA_ROOT = BASE_DIR / "media"




DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
# === 10. Authentification ===
AUTH_USER_MODEL = "api.Player"  # Modèle utilisateur personnalisé (Player)

PUBLIC_PLAYER_URL = F'https://{IP_ADDRESS}'
