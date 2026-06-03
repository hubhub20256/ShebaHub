"""
Tests for password reset endpoints.

Covers:
- POST /api/auth/password-reset/  (request flow)
- POST /api/auth/password-reset/confirm/  (token + new password flow)

Security focus:
- Unknown email must not leak existence
- Invalid uid / token / expired token reject
- Successful reset invalidates the token (no replay)
- Lockout fields are cleared on reset
- Inactive-user current behavior is documented
"""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

PASSWORD_RESET_URL = reverse("password_reset_request")
PASSWORD_RESET_CONFIRM_URL = reverse("password_reset_confirm")


# ---------------------------------------------------------------------------
# Throttle disabling — same pattern as test_logout_me.py
# ---------------------------------------------------------------------------

_disable_throttles = patch(
    "rest_framework.views.APIView.check_throttles",
    return_value=None,
)


@pytest.fixture(autouse=True)
def no_throttle():
    _disable_throttles.start()
    yield
    _disable_throttles.stop()


# ---------------------------------------------------------------------------
# Fixtures + helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="reset_user@example.com",
        password="OriginalPass123!",
        firstName="Reset",
        lastName="User",
        email_verified=True,
    )


@pytest.fixture
def inactive_user(db):
    u = User.objects.create_user(
        email="inactive_user@example.com",
        password="OriginalPass123!",
        firstName="Inactive",
        lastName="User",
        email_verified=True,
    )
    u.is_active = False
    u.save(update_fields=["is_active"])
    return u


def _make_uid_token(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return uid, token


# ===========================================================================
# Request endpoint
# ===========================================================================

@pytest.mark.django_db
class TestPasswordResetRequest:
    def test_valid_email_returns_200_and_sends_email(self, client, user, mailoutbox):
        response = client.post(PASSWORD_RESET_URL, {"email": user.email}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert len(mailoutbox) == 1
        msg = mailoutbox[0]
        assert user.email in msg.to
        # Reset URL with uid+token must be in the body
        assert "uid=" in msg.body
        assert "token=" in msg.body
        assert "/reset-password" in msg.body

    def test_unknown_email_returns_200_and_sends_no_email(
        self, client, db, mailoutbox
    ):
        response = client.post(
            PASSWORD_RESET_URL, {"email": "noone@example.com"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(mailoutbox) == 0

    def test_inactive_user_currently_sends_email(
        self, client, inactive_user, mailoutbox
    ):
        """
        Documents current behavior: inactive users still receive reset emails.
        Their tokens are still valid (default_token_generator does not check
        is_active). Login is still blocked while inactive, but if the account
        is later reactivated the post-reset password is in effect.
        """
        response = client.post(
            PASSWORD_RESET_URL, {"email": inactive_user.email}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(mailoutbox) == 1

    def test_invalid_email_format_returns_400(self, client, db):
        response = client.post(
            PASSWORD_RESET_URL, {"email": "not-an-email"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_email_returns_400(self, client, db):
        response = client.post(PASSWORD_RESET_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_mixed_case_email_input_still_works(self, client, user, mailoutbox):
        # signup lowercases on save; the request serializer also lowercases.
        upper = user.email.upper()
        response = client.post(PASSWORD_RESET_URL, {"email": upper}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert len(mailoutbox) == 1
        assert user.email in mailoutbox[0].to


# ===========================================================================
# Confirm endpoint
# ===========================================================================

@pytest.mark.django_db
class TestPasswordResetConfirm:
    def _payload(self, uid, token, password="NewPass123!"):
        return {
            "uid": uid,
            "token": token,
            "password": password,
            "confirmPassword": password,
        }

    def test_confirm_with_valid_token_returns_200(self, client, user):
        uid, token = _make_uid_token(user)
        response = client.post(
            PASSWORD_RESET_CONFIRM_URL, self._payload(uid, token), format="json"
        )
        assert response.status_code == status.HTTP_200_OK

    def test_confirm_actually_changes_password(self, client, user):
        uid, token = _make_uid_token(user)
        new_password = "BrandNewPass456!"
        response = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            self._payload(uid, token, new_password),
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.check_password(new_password)
        assert not user.check_password("OriginalPass123!")

    def test_confirm_clears_lockout_state(self, client, user):
        user.failed_login_attempts = 5
        user.locked_until = timezone.now() + timezone.timedelta(minutes=15)
        user.save(update_fields=["failed_login_attempts", "locked_until"])

        uid, token = _make_uid_token(user)
        response = client.post(
            PASSWORD_RESET_CONFIRM_URL, self._payload(uid, token), format="json"
        )
        assert response.status_code == status.HTTP_200_OK

        user.refresh_from_db()
        assert user.failed_login_attempts == 0
        assert user.locked_until is None

    def test_confirm_with_invalid_token_returns_400(self, client, user):
        uid, _ = _make_uid_token(user)
        response = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            self._payload(uid, "totally-bogus-token"),
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_with_invalid_uid_returns_400(self, client, user):
        _, token = _make_uid_token(user)
        response = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            self._payload("!!!not-base64!!!", token),
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_with_unknown_user_returns_400(self, client, db):
        # Encode a UUID that doesn't correspond to any user.
        import uuid
        fake_uid = urlsafe_base64_encode(force_bytes(uuid.uuid4()))
        response = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            self._payload(fake_uid, "anything"),
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_password_mismatch_returns_400(self, client, user):
        uid, token = _make_uid_token(user)
        response = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "password": "GoodPass123!",
                "confirmPassword": "Different456!",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_weak_password_returns_400(self, client, user):
        uid, token = _make_uid_token(user)
        response = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            self._payload(uid, token, password="123"),
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_missing_fields_returns_400(self, client, db):
        response = client.post(PASSWORD_RESET_CONFIRM_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_token_cannot_be_reused_after_successful_reset(
        self, client, user
    ):
        """
        Security guarantee: once a reset succeeds, the same token must NOT work
        again. The default_token_generator hashes user.password, so changing
        the password automatically invalidates the prior token.
        """
        uid, token = _make_uid_token(user)
        first = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            self._payload(uid, token, "FirstNewPass123!"),
            format="json",
        )
        assert first.status_code == status.HTTP_200_OK

        # Replay with the same token (and matching uid) should now fail.
        replay = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            self._payload(uid, token, "SecondNewPass123!"),
            format="json",
        )
        assert replay.status_code == status.HTTP_400_BAD_REQUEST

        user.refresh_from_db()
        # The first reset stuck; the replay did not overwrite it.
        assert user.check_password("FirstNewPass123!")
        assert not user.check_password("SecondNewPass123!")

    def test_confirm_expired_token_returns_400(self, client, user):
        """
        Simulate an expired token by patching the token generator so that
        check_token returns False, regardless of internal state.
        """
        uid, token = _make_uid_token(user)
        with patch(
            "apps.accounts.serializers.default_token_generator.check_token",
            return_value=False,
        ):
            response = client.post(
                PASSWORD_RESET_CONFIRM_URL,
                self._payload(uid, token),
                format="json",
            )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_for_inactive_user_currently_succeeds(
        self, client, inactive_user
    ):
        """
        Documents current behavior: an inactive user can still complete a
        password reset (default_token_generator does not check is_active).
        Login is still blocked because is_active stays False — but the
        password is changed in the database. Flagged as an edge case;
        not exploitable for direct takeover today.
        """
        uid, token = _make_uid_token(inactive_user)
        response = client.post(
            PASSWORD_RESET_CONFIRM_URL,
            self._payload(uid, token, "AfterReset123!"),
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        inactive_user.refresh_from_db()
        assert inactive_user.check_password("AfterReset123!")
        assert inactive_user.is_active is False
