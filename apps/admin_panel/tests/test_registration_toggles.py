"""
Tests for separate student/mentor registration toggles.

Covers:
- Student profile creation blocked when student_registration_enabled=False
- Mentor profile creation blocked when mentor_registration_enabled=False
- Both succeed (201) when enabled (default)
- Disabling one doesn't affect the other
- Existing profiles can still GET/PATCH when disabled
- Admin settings PATCH can toggle both fields
- Both default to True on fresh SiteSetting
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.admin_panel.models import SiteSetting
from apps.profiles.models import StudentProfile, MentorProfile

User = get_user_model()

STUDENT_URL = "/api/profiles/student/me/"
MENTOR_URL = "/api/profiles/mentor/me/"
SETTINGS_URL = "/api/admin-panel/settings/"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="toggle-admin@example.com",
        password="AdminPass123!",
        firstName="Admin",
        lastName="Toggle",
        is_staff=True,
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email="toggle-user@example.com",
        password="UserPass123!",
        firstName="Regular",
        lastName="User",
    )


@pytest.fixture
def second_user(db):
    return User.objects.create_user(
        email="toggle-user2@example.com",
        password="UserPass123!",
        firstName="Second",
        lastName="User",
    )


@pytest.fixture
def admin_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def user_client(api_client, regular_user):
    api_client.force_authenticate(user=regular_user)
    return api_client


@pytest.fixture
def second_client(api_client, second_user):
    api_client.force_authenticate(user=second_user)
    return api_client


@pytest.fixture
def site_settings(db):
    from django.core.cache import cache
    cache.delete(SiteSetting.CACHE_KEY)
    return SiteSetting.load()


@pytest.mark.django_db
class TestRegistrationTogglesDefaults:
    """Both toggles default to True."""

    def test_defaults_true(self, site_settings):
        assert site_settings.student_registration_enabled is True
        assert site_settings.mentor_registration_enabled is True


@pytest.mark.django_db
class TestStudentRegistrationToggle:
    """Student profile creation respects student_registration_enabled."""

    def test_student_creation_blocked_when_disabled(self, user_client, site_settings):
        site_settings.student_registration_enabled = False
        site_settings.save()

        response = user_client.post(STUDENT_URL, {}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "detail" in response.data

    def test_student_creation_succeeds_when_enabled(self, user_client, site_settings):
        site_settings.student_registration_enabled = True
        site_settings.save()

        response = user_client.post(STUDENT_URL, {}, format="json")
        # Should be 201 or 400 (validation), but NOT 403
        assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_disabling_student_does_not_block_mentor(self, user_client, site_settings):
        site_settings.student_registration_enabled = False
        site_settings.save()

        response = user_client.post(MENTOR_URL, {}, format="json")
        # Should not be blocked by student toggle
        assert response.status_code != status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestMentorRegistrationToggle:
    """Mentor profile creation respects mentor_registration_enabled."""

    def test_mentor_creation_blocked_when_disabled(self, user_client, site_settings):
        site_settings.mentor_registration_enabled = False
        site_settings.save()

        response = user_client.post(MENTOR_URL, {}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "detail" in response.data

    def test_mentor_creation_succeeds_when_enabled(self, user_client, site_settings):
        site_settings.mentor_registration_enabled = True
        site_settings.save()

        response = user_client.post(MENTOR_URL, {}, format="json")
        # Should be 201 or 400 (validation), but NOT 403
        assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_disabling_mentor_does_not_block_student(self, user_client, site_settings):
        site_settings.mentor_registration_enabled = False
        site_settings.save()

        response = user_client.post(STUDENT_URL, {}, format="json")
        # Should not be blocked by mentor toggle
        assert response.status_code != status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestExistingProfilesUnaffected:
    """Existing profiles can still GET/PATCH even when registration is disabled."""

    def test_student_get_works_when_disabled(self, user_client, regular_user, site_settings):
        StudentProfile.objects.create(user=regular_user)
        site_settings.student_registration_enabled = False
        site_settings.save()

        response = user_client.get(STUDENT_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_student_patch_works_when_disabled(self, user_client, regular_user, site_settings):
        StudentProfile.objects.create(user=regular_user)
        site_settings.student_registration_enabled = False
        site_settings.save()

        response = user_client.patch(
            STUDENT_URL,
            {"background_description": "updated"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

    def test_mentor_get_works_when_disabled(self, user_client, regular_user, site_settings):
        MentorProfile.objects.create(user=regular_user)
        site_settings.mentor_registration_enabled = False
        site_settings.save()

        response = user_client.get(MENTOR_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_mentor_patch_works_when_disabled(self, user_client, regular_user, site_settings):
        MentorProfile.objects.create(user=regular_user)
        site_settings.mentor_registration_enabled = False
        site_settings.save()

        response = user_client.patch(
            MENTOR_URL,
            {"background_description": "updated"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestAdminSettingsToggle:
    """Admin can toggle both fields via PATCH /api/admin-panel/settings/."""

    def test_admin_can_disable_student_registration(self, admin_client, site_settings):
        response = admin_client.patch(
            SETTINGS_URL,
            {"student_registration_enabled": False},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["student_registration_enabled"] is False

        site_settings.refresh_from_db()
        assert site_settings.student_registration_enabled is False

    def test_admin_can_disable_mentor_registration(self, admin_client, site_settings):
        response = admin_client.patch(
            SETTINGS_URL,
            {"mentor_registration_enabled": False},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["mentor_registration_enabled"] is False

        site_settings.refresh_from_db()
        assert site_settings.mentor_registration_enabled is False

    def test_admin_can_toggle_both_independently(self, admin_client, site_settings):
        response = admin_client.patch(
            SETTINGS_URL,
            {
                "student_registration_enabled": False,
                "mentor_registration_enabled": True,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["student_registration_enabled"] is False
        assert response.data["mentor_registration_enabled"] is True
