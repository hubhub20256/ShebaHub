"""
Tests for avatar/media URL serving.

Ensures that media URL patterns are registered regardless of DEBUG setting,
so profile pictures (avatars) are accessible in all environments.
"""

import pytest
from django.conf import settings
from django.test import override_settings


@pytest.mark.django_db
class TestMediaURLPatterns:
    """Media URL patterns should be registered so avatars are accessible."""

    def test_media_url_is_configured(self):
        """MEDIA_URL should be set."""
        assert settings.MEDIA_URL == '/media/'

    def test_media_url_pattern_registered(self):
        """A URL pattern for /media/ should exist in urlpatterns."""
        from config.urls import urlpatterns

        found = any(
            'media' in str(getattr(p, 'pattern', ''))
            for p in urlpatterns
        )
        assert found, (
            "No URL pattern found for /media/. "
            "Avatar images won't be served."
        )

    def test_media_pattern_uses_serve_view(self):
        """The media URL pattern should use django.views.static.serve."""
        from django.views.static import serve as static_serve
        from config.urls import urlpatterns

        media_pattern = None
        for p in urlpatterns:
            if 'media' in str(getattr(p, 'pattern', '')):
                media_pattern = p
                break

        assert media_pattern is not None, "Media URL pattern not found."
        assert media_pattern.callback is static_serve, (
            "Media URL pattern should use django.views.static.serve"
        )

    def test_media_pattern_points_to_media_root(self):
        """The media URL pattern should serve from MEDIA_ROOT."""
        from config.urls import urlpatterns

        media_pattern = None
        for p in urlpatterns:
            if 'media' in str(getattr(p, 'pattern', '')):
                media_pattern = p
                break

        assert media_pattern is not None, "Media URL pattern not found."
        assert media_pattern.default_args.get('document_root') == settings.MEDIA_ROOT
