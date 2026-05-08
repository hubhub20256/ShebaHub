"""Tests for admin panel user management endpoints."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.admin_panel.models import AdminActionLog


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
def superuser(db):
    return User.objects.create_superuser(
        email="super@example.com",
        password="SuperPass123!",
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
def target_user(db):
    """A separate user to be the target of admin actions."""
    return User.objects.create_user(
        email="target@example.com",
        password="TargetPass123!",
        firstName="Target",
        lastName="Person",
        email_verified=False,
    )


@pytest.fixture
def staff_client(staff_user):
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def super_client(superuser):
    client = APIClient()
    client.force_authenticate(user=superuser)
    return client


@pytest.fixture
def regular_client(regular_user):
    client = APIClient()
    client.force_authenticate(user=regular_user)
    return client


@pytest.fixture
def anon_client():
    return APIClient()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

URL_PREFIX = "/api/admin-panel/users/"


def _user_url(pk, action=None):
    base = f"{URL_PREFIX}{pk}/"
    if action:
        return f"{base}{action}/"
    return base


BULK_URL = "/api/admin-panel/users/bulk/"


# ---------------------------------------------------------------------------
# GET /api/admin-panel/users/ — list users
# ---------------------------------------------------------------------------


class TestListUsers:
    @pytest.mark.django_db
    def test_staff_can_list(self, staff_client, target_user):
        resp = staff_client.get(URL_PREFIX)
        assert resp.status_code == status.HTTP_200_OK
        assert "results" in resp.data
        emails = [u["email"] for u in resp.data["results"]]
        assert target_user.email in emails

    @pytest.mark.django_db
    def test_non_staff_gets_403(self, regular_client):
        resp = regular_client.get(URL_PREFIX)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    def test_anon_gets_401(self, anon_client):
        resp = anon_client.get(URL_PREFIX)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.django_db
    def test_search_filter(self, staff_client, target_user):
        resp = staff_client.get(URL_PREFIX, {"search": "target@example"})
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) >= 1
        assert any(u["email"] == target_user.email for u in resp.data["results"])

    @pytest.mark.django_db
    def test_is_active_filter(self, staff_client, target_user):
        target_user.is_active = False
        target_user.save(update_fields=["is_active"])

        resp = staff_client.get(URL_PREFIX, {"is_active": "false"})
        assert resp.status_code == status.HTTP_200_OK
        for u in resp.data["results"]:
            assert u["is_active"] is False

    @pytest.mark.django_db
    def test_non_superuser_staff_cannot_see_superusers(self, staff_client, superuser):
        resp = staff_client.get(URL_PREFIX)
        assert resp.status_code == status.HTTP_200_OK
        emails = [u["email"] for u in resp.data["results"]]
        assert superuser.email not in emails

    @pytest.mark.django_db
    def test_superuser_can_see_superusers(self, super_client, superuser):
        resp = super_client.get(URL_PREFIX)
        assert resp.status_code == status.HTTP_200_OK
        emails = [u["email"] for u in resp.data["results"]]
        assert superuser.email in emails


# ---------------------------------------------------------------------------
# GET /api/admin-panel/users/<uuid>/ — get user detail
# ---------------------------------------------------------------------------


class TestGetUser:
    @pytest.mark.django_db
    def test_staff_gets_detail(self, staff_client, target_user):
        resp = staff_client.get(_user_url(target_user.id))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["email"] == target_user.email

    @pytest.mark.django_db
    def test_user_not_found(self, staff_client):
        import uuid
        resp = staff_client.get(_user_url(uuid.uuid4()))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_non_superuser_cannot_view_superuser(self, staff_client, superuser):
        resp = staff_client.get(_user_url(superuser.id))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_superuser_can_view_superuser(self, super_client, superuser):
        resp = super_client.get(_user_url(superuser.id))
        assert resp.status_code == status.HTTP_200_OK

    @pytest.mark.django_db
    def test_non_staff_cannot_view(self, regular_client, target_user):
        resp = regular_client.get(_user_url(target_user.id))
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# POST /api/admin-panel/users/<uuid>/deactivate/
# ---------------------------------------------------------------------------


class TestDeactivateUser:
    @pytest.mark.django_db
    def test_deactivate_user_and_log(self, staff_client, target_user, staff_user):
        resp = staff_client.post(_user_url(target_user.id, "deactivate"))
        assert resp.status_code == status.HTTP_200_OK

        target_user.refresh_from_db()
        assert target_user.is_active is False

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.USER_DEACTIVATE,
            target_user=target_user,
        ).first()
        assert log is not None
        assert log.admin == staff_user

    @pytest.mark.django_db
    def test_cannot_deactivate_superuser(self, staff_client, superuser):
        resp = staff_client.post(_user_url(superuser.id, "deactivate"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

        superuser.refresh_from_db()
        assert superuser.is_active is True

    @pytest.mark.django_db
    def test_superuser_also_cannot_deactivate_superuser(self, super_client, superuser):
        """Even a superuser cannot deactivate another superuser (the view blocks it)."""
        other_super = User.objects.create_superuser(
            email="other_super@example.com",
            password="OtherPass123!",
        )
        resp = super_client.post(_user_url(other_super.id, "deactivate"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    def test_non_staff_cannot_deactivate(self, regular_client, target_user):
        resp = regular_client.post(_user_url(target_user.id, "deactivate"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    def test_deactivate_not_found(self, staff_client):
        import uuid
        resp = staff_client.post(_user_url(uuid.uuid4(), "deactivate"))
        assert resp.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# POST /api/admin-panel/users/<uuid>/reactivate/
# ---------------------------------------------------------------------------


class TestReactivateUser:
    @pytest.mark.django_db
    def test_reactivate_user_and_log(self, staff_client, target_user, staff_user):
        target_user.is_active = False
        target_user.save(update_fields=["is_active"])

        resp = staff_client.post(_user_url(target_user.id, "reactivate"))
        assert resp.status_code == status.HTTP_200_OK

        target_user.refresh_from_db()
        assert target_user.is_active is True

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.USER_REACTIVATE,
            target_user=target_user,
        ).first()
        assert log is not None
        assert log.admin == staff_user

    @pytest.mark.django_db
    def test_non_superuser_cannot_reactivate_superuser(self, staff_client, superuser):
        superuser.is_active = False
        superuser.save(update_fields=["is_active"])

        resp = staff_client.post(_user_url(superuser.id, "reactivate"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    def test_non_staff_cannot_reactivate(self, regular_client, target_user):
        resp = regular_client.post(_user_url(target_user.id, "reactivate"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# POST /api/admin-panel/users/<uuid>/force-verify/
# ---------------------------------------------------------------------------


class TestForceVerifyUser:
    @pytest.mark.django_db
    def test_force_verify_and_log(self, staff_client, target_user, staff_user):
        assert target_user.email_verified is False

        resp = staff_client.post(_user_url(target_user.id, "force-verify"))
        assert resp.status_code == status.HTTP_200_OK

        target_user.refresh_from_db()
        assert target_user.email_verified is True

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.USER_FORCE_VERIFY,
            target_user=target_user,
        ).first()
        assert log is not None
        assert log.admin == staff_user

    @pytest.mark.django_db
    def test_non_superuser_cannot_force_verify_superuser(self, staff_client, superuser):
        resp = staff_client.post(_user_url(superuser.id, "force-verify"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    def test_non_staff_cannot_force_verify(self, regular_client, target_user):
        resp = regular_client.post(_user_url(target_user.id, "force-verify"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    def test_force_verify_not_found(self, staff_client):
        import uuid
        resp = staff_client.post(_user_url(uuid.uuid4(), "force-verify"))
        assert resp.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# POST /api/admin-panel/users/bulk/ — bulk user actions
# ---------------------------------------------------------------------------


class TestBulkUserAction:
    @pytest.mark.django_db
    def test_bulk_deactivate(self, staff_client, target_user, staff_user):
        resp = staff_client.post(
            BULK_URL,
            {"ids": [str(target_user.id)], "action": "deactivate"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "1 users updated" in resp.data["detail"]

        target_user.refresh_from_db()
        assert target_user.is_active is False

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.USER_DEACTIVATE,
            target_user=target_user,
        ).first()
        assert log is not None

    @pytest.mark.django_db
    def test_bulk_reactivate(self, staff_client, target_user):
        target_user.is_active = False
        target_user.save(update_fields=["is_active"])

        resp = staff_client.post(
            BULK_URL,
            {"ids": [str(target_user.id)], "action": "reactivate"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        target_user.refresh_from_db()
        assert target_user.is_active is True

    @pytest.mark.django_db
    def test_bulk_force_verify(self, staff_client, target_user):
        resp = staff_client.post(
            BULK_URL,
            {"ids": [str(target_user.id)], "action": "force_verify"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        target_user.refresh_from_db()
        assert target_user.email_verified is True

    @pytest.mark.django_db
    def test_bulk_skips_superusers(self, staff_client, superuser, target_user):
        """Superusers are silently skipped in bulk operations."""
        resp = staff_client.post(
            BULK_URL,
            {
                "ids": [str(superuser.id), str(target_user.id)],
                "action": "deactivate",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "1 users updated" in resp.data["detail"]

        superuser.refresh_from_db()
        assert superuser.is_active is True  # superuser untouched

        target_user.refresh_from_db()
        assert target_user.is_active is False  # regular user deactivated

    @pytest.mark.django_db
    def test_bulk_invalid_action(self, staff_client):
        resp = staff_client.post(
            BULK_URL,
            {"ids": ["00000000-0000-0000-0000-000000000001"], "action": "nuke"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_bulk_empty_ids(self, staff_client):
        resp = staff_client.post(
            BULK_URL,
            {"ids": [], "action": "deactivate"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_bulk_nonexistent_users_skipped(self, staff_client):
        import uuid
        resp = staff_client.post(
            BULK_URL,
            {"ids": [str(uuid.uuid4())], "action": "deactivate"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "0 users updated" in resp.data["detail"]

    @pytest.mark.django_db
    def test_non_staff_cannot_bulk(self, regular_client, target_user):
        resp = regular_client.post(
            BULK_URL,
            {"ids": [str(target_user.id)], "action": "deactivate"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
