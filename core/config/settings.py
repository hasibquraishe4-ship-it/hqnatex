import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "unsafe-dev-only-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "0") == "1"
ALLOWED_HOSTS = [x.strip() for x in os.environ.get("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",") if x.strip()]

INSTALLED_APPS = [
    "apps.platform_tenancy_v3",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    "apps.tenancy",
    "apps.companies",
    "apps.branches",
    "apps.agencies",
    "apps.iam",
    "apps.audit",
    "apps.noc",
    "apps.network_access",
    "apps.sales",
    "apps.billing",
    "apps.warehouse.apps.WarehouseConfig",
    "apps.revenue",
    "apps.customers",
    "apps.catalog",
    "apps.partners",
    "apps.finance",
    "apps.accounting",
    "apps.treasury",
    "apps.expenses",
    "apps.taxation",
    "apps.company_fees",

    "apps.governance.apps.GovernanceConfig",
    "apps.localization.apps.LocalizationConfig",
    "apps.hr.apps.HrConfig",
    "apps.workspace.apps.WorkspaceConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("HQNATEX_DB_NAME", "hqnatex_core"),
        "USER": os.environ.get("HQNATEX_DB_USER", "hqnatex_core"),
        "PASSWORD": os.environ.get("HQNATEX_DB_PASSWORD", ""),
        "HOST": os.environ.get("HQNATEX_DB_HOST", "127.0.0.1"),
        "PORT": os.environ.get("HQNATEX_DB_PORT", "55432"),
        "CONN_MAX_AGE": 60,
        "ATOMIC_REQUESTS": True,
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kabul"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "iam.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.HQNATEXPageNumberPagination",
    "PAGE_SIZE": 50,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "HQNATEX API",
    "DESCRIPTION": "HQNATEX Enterprise Multi-Tenant ISP/Telecom ERP API",
    "VERSION": "0.5.0",
}

CORS_ALLOWED_ORIGINS = [
    x.strip() for x in os.environ.get(
        "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if x.strip()
]

# HQNATEX_BACKGROUND_MEDIA_STORAGE_V1
#
# Canonical Django media storage for company-scoped UI branding assets.
# Runtime values are environment-configurable. Business/UI code must read
# these settings instead of embedding upload limits or storage paths.
MEDIA_ROOT = Path(
    os.environ.get(
        "HQNATEX_MEDIA_ROOT",
        str(BASE_DIR / "media"),
    )
).resolve()

MEDIA_URL = os.environ.get(
    "HQNATEX_MEDIA_URL",
    "/media/",
)

HQNATEX_BACKGROUND_DEFAULT_URL = os.environ.get(
    "HQNATEX_BACKGROUND_DEFAULT_URL",
    "/branding/hqnatex-system-background.webp",
)

HQNATEX_BACKGROUND_MAX_BYTES = int(
    os.environ.get(
        "HQNATEX_BACKGROUND_MAX_BYTES",
        str(12 * 1024 * 1024),
    )
)

HQNATEX_BACKGROUND_MAX_WIDTH = int(
    os.environ.get(
        "HQNATEX_BACKGROUND_MAX_WIDTH",
        "7680",
    )
)

HQNATEX_BACKGROUND_MAX_HEIGHT = int(
    os.environ.get(
        "HQNATEX_BACKGROUND_MAX_HEIGHT",
        "4320",
    )
)

HQNATEX_BACKGROUND_ALLOWED_FORMATS = tuple(
    item.strip().upper()
    for item in os.environ.get(
        "HQNATEX_BACKGROUND_ALLOWED_FORMATS",
        "PNG,JPEG,WEBP",
    ).split(",")
    if item.strip()
)

HQNATEX_BACKGROUND_ALLOWED_POSITIONS = tuple(
    item.strip()
    for item in os.environ.get(
        "HQNATEX_BACKGROUND_ALLOWED_POSITIONS",
        (
            "center center|center top|center bottom|"
            "left center|right center"
        ),
    ).split("|")
    if item.strip()
)

HQNATEX_BACKGROUND_ALLOWED_SIZES = tuple(
    item.strip()
    for item in os.environ.get(
        "HQNATEX_BACKGROUND_ALLOWED_SIZES",
        "cover,contain,auto",
    ).split(",")
    if item.strip()
)

HQNATEX_BACKGROUND_DEFAULT_POSITION = os.environ.get(
    "HQNATEX_BACKGROUND_DEFAULT_POSITION",
    "center center",
)

HQNATEX_BACKGROUND_DEFAULT_SIZE = os.environ.get(
    "HQNATEX_BACKGROUND_DEFAULT_SIZE",
    "cover",
)

HQNATEX_BACKGROUND_DEFAULT_DARK_OVERLAY = float(
    os.environ.get(
        "HQNATEX_BACKGROUND_DEFAULT_DARK_OVERLAY",
        "0.38",
    )
)

HQNATEX_BACKGROUND_DEFAULT_LIGHT_OVERLAY = float(
    os.environ.get(
        "HQNATEX_BACKGROUND_DEFAULT_LIGHT_OVERLAY",
        "0.58",
    )
)
# /HQNATEX_BACKGROUND_MEDIA_STORAGE_V1
DATABASE_ROUTERS = [
    "apps.platform_tenancy_v3.router.HQNATEXTenantDatabaseRouter",
]
