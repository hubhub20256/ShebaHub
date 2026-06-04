"""
Tests for custom permission classes: IsAdminUser and IsEmailVerified.

Tests exercise permissions through real protected endpoints rather than
instantiating permission classes directly.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

# Admin panel stats endpoint is protected by [IsAuthenticated, IsAdminUser]
ADMIN_STATS_URL = "/api/admin-panel/stats/"

# /api/research/me/ is protected by [IsAuthenticated, IsEmailVerified]
MY_RESEARCHES_URL = "/api/research/me/"


@pytest.fixture(autouse=True)
def _clear_site_settings_cache():
    """Clear SiteSetting cache before and after each test to prevent leaks."""
    cache.delete("site_settings_singleton")
    yield
    cache.delete("site_settings_singleton")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email="regular@example.com",
        password="TestPass123!",
        firstName="Regular",
        lastName="User",
        email_verified=True,
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="staff@example.com",
        password="TestPass123!",
        firstName="Staff",
        lastName="User",
        is_staff=True,
        email_verified=True,
    )


@pytest.fixture
def superuser(db):
    return User.objects.create_superuser(
        email="super@example.com",
        password="TestPass123!",
    )


@pytest.fixture
def unverified_user(db):
    """User whose email_verified is False."""
    return User.objects.create_user(
        email="unverified@example.com",
        password="TestPass123!",
        firstName="Unverified",
        lastName="User",
        email_verified=False,
    )


@pytest.fixture
def verified_user(db):
    """Non-staff user with email_verified=True and a mentor profile so
    the RequireProfile default permission does not block the request."""
    user = User.objects.create_user(
        email="verified@example.com",
        password="TestPass123!",
        firstName="Verified",
        lastName="User",
        email_verified=True,
    )
    from apps.profiles.models import MentorProfile
    MentorProfile.objects.create(user=user)
    return user


# ---------------------------------------------------------------------------
# IsAdminUser  (tested via /api/admin-panel/stats/)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestIsAdminUser:

    def test_staff_user_passes(self, api_client, staff_user):
        """Staff user (is_staff=True) should be granted access."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.get(ADMIN_STATS_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_superuser_passes(self, api_client, superuser):
        """Superuser should be granted access."""
        api_client.force_authenticate(user=superuser)
        response = api_client.get(ADMIN_STATS_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_non_staff_user_forbidden(self, api_client, regular_user):
        """A non-staff, non-superuser should receive 403."""
        api_client.force_authenticate(user=regular_user)
        response = api_client.get(ADMIN_STATS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_user_unauthorized(self, api_client):
        """Unauthenticated request should receive 401."""
        response = api_client.get(ADMIN_STATS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# IsEmailVerified  (tested via /api/research/me/)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestIsEmailVerified:

    def test_verified_user_passes(self, api_client, verified_user):
        """User with email_verified=True should be allowed through."""
        api_client.force_authenticate(user=verified_user)
        # Enable the toggle so the permission actually checks the field
        from apps.admin_panel.models import SiteSetting
        site = SiteSetting.load()
        site.require_email_verification_to_apply = True
        site.save()

        response = api_client.get(MY_RESEARCHES_URL)
        # The view requires a mentor profile; verified_user has one, so we
        # should not get 403 from the permission itself.
        assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_unverified_user_forbidden_when_toggle_on(self, api_client, unverified_user):
        """User with email_verified=False should be denied when
        require_email_verification_to_apply is True."""
        api_client.force_authenticate(user=unverified_user)
        from apps.admin_panel.models import SiteSetting
        site = SiteSetting.load()
        site.require_email_verification_to_apply = True
        site.save()

        # Give user a mentor profile so RequireProfile does not interfere
        from apps.profiles.models import MentorProfile
        MentorProfile.objects.create(user=unverified_user)

        response = api_client.get(MY_RESEARCHES_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unverified_user_allowed_when_toggle_off(self, api_client, unverified_user):
        """When the site setting toggle is off, unverified users pass."""
        api_client.force_authenticate(user=unverified_user)
        from apps.admin_panel.models import SiteSetting
        site = SiteSetting.load()
        site.require_email_verification_to_apply = False
        site.save()

        # Give user a mentor profile so RequireProfile does not interfere
        from apps.profiles.models import MentorProfile
        MentorProfile.objects.get_or_create(user=unverified_user)

        response = api_client.get(MY_RESEARCHES_URL)
        # Should not be blocked by IsEmailVerified
        assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_staff_user_exempt(self, api_client, staff_user):
        """Staff users are exempt from email verification regardless of toggle."""
        api_client.force_authenticate(user=staff_user)
        staff_user.email_verified = False
        staff_user.save()

        from apps.admin_panel.models import SiteSetting
        site = SiteSetting.load()
        site.require_email_verification_to_apply = True
        site.save()

        # Give staff a mentor profile so RequireProfile / view logic does not interfere
        from apps.profiles.models import MentorProfile
        MentorProfile.objects.get_or_create(user=staff_user)

        response = api_client.get(MY_RESEARCHES_URL)
        assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_error_message_content(self, api_client, unverified_user):
        """The denial response should include the permission message."""
        api_client.force_authenticate(user=unverified_user)
        from apps.admin_panel.models import SiteSetting
        site = SiteSetting.load()
        site.require_email_verification_to_apply = True
        site.save()

        from apps.profiles.models import MentorProfile
        MentorProfile.objects.get_or_create(user=unverified_user)

        response = api_client.get(MY_RESEARCHES_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        body = response.json()
        # The custom exception handler uses 'message' instead of 'detail'
        message = body.get("message", "") or body.get("detail", "")
        assert "verify" in message.lower() or "email" in message.lower()
