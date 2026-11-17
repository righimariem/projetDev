"""
Django settings for config project (HOMEY).
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Secrets hors du code (Sprint 6 — sécurité) : variables d'environnement,
# avec repli de développement. En production : définir HOMEY_SECRET_KEY,
# HOMEY_DEBUG=0 et HOMEY_ALLOWED_HOSTS (US10.4).
SECRET_KEY = os.environ.get(
    'HOMEY_SECRET_KEY',
    'django-insecure-od7_5ff&q4jglr=f26!#pyq-u*)d43#!@=g*$-i#ui4g7=fu71',
)

DEBUG = os.environ.get('HOMEY_DEBUG', '1') != '0'

ALLOWED_HOSTS = [h.strip() for h in os.environ.get('HOMEY_ALLOWED_HOSTS', '*').split(',')
                 if h.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Tiers
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    # Apps HOMEY
    'accounts.apps.AccountsConfig',
    'listings.apps.ListingsConfig',
    'matching.apps.MatchingConfig',
    'ai.apps.AiConfig',
    'messaging.apps.MessagingConfig',
    'core.apps.CoreConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Base de données : SQLite en développement local ; PostgreSQL en production
# via les variables HOMEY_DB_* (docker-compose.yml, US10.4).
if os.environ.get('HOMEY_DB_HOST'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('HOMEY_DB_NAME', 'homey'),
            'USER': os.environ.get('HOMEY_DB_USER', 'homey'),
            'PASSWORD': os.environ.get('HOMEY_DB_PASSWORD', ''),
            'HOST': os.environ['HOMEY_DB_HOST'],
            'PORT': os.environ.get('HOMEY_DB_PORT', '5432'),
            'CONN_MAX_AGE': 60,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr'
TIME_ZONE = 'Africa/Tunis'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'accounts.CustomUser'

# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'config.pagination.DefaultPagination',
    'PAGE_SIZE': 12,
}

# JWT
from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

# Throttling (Sprint 6 — anti-abus) : généreux pour les parcours humains,
# strict sur les endpoints IA (ML coûteux) et l'authentification.
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '60/min',
    'user': '300/min',
    'ai': '20/min',       # estimate-price, search-natural, describe-listing
    'auth': '10/min',     # login / register
}
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle  # noqa: E402

# Classes réutilisées par les vues via throttle_scope / throttle_classes
THROTTLE_ANON = AnonRateThrottle
THROTTLE_USER = ScopedRateThrottle

# Headers de sécurité (Django 5+ : SecurityMiddleware déjà présent)
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    X_FRAME_OPTIONS = 'DENY'

# Cache : recommandations / estimation réutilisent le locmem en dev,
# Redis en production si HOMEY_REDIS_URL est défini (Sprint 6 — perf).
REDIS_URL = os.environ.get('HOMEY_REDIS_URL')
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {'KEY_PREFIX': 'homey'},
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'homey-cache',
        }
    }

# CORS : frontend Vite en développement
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

# Monitoring erreurs (US10.4 — production) : actif seulement si HOMEY_SENTRY_DSN
# est défini et que sentry-sdk est installé (requirements-prod.txt).
SENTRY_DSN = os.environ.get('HOMEY_SENTRY_DSN')
if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration

        sentry_sdk.init(dsn=SENTRY_DSN, integrations=[DjangoIntegration()],
                        traces_sample_rate=0.1, send_default_pii=False)
    except ImportError:
        pass  # sentry-sdk absent en dev : pas d'erreur
