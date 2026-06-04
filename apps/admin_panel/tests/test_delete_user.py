"""
Tests for admin delete user account endpoint (Task 3b).
DELETE /api/admin-panel/users/<uuid>/
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.admin_panel.models import AdminActionLog

User = get_user_model()

USER_URL = '/api/admin-panel/users/'


def _user_url(pk):
    return f'{USER_URL}{pk}/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email='admin@example.com',
        password='TestPass123!',
        firstName='Admin',
        lastName='User',
        email_verified=True,
        is_staff=True,
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email='regular@example.com',
        password='TestPass123!',
        firstName='Regular',
        lastName='User',
        email_verified=True,
    )


@pytest.fixture
def target_user(db):
    return User.objects.create_user(
        email='target@example.com',
        password='TestPass123!',
        firstName='Target',
        lastName='User',
        email_verified=True,
    )


@pytest.fixture
def superuser(db):
    return User.objects.create_superuser(
        email='super@example.com',
        password='TestPass123!',
        firstName='Super',
        lastName='User',
    )


@pytest.fixture
def auth_admin(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def auth_regular(api_client, regular_user):
    api_client.force_authenticate(user=regular_user)
    return api_client


@pytest.mark.django_db
class TestAdminDeleteUser:

    def test_unauthenticated_returns_401(self, api_client, target_user):
        response = api_client.delete(_user_url(target_user.pk))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_admin_returns_403(self, auth_regular, target_user):
        response = auth_regular.delete(_user_url(target_user.pk))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_deletes_regular_user(self, auth_admin, target_user):
        user_id = target_user.pk
        response = auth_admin.delete(_user_url(user_id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not User.objects.filter(pk=user_id).exists()

    def test_admin_delete_creates_audit_log(self, auth_admin, target_user):
        auth_admin.delete(_user_url(target_user.pk))
        log = AdminActionLog.objects.filter(action_type='user_delete').first()
        assert log is not None
        assert log.details['email'] == 'target@example.com'

    def test_delete_nonexistent_user_returns_404(self, auth_admin):
        import uuid
        fake_id = uuid.uuid4()
        response = auth_admin.delete(_user_url(fake_id))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_delete_superuser(self, auth_admin, superuser):
        response = auth_admin.delete(_user_url(superuser.pk))
        # Non-superuser admin cannot see superusers, so returns 404
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_cannot_delete_self(self, auth_admin, admin_user):
        response = auth_admin.delete(_user_url(admin_user.pk))
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert User.objects.filter(pk=admin_user.pk).exists()

    def test_get_still_works(self, auth_admin, target_user):
        response = auth_admin.get(_user_url(target_user.pk))
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == 'target@example.com'
