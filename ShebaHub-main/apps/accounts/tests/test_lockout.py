"""
Tests for the account lockout mechanism.

Covers:
- Failed login attempts increment failed_login_attempts counter
- After 5 failures, account is locked (returns 403 with lockout message)
- Locked account cannot login even with correct password
- Lockout expires after 15 minutes (mocked timezone)
- Successful login resets failed_login_attempts to 0
- Successful login clears locked_until
"""

from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

LOGIN_URL = reverse("login")

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
def lockout_user(db):
    return User.objects.create_user(
        email="lockout@example.com",
        password="CorrectPass123!",
        firstName="Lock",
        lastName="Out",
    )


@pytest.fixture
def client():
    return APIClient()


def _fail_login(client, email, n=1):
    """Send *n* login requests with a wrong password."""
    for _ in range(n):
        client.post(
            LOGIN_URL,
            {"email": email, "password": "WrongPassword!"},
            format="json",
        )


# ------------------------------------------------------------------
# 1. Failed login increments the counter
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestFailedLoginCounter:

    def test_single_failure_increments_counter(self, client, lockout_user):
        """One wrong password should set failed_login_attempts to 1."""
        _fail_login(client, lockout_user.email, n=1)
        lockout_user.refresh_from_db()
        assert lockout_user.failed_login_attempts == 1

    def test_multiple_failures_increment_counter(self, client, lockout_user):
        """Three consecutive wrong passwords -> counter == 3."""
        _fail_login(client, lockout_user.email, n=3)
        lockout_user.refresh_from_db()
        assert lockout_user.failed_login_attempts == 3

    def test_failure_for_nonexistent_user_returns_401(self, client, db):
        """Wrong email should return 401 without errors."""
        resp = client.post(
            LOGIN_URL,
            {"email": "nobody@example.com", "password": "Whatever1!"},
            format="json",
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ------------------------------------------------------------------
# 2. Account is locked after 5 failures
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestLockoutTriggered:

    def test_fifth_failure_locks_account(self, client, lockout_user):
        """After 5 wrong passwords the account should be locked."""
        _fail_login(client, lockout_user.email, n=5)
        lockout_user.refresh_from_db()
        assert lockout_user.failed_login_attempts >= 5
        assert lockout_user.locked_until is not None

    def test_sixth_attempt_returns_403(self, client, lockout_user):
        """The 6th attempt (after lockout) should return 403."""
        _fail_login(client, lockout_user.email, n=5)
        resp = client.post(
            LOGIN_URL,
            {"email": lockout_user.email, "password": "WrongPassword!"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_lockout_response_contains_retry_after(self, client, lockout_user):
        """403 lockout response should include retry_after seconds."""
        _fail_login(client, lockout_user.email, n=5)
        resp = client.post(
            LOGIN_URL,
            {"email": lockout_user.email, "password": "WrongPassword!"},
            format="json",
        )
        assert "retry_after" in resp.data

    def test_lockout_response_contains_detail_message(self, client, lockout_user):
        """403 lockout response should include an explanatory detail message."""
        _fail_login(client, lockout_user.email, n=5)
        resp = client.post(
            LOGIN_URL,
            {"email": lockout_user.email, "password": "WrongPassword!"},
            format="json",
        )
        assert "detail" in resp.data
        assert "locked" in resp.data["detail"].lower()


# ------------------------------------------------------------------
# 3. Locked account rejects correct password
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestLockedAccountRejectsCorrectPassword:

    def test_correct_password_rejected_while_locked(self, client, lockout_user):
        """Even the right password should fail while the account is locked."""
        _fail_login(client, lockout_user.email, n=5)
        resp = client.post(
            LOGIN_URL,
            {"email": lockout_user.email, "password": "CorrectPass123!"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert "retry_after" in resp.data


# ------------------------------------------------------------------
# 4. Lockout expires after 15 minutes
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestLockoutExpiry:

    def test_login_succeeds_after_lockout_expires(self, client, lockout_user):
        """After 15 minutes the lockout should expire and login should work."""
        _fail_login(client, lockout_user.email, n=5)

        # Advance time by 16 minutes so lockout has expired
        future = timezone.now() + timedelta(minutes=16)
        with patch("apps.accounts.views.timezone") as mock_tz:
            # Make timezone.now() return a time in the future
            mock_tz.now.return_value = future
            # Keep timedelta accessible
            mock_tz.side_effect = None

            resp = client.post(
                LOGIN_URL,
                {"email": lockout_user.email, "password": "CorrectPass123!"},
                format="json",
            )

        assert resp.status_code == status.HTTP_200_OK
        assert "tokens" in resp.data

    def test_login_still_locked_before_15_minutes(self, client, lockout_user):
        """Before 15 minutes the lockout should still be active."""
        _fail_login(client, lockout_user.email, n=5)

        # Advance time by only 10 minutes
        future = timezone.now() + timedelta(minutes=10)
        with patch("apps.accounts.views.timezone") as mock_tz:
            mock_tz.now.return_value = future

            resp = client.post(
                LOGIN_URL,
                {"email": lockout_user.email, "password": "CorrectPass123!"},
                format="json",
            )

        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ------------------------------------------------------------------
# 5. Successful login resets failed_login_attempts to 0
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestSuccessResetsCounter:

    def test_successful_login_resets_counter(self, client, lockout_user):
        """A successful login after some failures should reset counter to 0."""
        _fail_login(client, lockout_user.email, n=3)
        lockout_user.refresh_from_db()
        assert lockout_user.failed_login_attempts == 3

        # Now login successfully
        resp = client.post(
            LOGIN_URL,
            {"email": lockout_user.email, "password": "CorrectPass123!"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        lockout_user.refresh_from_db()
        assert lockout_user.failed_login_attempts == 0

    def test_counter_restarts_after_reset(self, client, lockout_user):
        """After a successful reset, further failures start from 0 again."""
        _fail_login(client, lockout_user.email, n=4)
        # Successful login to reset
        client.post(
            LOGIN_URL,
            {"email": lockout_user.email, "password": "CorrectPass123!"},
            format="json",
        )

        # One more failure
        _fail_login(client, lockout_user.email, n=1)
        lockout_user.refresh_from_db()
        assert lockout_user.failed_login_attempts == 1


# ------------------------------------------------------------------
# 6. Successful login clears locked_until
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestSuccessClearsLockedUntil:

    def test_successful_login_clears_locked_until(self, client, lockout_user):
        """After lockout expires, successful login should clear locked_until."""
        _fail_login(client, lockout_user.email, n=5)
        lockout_user.refresh_from_db()
        assert lockout_user.locked_until is not None

        # Advance time past lockout, then login
        future = timezone.now() + timedelta(minutes=16)
        with patch("apps.accounts.views.timezone") as mock_tz:
            mock_tz.now.return_value = future

            resp = client.post(
                LOGIN_URL,
                {"email": lockout_user.email, "password": "CorrectPass123!"},
                format="json",
            )

        assert resp.status_code == status.HTTP_200_OK

        lockout_user.refresh_from_db()
        assert lockout_user.locked_until is None
        assert lockout_user.failed_login_attempts == 0
