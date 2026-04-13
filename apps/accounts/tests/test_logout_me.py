"""
Tests for logout and /me/ endpoints.

Covers:
- POST /api/auth/logout/ with valid refresh token returns 200
- POST /api/auth/logout/ without refresh token returns 200 (no-op)
- POST /api/auth/logout/ unauthenticated returns 401
- GET /api/auth/me/ authenticated returns expected user fields
- GET /api/auth/me/ unauthenticated returns 401
- After logout, refresh token is blacklisted (cannot be used to refresh)
"""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

LOGIN_URL = reverse("login")
LOGOUT_URL = reverse("logout")
ME_URL = reverse("me")
REFRESH_URL = reverse("token_refresh")

# Disable throttling for all tests in this module
_disable_throttles = patch(
    "rest_framework.views.APIView.check_throttles",
    return_value=None,
)


@pytest.fixture(autouse=True)
def no_throttle():
    _disable_throttles.start()
    yield
    _disable_throttles.stop()


@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        email="meuser@example.com",
        password="TestPass123!",
        firstName="Jane",
        lastName="Doe",
        email_verified=True,
    )


@pytest.fixture
def client():
    return APIClient()


def _login(client, email="meuser@example.com", password="TestPass123!"):
    """Login and set bearer credentials on the client. Returns tokens dict."""
    resp = client.post(
        LOGIN_URL,
        {"email": email, "password": password},
        format="json",
    )
    assert resp.status_code == status.HTTP_200_OK, f"Login failed: {resp.data}"
    tokens = resp.data["tokens"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    return tokens


# ------------------------------------------------------------------
# Logout endpoint
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestLogout:

    def test_logout_with_refresh_token_returns_200(self, client, test_user):
        """POST /logout/ with a valid refresh token returns 200."""
        tokens = _login(client, test_user.email)
        resp = client.post(LOGOUT_URL, {"refresh": tokens["refresh"]}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert "detail" in resp.data

    def test_logout_without_refresh_token_returns_200(self, client, test_user):
        """POST /logout/ with empty body returns 200 (no-op, token not blacklisted)."""
        _login(client, test_user.email)
        resp = client.post(LOGOUT_URL, {}, format="json")
        assert resp.status_code == status.HTTP_200_OK

    def test_logout_unauthenticated_returns_401(self, client, db):
        """POST /logout/ without auth header returns 401."""
        resp = client.post(LOGOUT_URL, {}, format="json")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_blacklists_refresh_token(self, client, test_user):
        """After logout the refresh token cannot be used to obtain a new access token."""
        tokens = _login(client, test_user.email)
        # Logout with the refresh token
        client.post(LOGOUT_URL, {"refresh": tokens["refresh"]}, format="json")
        # Clear auth and try to refresh
        client.credentials()
        resp = client.post(
            REFRESH_URL,
            {"refresh": tokens["refresh"]},
            format="json",
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token_still_works_if_not_blacklisted(self, client, test_user):
        """If logout is not called, the refresh token should still work."""
        tokens = _login(client, test_user.email)
        client.credentials()  # clear auth header
        resp = client.post(
            REFRESH_URL,
            {"refresh": tokens["refresh"]},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "access" in resp.data


# ------------------------------------------------------------------
# /me/ endpoint
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestMeEndpoint:

    def test_me_authenticated_returns_user_data(self, client, test_user):
        """GET /me/ should return user fields when authenticated."""
        client.force_authenticate(user=test_user)
        resp = client.get(ME_URL)
        assert resp.status_code == status.HTTP_200_OK

        data = resp.data
        assert data["id"] == str(test_user.id)
        assert data["email"] == test_user.email
        assert data["firstName"] == test_user.firstName
        assert data["lastName"] == test_user.lastName
        assert data["email_verified"] is True
        assert "has_student_profile" in data
        assert "has_mentor_profile" in data

    def test_me_returns_profile_flags_false_for_plain_user(self, client, test_user):
        """A user with no profiles should have both flags set to False."""
        client.force_authenticate(user=test_user)
        resp = client.get(ME_URL)
        assert resp.data["has_student_profile"] is False
        assert resp.data["has_mentor_profile"] is False

    def test_me_unauthenticated_returns_401(self, client, db):
        """GET /me/ without auth header should return 401."""
        resp = client.get(ME_URL)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_contains_require_email_verification_field(self, client, test_user):
        """GET /me/ should include the require_email_verification flag."""
        client.force_authenticate(user=test_user)
        resp = client.get(ME_URL)
        assert "require_email_verification" in resp.data

    def test_me_returns_is_staff_field(self, client, test_user):
        """GET /me/ should include is_staff."""
        client.force_authenticate(user=test_user)
        resp = client.get(ME_URL)
        assert "is_staff" in resp.data
        assert resp.data["is_staff"] is False

    def test_me_with_jwt_auth(self, client, test_user):
        """GET /me/ using a real JWT token (not force_authenticate)."""
        tokens = _login(client, test_user.email)
        resp = client.get(ME_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["email"] == test_user.email
