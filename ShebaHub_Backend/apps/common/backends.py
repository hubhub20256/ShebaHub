"""Custom authentication backend for the env-based admin account."""

import logging

from django.contrib.auth.backends import BaseBackend

from .admin_credentials import ADMIN_EMAIL, ADMIN_PASSWORD

logger = logging.getLogger(__name__)


class EnvAdminBackend(BaseBackend):
    """
    Authenticates the admin account using environment variables.

    On first login the User row is auto-provisioned with full superuser
    privileges.  If the user already exists but was demoted, privileges
    are restored automatically.

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

        if password != ADMIN_PASSWORD:
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

        if not created:
            # Restore privileges if the user was demoted
            changed = False
            for attr in ('is_staff', 'is_superuser', 'is_active', 'email_verified'):
                if not getattr(user, attr):
                    setattr(user, attr, True)
                    changed = True
            if changed:
                user.save(update_fields=['is_staff', 'is_superuser', 'is_active', 'email_verified'])

        return user

    def get_user(self, user_id):
        from apps.accounts.models import User

        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
