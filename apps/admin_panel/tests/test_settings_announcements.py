"""Tests for admin panel site settings and announcements endpoints."""

import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.admin_panel.models import (
    AdminActionLog,
    AnnouncementDismissal,
    SiteSetting,
    SystemAnnouncement,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="staffuser@example.com",
        password="StaffPass123!",
        firstName="Staff",
        lastName="Admin",
        is_staff=True,
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email="regular@example.com",
        password="RegularPass123!",
        firstName="Regular",
        lastName="User",
    )


@pytest.fixture
def staff_client(staff_user):
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def regular_client(regular_user):
    client = APIClient()
    client.force_authenticate(user=regular_user)
    return client


@pytest.fixture
def auth_client(regular_user):
    """Authenticated non-staff client (used for active announcements / dismiss)."""
    client = APIClient()
    client.force_authenticate(user=regular_user)
    return client


@pytest.fixture
def anon_client():
    return APIClient()


@pytest.fixture
def announcement(db, staff_user):
    return SystemAnnouncement.objects.create(
        title="Test Announcement",
        body="This is a test announcement body.",
        audience="all",
        priority="info",
        is_active=True,
        created_by=staff_user,
    )


# ---------------------------------------------------------------------------
# Site Settings
# ---------------------------------------------------------------------------

SETTINGS_URL = "/api/admin-panel/settings/"


class TestSiteSettingsGet:
    @pytest.mark.django_db
    def test_staff_can_get_settings(self, staff_client):
        resp = staff_client.get(SETTINGS_URL)
        assert resp.status_code == status.HTTP_200_OK
        # Check that the expected fields are present
        assert "max_applications_per_student" in resp.data
        assert "contact_message_max_length" in resp.data
        assert "registration_enabled" in resp.data
        assert "student_registration_enabled" in resp.data
        assert "mentor_registration_enabled" in resp.data

    @pytest.mark.django_db
    def test_non_staff_gets_403(self, regular_client):
        resp = regular_client.get(SETTINGS_URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    def test_anon_gets_401(self, anon_client):
        resp = anon_client.get(SETTINGS_URL)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestSiteSettingsPatch:
    @pytest.mark.django_db
    def test_update_settings_and_log(self, staff_client, staff_user):
        resp = staff_client.patch(
            SETTINGS_URL,
            {"contact_message_max_length": 5000},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["contact_message_max_length"] == 5000

        obj = SiteSetting.load()
        assert obj.contact_message_max_length == 5000

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.SETTINGS_UPDATED,
        ).first()
        assert log is not None
        assert log.admin == staff_user

    @pytest.mark.django_db
    def test_no_log_when_no_changes(self, staff_client):
        # Get current value
        resp = staff_client.get(SETTINGS_URL)
        current_val = resp.data["contact_message_max_length"]

        # PATCH with same value
        resp = staff_client.patch(
            SETTINGS_URL,
            {"contact_message_max_length": current_val},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.SETTINGS_UPDATED,
        ).count() == 0

    @pytest.mark.django_db
    def test_contact_message_max_length_too_low(self, staff_client):
        resp = staff_client.patch(
            SETTINGS_URL,
            {"contact_message_max_length": 50},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_contact_message_max_length_too_high(self, staff_client):
        resp = staff_client.patch(
            SETTINGS_URL,
            {"contact_message_max_length": 20000},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_contact_message_max_length_valid_boundaries(self, staff_client):
        # Lower bound
        resp = staff_client.patch(
            SETTINGS_URL,
            {"contact_message_max_length": 100},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["contact_message_max_length"] == 100

        # Upper bound
        resp = staff_client.patch(
            SETTINGS_URL,
            {"contact_message_max_length": 10000},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["contact_message_max_length"] == 10000

    @pytest.mark.django_db
    def test_mentor_note_max_length_too_low(self, staff_client):
        resp = staff_client.patch(
            SETTINGS_URL,
            {"mentor_note_max_length": 50},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_mentor_note_max_length_too_high(self, staff_client):
        resp = staff_client.patch(
            SETTINGS_URL,
            {"mentor_note_max_length": 6000},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_mentor_note_max_length_valid_boundaries(self, staff_client):
        # Lower bound
        resp = staff_client.patch(
            SETTINGS_URL,
            {"mentor_note_max_length": 100},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["mentor_note_max_length"] == 100

        # Upper bound
        resp = staff_client.patch(
            SETTINGS_URL,
            {"mentor_note_max_length": 5000},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["mentor_note_max_length"] == 5000

    @pytest.mark.django_db
    def test_non_staff_cannot_patch(self, regular_client):
        resp = regular_client.patch(
            SETTINGS_URL,
            {"contact_message_max_length": 5000},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# Announcements — CRUD (admin-only except active/dismiss)
# ---------------------------------------------------------------------------

ANNOUNCEMENTS_URL = "/api/admin-panel/announcements/"
CREATE_URL = "/api/admin-panel/announcements/create/"
ACTIVE_URL = "/api/admin-panel/announcements/active/"


def _announcement_url(pk, action):
    return f"{ANNOUNCEMENTS_URL}{pk}/{action}/"


class TestCreateAnnouncement:
    @pytest.mark.django_db
    def test_staff_creates_announcement(self, staff_client, staff_user):
        resp = staff_client.post(
            CREATE_URL,
            {
                "title": "Maintenance Window",
                "body": "System will be down for maintenance.",
                "audience": "all",
                "priority": "warning",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["title"] == "Maintenance Window"
        assert str(resp.data["created_by"]) == str(staff_user.id)

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.ANNOUNCEMENT_CREATE,
        ).first()
        assert log is not None
        assert log.admin == staff_user
        assert log.details["title"] == "Maintenance Window"

    @pytest.mark.django_db
    def test_create_with_expiry(self, staff_client):
        future = (timezone.now() + timedelta(days=7)).isoformat()
        resp = staff_client.post(
            CREATE_URL,
            {
                "title": "Temp Notice",
                "body": "Expires soon.",
                "expires_at": future,
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["expires_at"] is not None

    @pytest.mark.django_db
    def test_create_missing_required_fields(self, staff_client):
        resp = staff_client.post(CREATE_URL, {}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_non_staff_cannot_create(self, regular_client):
        resp = regular_client.post(
            CREATE_URL,
            {"title": "Hack", "body": "x"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN


class TestListAnnouncements:
    @pytest.mark.django_db
    def test_staff_lists_all(self, staff_client, announcement):
        resp = staff_client.get(ANNOUNCEMENTS_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, list)
        assert len(resp.data) >= 1

    @pytest.mark.django_db
    def test_non_staff_cannot_list(self, regular_client):
        resp = regular_client.get(ANNOUNCEMENTS_URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


class TestActiveAnnouncements:
    @pytest.mark.django_db
    def test_authenticated_user_sees_active(self, auth_client, announcement):
        resp = auth_client.get(ACTIVE_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, list)
        ids = [a["id"] for a in resp.data]
        assert announcement.id in ids

    @pytest.mark.django_db
    def test_expired_not_shown(self, auth_client, staff_user):
        expired = SystemAnnouncement.objects.create(
            title="Expired",
            body="This is expired.",
            is_active=True,
            expires_at=timezone.now() - timedelta(days=1),
            created_by=staff_user,
        )
        resp = auth_client.get(ACTIVE_URL)
        assert resp.status_code == status.HTTP_200_OK
        ids = [a["id"] for a in resp.data]
        assert expired.id not in ids

    @pytest.mark.django_db
    def test_inactive_not_shown(self, auth_client, staff_user):
        inactive = SystemAnnouncement.objects.create(
            title="Inactive",
            body="Deactivated announcement.",
            is_active=False,
            created_by=staff_user,
        )
        resp = auth_client.get(ACTIVE_URL)
        assert resp.status_code == status.HTTP_200_OK
        ids = [a["id"] for a in resp.data]
        assert inactive.id not in ids

    @pytest.mark.django_db
    def test_dismissed_not_shown(self, auth_client, announcement, regular_user):
        AnnouncementDismissal.objects.create(
            announcement=announcement,
            user=regular_user,
        )
        resp = auth_client.get(ACTIVE_URL)
        assert resp.status_code == status.HTTP_200_OK
        ids = [a["id"] for a in resp.data]
        assert announcement.id not in ids

    @pytest.mark.django_db
    def test_anon_gets_401(self, anon_client):
        resp = anon_client.get(ACTIVE_URL)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestUpdateAnnouncement:
    @pytest.mark.django_db
    def test_staff_updates_announcement(self, staff_client, announcement, staff_user):
        resp = staff_client.patch(
            _announcement_url(announcement.id, "update"),
            {"title": "Updated Title"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["title"] == "Updated Title"

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.ANNOUNCEMENT_UPDATE,
        ).first()
        assert log is not None
        assert log.admin == staff_user
        assert "title" in log.details.get("changed_fields", {})

    @pytest.mark.django_db
    def test_update_no_changes(self, staff_client, announcement):
        resp = staff_client.patch(
            _announcement_url(announcement.id, "update"),
            {"title": announcement.title},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["detail"] == "No changes detected."

    @pytest.mark.django_db
    def test_update_not_found(self, staff_client):
        resp = staff_client.patch(
            _announcement_url(999999, "update"),
            {"title": "X"},
            format="json",
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_non_staff_cannot_update(self, regular_client, announcement):
        resp = regular_client.patch(
            _announcement_url(announcement.id, "update"),
            {"title": "Hacked"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN


class TestDeactivateAnnouncement:
    @pytest.mark.django_db
    def test_deactivate_and_log(self, staff_client, announcement, staff_user):
        resp = staff_client.post(_announcement_url(announcement.id, "deactivate"))
        assert resp.status_code == status.HTTP_200_OK

        announcement.refresh_from_db()
        assert announcement.is_active is False

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.ANNOUNCEMENT_DEACTIVATE,
        ).first()
        assert log is not None
        assert log.admin == staff_user

    @pytest.mark.django_db
    def test_deactivate_not_found(self, staff_client):
        resp = staff_client.post(_announcement_url(999999, "deactivate"))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_non_staff_cannot_deactivate(self, regular_client, announcement):
        resp = regular_client.post(
            _announcement_url(announcement.id, "deactivate"),
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN


class TestDismissAnnouncement:
    @pytest.mark.django_db
    def test_authenticated_user_dismisses(self, auth_client, announcement, regular_user):
        resp = auth_client.post(_announcement_url(announcement.id, "dismiss"))
        assert resp.status_code == status.HTTP_200_OK

        assert AnnouncementDismissal.objects.filter(
            announcement=announcement,
            user=regular_user,
        ).exists()

    @pytest.mark.django_db
    def test_dismiss_idempotent(self, auth_client, announcement, regular_user):
        # Dismiss once
        auth_client.post(_announcement_url(announcement.id, "dismiss"))
        # Dismiss again — should not raise
        resp = auth_client.post(_announcement_url(announcement.id, "dismiss"))
        assert resp.status_code == status.HTTP_200_OK

        assert AnnouncementDismissal.objects.filter(
            announcement=announcement,
            user=regular_user,
        ).count() == 1

    @pytest.mark.django_db
    def test_dismiss_not_found(self, auth_client):
        resp = auth_client.post(_announcement_url(999999, "dismiss"))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_anon_cannot_dismiss(self, anon_client, announcement):
        resp = anon_client.post(_announcement_url(announcement.id, "dismiss"))
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
