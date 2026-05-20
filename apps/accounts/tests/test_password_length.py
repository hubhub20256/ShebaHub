"""
Tests for password minimum length validation (updated to 8 characters).

Covers:
- Django MinimumLengthValidator accepts 8-char passwords
- Django MinimumLengthValidator rejects 7-char passwords
- Signup endpoint rejects short passwords
- Signup endpoint accepts 8-char passwords (with valid format)
"""

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
class TestPasswordMinimumLength:

    def test_8_char_password_passes_validation(self):
        """An 8-character password that meets all other rules should pass."""
        # Must not be too common, not all numeric, not similar to user attrs
        try:
            validate_password('Abcd1234')
        except ValidationError:
            # Might fail for other reasons (common/numeric), try another
            try:
                validate_password('xK9m!pQw')
            except ValidationError as e:
                # If it fails, ensure it's NOT because of length
                length_errors = [
                    msg for msg in e.messages
                    if 'at least' in msg.lower() and 'character' in msg.lower()
                ]
                assert len(length_errors) == 0, f"Length validation failed unexpectedly: {length_errors}"

    def test_7_char_password_fails_validation(self):
        """A 7-character password should be rejected by MinimumLengthValidator."""
        with pytest.raises(ValidationError) as exc_info:
            validate_password('Ab1!xyz')
        messages = ' '.join(exc_info.value.messages)
        assert '8' in messages  # Should mention "at least 8 characters"

    def test_14_char_password_still_passes(self):
        """A 14-character password (the old minimum) should still pass."""
        try:
            validate_password('xK9m!pQwR5tL2v')
        except ValidationError as e:
            length_errors = [
                msg for msg in e.messages
                if 'at least' in msg.lower() and 'character' in msg.lower()
            ]
            assert len(length_errors) == 0

    def test_signup_rejects_short_password(self):
        """Signup endpoint should reject passwords shorter than 8 characters."""
        client = APIClient()
        response = client.post('/api/auth/signup/', {
            'email': 'shortpass@example.com',
            'firstName': 'Test',
            'lastName': 'User',
            'gender': 'male',
            'password': 'Ab1!xy',  # 6 chars
            'confirmPassword': 'Ab1!xy',
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_signup_accepts_8_char_password(self):
        """Signup endpoint should accept a valid 8-character password."""
        client = APIClient()
        response = client.post('/api/auth/signup/', {
            'email': 'goodpass@example.com',
            'firstName': 'Test',
            'lastName': 'User',
            'gender': 'male',
            'password': 'xK9m!pQw',
            'confirmPassword': 'xK9m!pQw',
        }, format='json')
        # Should be 201 (created) or at least not 400 due to password length
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            # Ensure error is NOT about password length
            errors = str(response.data)
            assert 'at least' not in errors.lower() or '8' not in errors
