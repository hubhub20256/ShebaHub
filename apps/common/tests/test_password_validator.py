"""
Tests for custom ShebaCommonPasswordValidator (Task 1).

Covers:
- Valid (strong) password passes all validators
- Common password from custom list is rejected
- Password validation runs during signup
- Password validation runs during password reset
"""

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
class TestShebaCommonPasswordValidator:

    def test_strong_password_passes(self):
        """A strong, unique password should pass all validators."""
        # Should not raise
        validate_password('xK9m!pQw3rZ')

    def test_common_password_from_custom_list_rejected(self):
        """Passwords in our custom COMMON_PASSWORDS set should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            validate_password('sheba123')
        messages = ' '.join(exc_info.value.messages)
        assert 'common' in messages.lower()

    def test_another_common_password_rejected(self):
        """Another custom common password should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            validate_password('hospital1')
        messages = ' '.join(exc_info.value.messages)
        assert 'common' in messages.lower()

    def test_keyboard_pattern_rejected(self):
        """Keyboard pattern passwords should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            validate_password('qwerty1234')
        messages = ' '.join(exc_info.value.messages)
        assert 'common' in messages.lower()

    def test_django_builtin_common_password_rejected(self):
        """Django's built-in CommonPasswordValidator should still work."""
        with pytest.raises(ValidationError):
            validate_password('password')

    def test_signup_rejects_common_password(self):
        """Signup endpoint should reject passwords from the custom list."""
        client = APIClient()
        response = client.post('/api/auth/signup/', {
            'email': 'commonpw@example.com',
            'firstName': 'Test',
            'lastName': 'User',
            'password': 'research1',
            'confirmPassword': 'research1',
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_signup_accepts_strong_password(self):
        """Signup endpoint should accept a strong password."""
        client = APIClient()
        response = client.post('/api/auth/signup/', {
            'email': 'strongpw@example.com',
            'firstName': 'Test',
            'lastName': 'User',
            'password': 'xK9m!pQw3rZ',
            'confirmPassword': 'xK9m!pQw3rZ',
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED

    def test_password_reset_rejects_common_password(self):
        """Password reset confirm should reject common passwords.
        We test the serializer directly since the endpoint requires a valid token."""
        from apps.accounts.serializers import PasswordResetConfirmSerializer
        serializer = PasswordResetConfirmSerializer(data={
            'uid': 'fake-uid',
            'token': 'fake-token',
            'password': 'student123',
            'confirmPassword': 'student123',
        })
        # The password field-level validation should fail before token check
        assert not serializer.is_valid()
        assert 'password' in serializer.errors

    def test_case_insensitive_match(self):
        """Common password check should be case-insensitive."""
        with pytest.raises(ValidationError) as exc_info:
            validate_password('SHEBA123')
        messages = ' '.join(exc_info.value.messages)
        assert 'common' in messages.lower()
