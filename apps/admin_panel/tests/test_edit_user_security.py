"""
Tests for admin edit_user endpoint security guards.

Covers:
- is_superuser field is rejected in request data
- is_staff can only be granted by superusers
- Non-superuser staff cannot edit superuser accounts
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

EDIT_USER_URL = "/api/admin-panel/users/{}/edit/"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def superuser(db):
    return User.objects.create_user(
        email="super@example.com",
        password="SuperPass123!",
        firstName="Super",
        lastName="Admin",
        is_staff=True,
        is_superuser=True,
        email_verified=True,
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="staff@example.com",
        password="StaffPass123!",
        firstName="Staff",
        lastName="User",
        is_staff=True,
        email_verified=True,
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email="regular@example.com",
        password="RegularPass123!",
        firstName="Regular",
        lastName="User",
        email_verified=True,
    )


@pytest.mark.django_db
class TestEditUserSuperuserGuard:
    """Tests for the is_superuser privilege escalation guard."""

    def test_is_superuser_rejected_even_from_superuser(self, api_client, superuser, regular_user):
        """is_superuser cannot be set via the edit_user endpoint, even by a superuser."""
        api_client.force_authenticate(user=superuser)
        url = EDIT_USER_URL.format(regular_user.pk)

        response = api_client.patch(url, {"is_superuser": True}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        regular_user.refresh_from_db()
        assert regular_user.is_superuser is False

    def test_is_superuser_false_also_rejected(self, api_client, superuser, staff_user):
        """Even is_superuser=False is rejected — the field is not allowed at all."""
        api_client.force_authenticate(user=superuser)
        url = EDIT_USER_URL.format(staff_user.pk)

        response = api_client.patch(url, {"is_superuser": False}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_cannot_grant_is_staff(self, api_client, staff_user, regular_user):
        """Non-superuser staff cannot grant is_staff to other users."""
        api_client.force_authenticate(user=staff_user)
        url = EDIT_USER_URL.format(regular_user.pk)

        response = api_client.patch(url, {"is_staff": True}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        regular_user.refresh_from_db()
        assert regular_user.is_staff is False

    def test_superuser_can_grant_is_staff(self, api_client, superuser, regular_user):
        """Superuser can grant is_staff to other users."""
        api_client.force_authenticate(user=superuser)
        url = EDIT_USER_URL.format(regular_user.pk)

        response = api_client.patch(url, {"is_staff": True}, format="json")

        assert response.status_code == status.HTTP_200_OK
        regular_user.refresh_from_db()
        assert regular_user.is_staff is True

    def test_staff_cannot_edit_superuser(self, api_client, staff_user, superuser):
        """Non-superuser staff cannot edit a superuser's fields."""
        api_client.force_authenticate(user=staff_user)
        url = EDIT_USER_URL.format(superuser.pk)

        response = api_client.patch(url, {"firstName": "Hacked"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        superuser.refresh_from_db()
        assert superuser.firstName == "Super"
