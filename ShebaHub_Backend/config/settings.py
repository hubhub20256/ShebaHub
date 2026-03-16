import os
import sys
from pathlib import Path
import environ

# Initialize environment variables
env = environ.Env(
    DEBUG=(bool, False),
    ENVIRONMENT=(str, 'development'),
)

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Read .env file
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# Add apps directory to Python path
sys.path.insert(0, os.path.join(BASE_DIR, 'apps'))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY', default='django-insecure-dev-key-change-in-production')

# Environment detection
ENVIRONMENT = env('ENVIRONMENT')
IS_PRODUCTION = ENVIRONMENT == 'production'

# Validate SECRET_KEY in production
if IS_PRODUCTION and 'insecure' in SECRET_KEY:
    raise ValueError('SECRET_KEY must be set to a secure value in production!')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env('DEBUG')

# Enforce DEBUG=False in production
if IS_PRODUCTION and DEBUG:
    raise ValueError('DEBUG must be False in production!')

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    
    # Local apps
    'apps.accounts',
    'apps.profiles',
    'apps.common',
    'apps.research',
    'apps.admin_panel',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'apps.common.middleware.SecurityHeadersMiddleware',
    'corsheaders.middleware.CorsMiddleware',
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
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database configuration
# Use PostgreSQL if DB_ENGINE is set to 'postgres', otherwise use SQLite
DB_ENGINE = env('DB_ENGINE', default='')

if DB_ENGINE == 'postgres':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env('DB_NAME'),
            'USER': env('DB_USER'),
            'PASSWORD': env('DB_PASSWORD'),
            'HOST': env('DB_HOST', default='localhost'),
            'PORT': env('DB_PORT', default='5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Custom user model
AUTH_USER_MODEL = 'accounts.User'

# Authentication backends (env-based admin checked first, then standard)
AUTHENTICATION_BACKENDS = [
    'apps.common.backends.EnvAdminBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    {
        'NAME': 'apps.common.validators.ShebaCommonPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (User uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB

# Allowed file extensions for profile documents (PDF only for security)
ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf']
MAX_DOCUMENT_SIZE_MB = 10  # Maximum file size in MB

# ClamAV virus scanning (optional – set CLAMAV_ENABLED=True in .env to activate)
CLAMAV_ENABLED = env.bool('CLAMAV_ENABLED', default=False)
CLAMAV_HOST = env('CLAMAV_HOST', default='127.0.0.1')
CLAMAV_PORT = env.int('CLAMAV_PORT', default=3310)
CLAMAV_SOCKET = env('CLAMAV_SOCKET', default='')  # Unix socket path (overrides host/port)

# Email configuration
# Production uses AWS SES via SMTP (set EMAIL_* env vars).
# Development defaults to the console backend (emails printed to stdout).
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@shebahub.hitheal.org.il')

# Frontend URL for password reset links
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:5173')
if IS_PRODUCTION and FRONTEND_URL.startswith('http://'):
    raise ValueError('FRONTEND_URL must use HTTPS in production!')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.common.authentication.ActiveUserJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
        'apps.common.permissions.RequireProfile',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ),
    'EXCEPTION_HANDLER': 'apps.common.exceptions.custom_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'login': '10/minute',
        'register': '5/minute',
        'upload': '30/hour',
        'contact': '10/hour',
        'password_reset': '5/hour',
        'research_application': '10/hour',
        'chat_message': '60/minute',
    },
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

# DRF Spectacular settings (OpenAPI/Swagger)
SPECTACULAR_SETTINGS = {
    'TITLE': 'Project Sheba API',
    'DESCRIPTION': 'API for the Sheba mentorship platform connecting students with mentors.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/v1',
}

# Simple JWT settings
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# =========================
# CORS
# =========================

CORS_ALLOW_CREDENTIALS = True  # ok for JWT; needed if you ever use cookies

if IS_PRODUCTION:
    # Production: allow ONLY real frontend domain(s) from env
    CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
    if not CORS_ALLOWED_ORIGINS:
        raise ValueError('CORS_ALLOWED_ORIGINS must be set in production!')
else:
    # Development: allow localhost/127.0.0.1 on ANY port (Vite may switch ports)
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^http://localhost:\d+$",
        r"^http://127\.0\.0\.1:\d+$",
        r"^https?://shebahub\.hitheal\.org\.il(:\d+)?$",
    ]


# NEVER use CORS_ALLOW_ALL_ORIGINS=True in production!
# CORS_ALLOW_ALL_ORIGINS is intentionally not set

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'audit': {
            'format': '{levelname} {asctime} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'audit_console': {
            'class': 'logging.StreamHandler',
            'formatter': 'audit',
        },
        # Production file handlers (activated when LOG_DIR env var is set)
        **(
            {
                'audit_file': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': os.path.join(env('LOG_DIR', default=str(BASE_DIR / 'logs')), 'audit.log'),
                    'maxBytes': 10 * 1024 * 1024,  # 10 MB
                    'backupCount': 10,
                    'formatter': 'audit',
                },
                'error_file': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': os.path.join(env('LOG_DIR', default=str(BASE_DIR / 'logs')), 'error.log'),
                    'maxBytes': 10 * 1024 * 1024,
                    'backupCount': 10,
                    'formatter': 'verbose',
                },
            }
            if IS_PRODUCTION
            else {}
        ),
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'] + (['error_file'] if IS_PRODUCTION else []),
            'level': env('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'] + (['error_file'] if IS_PRODUCTION else []),
            'level': 'ERROR',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console'] + (['audit_file'] if IS_PRODUCTION else []),
            'level': 'WARNING',
            'propagate': False,
        },
        # Audit logger for sensitive operations
        'audit': {
            'handlers': ['audit_console'] + (['audit_file'] if IS_PRODUCTION else []),
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# =============================================================================
# SECURITY SETTINGS
# =============================================================================

# Applied to ALL environments — basic defense-in-depth headers
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'

if IS_PRODUCTION:
    # HTTPS/SSL Settings
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    # HSTS (HTTP Strict Transport Security)
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    # Cookie Security
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_SAMESITE = 'Lax'

    # Referrer Policy
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
else:
    # Development settings - more permissive for local testing
    SECURE_SSL_REDIRECT = False
