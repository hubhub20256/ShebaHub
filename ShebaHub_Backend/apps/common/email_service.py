"""
Centralized email service for ShebaHub.

All outbound emails go through this module so that sending logic,
subject lines, and recipient-verification checks live in one place.
"""

import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

audit_logger = logging.getLogger('audit')


class EmailService:
    """Stateless helper — every public method is a @staticmethod."""

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _safe_send(*, subject, message, recipient_list):
        """Send an email via Django's send_mail; log failures and return bool."""
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipient_list,
                fail_silently=False,
            )
            return True
        except Exception as exc:
            audit_logger.error(
                "Email send failed: to=%s subject=%s error=%s",
                recipient_list, subject, exc,
            )
            return False

    @staticmethod
    def _check_verified(user):
        """Return True if the user's email is verified (gate for notifications)."""
        if getattr(user, 'email_verified', False):
            return True
        audit_logger.warning(
            "Skipping email to unverified user %s", user.email,
        )
        return False

    @staticmethod
    def _build_uid_token(user):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        return uid, token

    @staticmethod
    def _frontend_url():
        return getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

    # ------------------------------------------------------------------
    # Auth-related (no verified-check — these ARE the verification flow)
    # ------------------------------------------------------------------

    @classmethod
    def send_verification_email(cls, user):
        """Send the email-verification link. Always allowed (unverified users need this)."""
        uid, token = cls._build_uid_token(user)
        verify_url = f"{cls._frontend_url()}/verify-email?uid={uid}&token={token}"
        return cls._safe_send(
            subject='\u05d0\u05d9\u05de\u05d5\u05ea \u05db\u05ea\u05d5\u05d1\u05ea \u05d0\u05d9\u05de\u05d9\u05d9\u05dc \u2014 ShebaHub',
            message=(
                f'\u05dc\u05d7\u05e5/\u05d9 \u05e2\u05dc \u05d4\u05e7\u05d9\u05e9\u05d5\u05e8 \u05db\u05d3\u05d9 \u05dc\u05d0\u05de\u05ea \u05d0\u05ea \u05db\u05ea\u05d5\u05d1\u05ea \u05d4\u05d0\u05d9\u05de\u05d9\u05d9\u05dc:\n\n'
                f'{verify_url}\n\n'
                '\u05d0\u05dd \u05dc\u05d0 \u05d1\u05d9\u05e7\u05e9\u05ea \u05d6\u05d0\u05ea, \u05d4\u05ea\u05e2\u05dc\u05dd/\u05d9 \u05de\u05d4\u05d5\u05d3\u05e2\u05d4 \u05d6\u05d5.'
            ),
            recipient_list=[user.email],
        )

    @classmethod
    def send_password_reset_email(cls, user):
        """Send a password-reset link. Always allowed (locked-out users need this)."""
        uid, token = cls._build_uid_token(user)
        reset_url = f"{cls._frontend_url()}/reset-password?uid={uid}&token={token}"
        return cls._safe_send(
            subject='Password Reset \u2014 ShebaHub',
            message=(
                f'Click the link to reset your password:\n\n'
                f'{reset_url}\n\n'
                'If you did not request this, ignore this email.'
            ),
            recipient_list=[user.email],
        )

    # ------------------------------------------------------------------
    # Notification emails (require verified recipient)
    # ------------------------------------------------------------------

    @classmethod
    def send_research_approved_email(cls, user, research):
        """Notify a mentor that their research has been approved."""
        if not cls._check_verified(user):
            return False
        return cls._safe_send(
            subject=f'\u05d4\u05de\u05d7\u05e7\u05e8 {research.researchName} \u05d0\u05d5\u05e9\u05e8 \u2014 ShebaHub',
            message=(
                f'\u05d4\u05de\u05d7\u05e7\u05e8 \u05e9\u05dc\u05da "{research.researchName}" \u05d0\u05d5\u05e9\u05e8 \u05d5\u05de\u05d5\u05e4\u05d9\u05e2 \u05db\u05e2\u05ea \u05d1\u05d0\u05ea\u05e8.\n\n'
                f'{cls._frontend_url()}/research/{research.id}'
            ),
            recipient_list=[user.email],
        )

    @classmethod
    def send_research_rejected_email(cls, user, research):
        """Notify a mentor that their research has been rejected."""
        if not cls._check_verified(user):
            return False
        return cls._safe_send(
            subject=f'\u05d4\u05de\u05d7\u05e7\u05e8 {research.researchName} \u05e0\u05d3\u05d7\u05d4 \u2014 ShebaHub',
            message=(
                f'\u05d4\u05de\u05d7\u05e7\u05e8 \u05e9\u05dc\u05da "{research.researchName}" \u05e0\u05d3\u05d7\u05d4 \u05e2\u05dc \u05d9\u05d3\u05d9 \u05e6\u05d5\u05d5\u05ea \u05d4\u05de\u05d5\u05d3\u05e8\u05e6\u05d9\u05d4.\n\n'
                '\u05e0\u05d9\u05ea\u05df \u05dc\u05e2\u05e8\u05d5\u05da \u05d0\u05ea \u05d4\u05de\u05d7\u05e7\u05e8 \u05d5\u05dc\u05e9\u05dc\u05d5\u05d7 \u05e9\u05d5\u05d1.'
            ),
            recipient_list=[user.email],
        )

    @classmethod
    def send_private_message_notification(cls, recipient, sender, message_preview):
        """Alert a user that they received a private message."""
        if not cls._check_verified(recipient):
            return False
        preview = (message_preview[:120] + '...') if len(message_preview) > 120 else message_preview
        return cls._safe_send(
            subject=f'\u05d4\u05d5\u05d3\u05e2\u05d4 \u05d7\u05d3\u05e9\u05d4 \u05de-{sender.get_full_name()} \u2014 ShebaHub',
            message=(
                f'\u05e7\u05d9\u05d1\u05dc\u05ea \u05d4\u05d5\u05d3\u05e2\u05d4 \u05d7\u05d3\u05e9\u05d4 \u05de-{sender.get_full_name()}:\n\n'
                f'{preview}\n\n'
                f'\u05dc\u05e6\u05e4\u05d9\u05d9\u05d4 \u05d1\u05ea\u05d9\u05d1\u05ea \u05d4\u05d4\u05d5\u05d3\u05e2\u05d5\u05ea: {cls._frontend_url()}/messages'
            ),
            recipient_list=[recipient.email],
        )

    @classmethod
    def send_research_invitation_email(cls, user, research):
        """Notify a student that they have been invited to a research."""
        if not cls._check_verified(user):
            return False
        return cls._safe_send(
            subject=f'\u05d4\u05d5\u05d6\u05de\u05e0\u05ea \u05dc\u05de\u05d7\u05e7\u05e8 {research.researchName} \u2014 ShebaHub',
            message=(
                f'\u05d4\u05d5\u05d6\u05de\u05e0\u05ea \u05dc\u05d4\u05e6\u05d8\u05e8\u05e3 \u05dc\u05de\u05d7\u05e7\u05e8 "{research.researchName}".\n\n'
                f'\u05dc\u05e6\u05e4\u05d9\u05d9\u05d4 \u05d5\u05dc\u05d0\u05d9\u05e9\u05d5\u05e8: {cls._frontend_url()}/research/{research.id}'
            ),
            recipient_list=[user.email],
        )
