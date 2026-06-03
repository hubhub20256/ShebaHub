from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication


class ActiveUserJWTAuthentication(JWTAuthentication):
    """Reject tokens belonging to deactivated users (is_active=False)."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if not user.is_active:
            raise exceptions.AuthenticationFailed("User account is deactivated.")
        return user
