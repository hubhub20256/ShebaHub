from django.contrib import admin
from django.contrib.admin import AdminSite
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.generic import RedirectView
from django.views.static import serve


# Restrict /admin/ to superusers only (staff admins cannot access it)
AdminSite.has_permission = lambda self, request: (
    request.user.is_active and request.user.is_superuser
)

from rest_framework.permissions import IsAdminUser, AllowAny

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.admin_panel.views import public_stats
from apps.profiles.urls import reference_urlpatterns

# In DEBUG mode, docs are public; in production, admin-only
_docs_permission = [AllowAny] if settings.DEBUG else [IsAdminUser]


class DocsSchemaView(SpectacularAPIView):
    permission_classes = _docs_permission


class DocsSwaggerView(SpectacularSwaggerView):
    permission_classes = _docs_permission


class DocsRedocView(SpectacularRedocView):
    permission_classes = _docs_permission


urlpatterns = [
    path("", RedirectView.as_view(url="/api/docs/", permanent=False)),
    path("admin/", admin.site.urls),

    # API v1 endpoints
    path("api/auth/", include("apps.accounts.urls")),
    path("api/profiles/", include("apps.profiles.urls")),
    path("api/research/", include("apps.research.urls")),
    path("api/admin-panel/", include("apps.admin_panel.urls")),
    path("api/saved-items/", include("apps.saved_items.urls")),
    path("api/reference-data/", include(reference_urlpatterns)),
    path("api/public/stats/", public_stats, name="public-stats"),

    # API Documentation — public in dev, admin-only in production
    path("api/schema/", DocsSchemaView.as_view(), name="schema"),
    path("api/docs/", DocsSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", DocsRedocView.as_view(url_name="schema"), name="redoc"),
]

# Serve media files (user uploads like avatars) in all environments.
# Django's static() only works when DEBUG=True, so we use re_path directly
# to ensure avatars are accessible in production too.
# For high-traffic production, consider using nginx to serve /media/ instead.
urlpatterns += [
    re_path(
        r'^media/(?P<path>.*)$',
        serve,
        {'document_root': settings.MEDIA_ROOT},
    ),
]

# Serve static files in development only
if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
