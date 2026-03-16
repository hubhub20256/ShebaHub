"""Tests for the centralized EmailService (apps.common.email_service)."""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient

from apps.common.email_service import EmailService

User = get_user_model()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SIGNUP_URL = reverse("signup")
VERIFY_EMAIL_URL = reverse("verify_email")
PASSWORD_RESET_URL = reverse("password_reset_request")

STRONG_PASSWORD = "V3ryStr0ng!Pass"

SIGNUP_PAYLOAD = {
    "email": "newuser@example.com",
    "password": STRONG_PASSWORD,
    "confirmPassword": STRONG_PASSWORD,
    "firstName": "New",
    "lastName": "User",
    "gender": "male",
}


def _make_user(email="service-test@example.com", **kwargs):
    """Shortcut to create a test user in the database."""
    defaults = dict(
        password=STRONG_PASSWORD,
        firstName="Test",
        lastName="User",
    )
    defaults.update(kwargs)
    return User.objects.create_user(email=email, **defaults)


# ---------------------------------------------------------------------------
# 1. Verification email uses the correct FROM address
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestVerificationEmailFromAddress:
    """send_verification_email should use DEFAULT_FROM_EMAIL as the sender."""

    @patch("apps.common.email_service.send_mail")
    def test_verification_email_uses_correct_from_address(self, mock_send_mail):
        mock_send_mail.return_value = 1  # send_mail returns number of messages sent

        user = _make_user()
        EmailService.send_verification_email(user)

        mock_send_mail.assert_called_once()
        call_kwargs = mock_send_mail.call_args
        # send_mail is called with keyword arguments in _safe_send
        from_email = call_kwargs.kwargs.get("from_email") or call_kwargs[1].get(
            "from_email"
        )
        assert from_email == "noreply@hitheal.org.il"


# ---------------------------------------------------------------------------
# 2. Signup triggers a verification email (integration via outbox)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSignupTriggersVerificationEmail:
    """POST to /api/auth/signup/ should send a verification email."""

    def test_signup_triggers_verification_email(self, settings):
        # Use the in-memory backend so mail.outbox is populated
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

        client = APIClient()
        response = client.post(SIGNUP_URL, SIGNUP_PAYLOAD, format="json")

        assert response.status_code == status.HTTP_201_CREATED

        # Exactly one email should have been sent (the verification email)
        assert len(mail.outbox) == 1

        sent = mail.outbox[0]
        assert sent.to == [SIGNUP_PAYLOAD["email"]]
        assert sent.from_email == "noreply@hitheal.org.il"
        # The verification link should contain uid= and token=
        assert "uid=" in sent.body
        assert "token=" in sent.body


# ---------------------------------------------------------------------------
# 3. Password reset request sends an email
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPasswordResetSendsEmail:
    """POST to /api/auth/password-reset/ should send a reset email."""

    def test_password_reset_sends_email(self, settings):
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

        user = _make_user(email="reset-me@example.com")

        client = APIClient()
        response = client.post(
            PASSWORD_RESET_URL, {"email": user.email}, format="json"
        )

        assert response.status_code == status.HTTP_200_OK

        # One email should have been dispatched
        assert len(mail.outbox) == 1

        sent = mail.outbox[0]
        assert sent.to == [user.email]
        assert "reset-password" in sent.body
        assert "uid=" in sent.body
        assert "token=" in sent.body


# ---------------------------------------------------------------------------
# 4. Full verification-token flow (create user -> generate token -> verify)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestVerificationTokenFlow:
    """Generate a verification uid/token pair and confirm the email."""

    def test_verification_token_flow(self):
        user = _make_user(email="verify-flow@example.com")
        assert user.email_verified is False

        # Build uid + token the same way EmailService does
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        client = APIClient()
        response = client.post(
            VERIFY_EMAIL_URL,
            {"uid": uid, "token": token},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        user.refresh_from_db()
        assert user.email_verified is True


# ---------------------------------------------------------------------------
# 5. Expired / invalid token is rejected
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestExpiredTokenRejected:
    """An invalid or fabricated token must be rejected by the verify endpoint."""

    def test_expired_token_rejected(self):
        user = _make_user(email="expired-token@example.com")

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        bogus_token = "bad-token-value-000"

        client = APIClient()
        response = client.post(
            VERIFY_EMAIL_URL,
            {"uid": uid, "token": bogus_token},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "invalid" in response.data["detail"].lower() or "expired" in response.data["detail"].lower()

        # email_verified must remain False
        user.refresh_from_db()
        assert user.email_verified is False
