"""
Custom password validators for ShebaHub.

Supplements Django's built-in CommonPasswordValidator with additional
weak/common passwords that are contextually relevant.
"""

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

# Curated list of additional weak/common passwords beyond Django's built-in
# ~20,000 list.  Includes patterns frequently seen in medical/academic
# environments and Hebrew transliterations.
COMMON_PASSWORDS = frozenset({
    # Keyboard patterns
    "qwerty123", "qwerty1234", "asdf1234", "zxcvbnm1", "1q2w3e4r",
    "qazwsx123", "1qaz2wsx", "qwer1234", "asdfghjk",
    # Simple patterns
    "abcd1234", "abcdef123", "1234abcd", "abcdefgh",
    "aabb1122", "aa112233", "11223344", "12341234",
    "password1", "password12", "password123", "passw0rd",
    "p@ssw0rd", "p@ssword1", "pa$$word1",
    "welcome1", "welcome12", "welcome123",
    "changeme1", "letmein123", "iloveyou1",
    # Medical / academic context
    "sheba123", "shebahub1", "hospital1", "doctor123",
    "medical1", "research1", "student123", "mentor123",
    "medicine1", "pharmacy1", "clinical1",
    # Hebrew transliterations
    "shenkar1", "technion1", "haifa1234", "telaviv1",
    # Common names + numbers
    "michael1", "jennifer1", "superman1", "batman123",
    "football1", "baseball1", "monkey123", "dragon123",
    "master123", "shadow123", "killer123", "trustno1",
    # Year patterns
    "spring2024", "summer2024", "winter2024", "spring2025",
    "summer2025", "winter2025", "spring2026", "summer2026",
    # Repeated / trivial
    "aabbccdd", "aaaabbbb", "11111111", "00000000",
    "12345678", "87654321", "qwertyui",
})


class ShebaCommonPasswordValidator:
    """
    Reject passwords that appear in a curated list of weak/common
    passwords.  Works alongside Django's built-in CommonPasswordValidator
    to provide additional coverage for context-specific weak passwords.
    """

    def validate(self, password, user=None):
        if password.lower() in COMMON_PASSWORDS:
            raise ValidationError(
                _("This password is too common. Please choose a more unique password."),
                code="password_too_common",
            )

    def get_help_text(self):
        return _("Your password must not be a commonly used password.")
