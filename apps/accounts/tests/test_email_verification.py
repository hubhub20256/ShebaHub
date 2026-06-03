"""
Tests for email verification endpoints.

Covers:
- POST /api/auth/verify-email/         (AllowAny — token-based)
- POST /api/auth/resend-verification/  (IsAuthenticated)

Security focus:
- Invalid uid / token reject
- Verification token shares the default_token_generator with password reset
  → it must be invalidated when the password changes (cross-flow safety)
- Resend requires authentication and is no-op for already-verified users
"""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

VERIFY_EMAIL_URL = reverse("verify_email")
RESEND_VERIFICATION_URL = reverse("resend_verification")


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
def unverified_user(db):
    return User.objects.create_user(
        email="unverified@example.com",
        password="OriginalPass123!",
        firstName="Un",
        lastName="Verified",
        email_verified=False,
    )


@pytest.fixture
def verified_user(db):
    return User.objects.create_user(
        email="verified@example.com",
        password="OriginalPass123!",
        firstName="Veri",
        lastName="Fied",
        email_verified=True,
    )


def _make_uid_token(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return uid, token


# ===========================================================================
# Verify email
# ===========================================================================

@pytest.mark.django_db
class TestVerifyEmail:
    def test_valid_token_sets_email_verified(self, client, unverified_user):
        uid, token = _make_uid_token(unverified_user)
        response = client.post(
            VERIFY_EMAIL_URL, {"uid": uid, "token": token}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        unverified_user.refresh_from_db()
        assert unverified_user.email_verified is True

    def test_already_verified_user_idempotent_200(self, client, verified_user):
        """
        Current behavior: an already-verified user with a valid token still
        gets a 200. email_verified stays True (no-op write).
        """
        uid, token = _make_uid_token(verified_user)
        response = client.post(
            VERIFY_EMAIL_URL, {"uid": uid, "token": token}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        verified_user.refresh_from_db()
        assert verified_user.email_verified is True

    def test_invalid_token_returns_400(self, client, unverified_user):
        uid, _ = _make_uid_token(unverified_user)
        response = client.post(
            VERIFY_EMAIL_URL, {"uid": uid, "token": "nope-not-real"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        unverified_user.refresh_from_db()
        assert unverified_user.email_verified is False

    def test_invalid_uid_returns_400(self, client, unverified_user):
        _, token = _make_uid_token(unverified_user)
        response = client.post(
            VERIFY_EMAIL_URL,
            {"uid": "!!!not-base64!!!", "token": token},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_uid_returns_400(self, client, unverified_user):
        _, token = _make_uid_token(unverified_user)
        response = client.post(VERIFY_EMAIL_URL, {"token": token}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_token_returns_400(self, client, unverified_user):
        uid, _ = _make_uid_token(unverified_user)
        response = client.post(VERIFY_EMAIL_URL, {"uid": uid}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_token_invalidated_by_password_change(self, client, unverified_user):
        """
        Cross-flow security: verify-email and password-reset use the SAME
        default_token_generator. If the user's password changes, any pending
        verification token must stop working.
        """
        uid, token = _make_uid_token(unverified_user)
        unverified_user.set_password("AfterPasswordChange123!")
        unverified_user.save(update_fields=["password"])

        response = client.post(
            VERIFY_EMAIL_URL, {"uid": uid, "token": token}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        unverified_user.refresh_from_db()
        assert unverified_user.email_verified is False


# ===========================================================================
# Resend verification
# ===========================================================================

@pytest.mark.django_db
class TestResendVerification:
    def test_resend_unauthenticated_returns_401(self, client, db):
        response = client.post(RESEND_VERIFICATION_URL, {}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_resend_for_unverified_user_sends_email(
        self, client, unverified_user, mailoutbox
    ):
        client.force_authenticate(user=unverified_user)
        response = client.post(RESEND_VERIFICATION_URL, {}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert len(mailoutbox) == 1
        msg = mailoutbox[0]
        assert unverified_user.email in msg.to
        assert "uid=" in msg.body
        assert "token=" in msg.body
        assert "/verify-email" in msg.body

    def test_resend_for_already_verified_returns_400(
        self, client, verified_user, mailoutbox
    ):
        client.force_authenticate(user=verified_user)
        response = client.post(RESEND_VERIFICATION_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert len(mailoutbox) == 0

    def test_resend_email_failure_returns_502(self, client, unverified_user):
        client.force_authenticate(user=unverified_user)
        with patch(
            "apps.accounts.views.EmailService.send_verification_email",
            return_value=False,
        ):
            response = client.post(RESEND_VERIFICATION_URL, {}, format="json")
        assert response.status_code == status.HTTP_502_BAD_GATEWAY
