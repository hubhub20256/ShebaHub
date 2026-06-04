"""
Custom throttle classes for rate limiting sensitive endpoints.
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Stricter rate limit for login attempts (prevents brute-force)."""
    scope = 'login'


class RegisterRateThrottle(AnonRateThrottle):
    """Rate limit for registration (prevents spam accounts)."""
    scope = 'register'


class UploadRateThrottle(UserRateThrottle):
    """Rate limit for file uploads."""
    scope = 'upload'


class ContactRateThrottle(UserRateThrottle):
    """Rate limit for contact messages."""
    scope = 'contact'


class PasswordResetRateThrottle(AnonRateThrottle):
    """Rate limit for password reset requests (prevents abuse)."""
    scope = 'password_reset'


class ResearchApplicationRateThrottle(UserRateThrottle):
    """Rate limit for research applications (prevents spam applications)."""
    scope = 'research_application'


class ChatMessageRateThrottle(UserRateThrottle):
    """Rate limit for chat messages."""
    scope = 'chat_message'
