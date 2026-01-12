from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.profiles.urls import reference_urlpatterns

urlpatterns = [
    # Redirect root to Swagger docs
    path("", RedirectView.as_view(url="/api/docs/", permanent=False)),

    path("admin/", admin.site.urls),

    # API v1 endpoints
    path("api/auth/", include("apps.accounts.urls")),
    path("api/profiles/", include("apps.profiles.urls")),
    path("api/research/", include("apps.research.urls")),
    path("api/reference-data/", include(reference_urlpatterns)),


    # API Documentation (Swagger/OpenAPI)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

# Serve media and static files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Serve static files in development (handles admin CSS, JS, etc.)
    urlpatterns += staticfiles_urlpatterns()
