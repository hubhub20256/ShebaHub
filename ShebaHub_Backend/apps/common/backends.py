"""Custom authentication backend for the env-based admin account."""

import hmac
import logging

from django.contrib.auth.backends import BaseBackend

from .admin_credentials import ADMIN_EMAIL, ADMIN_PASSWORD

logger = logging.getLogger(__name__)
audit_logger = logging.getLogger('audit')


class EnvAdminBackend(BaseBackend):
    """
    Authenticates the admin account using environment variables.

    On first login the User row is auto-provisioned with full superuser
    privileges.  Existing users are returned as-is — demoted privileges
    are NOT auto-restored (administrators must re-grant via the admin panel).

    If ADMIN_EMAIL or ADMIN_PASSWORD are not set in the environment,
    authentication is silently disabled (returns None).
    """

    def authenticate(self, request, email=None, username=None, password=None, **kwargs):
        if ADMIN_EMAIL is None or ADMIN_PASSWORD is None:
            return None

        # login_view passes username=email, so accept either
        email = email or username
        if email is None or password is None:
            return None

        if email.lower() != ADMIN_EMAIL.lower():
            return None

        # Timing-safe password comparison to prevent side-channel attacks
        if not hmac.compare_digest(
            password.encode('utf-8'),
            ADMIN_PASSWORD.encode('utf-8'),
        ):
            audit_logger.warning(
                "Failed env-admin login attempt",
                extra={'email': email},
            )
            return None

        from apps.accounts.models import User

        user, created = User.objects.get_or_create(
            email__iexact=ADMIN_EMAIL,
            defaults={
                'email': ADMIN_EMAIL,
                'firstName': 'Admin',
                'lastName': 'User',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
                'email_verified': True,
            },
        )

        if created:
            audit_logger.info(
                "Env-admin user auto-provisioned",
                extra={'email': ADMIN_EMAIL, 'user_id': str(user.id)},
            )

        return user

    def get_user(self, user_id):
        from apps.accounts.models import User

        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
