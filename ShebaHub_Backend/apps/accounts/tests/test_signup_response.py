"""
Tests for signup response format.

Bug 1 regression (backend side): all signup responses must be valid JSON
with consistent Content-Type: application/json so the frontend can always
call response.json() without crashing.
"""

from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


# Disable throttling so repeated POSTs in one test run don't get 429
@override_settings(
    REST_FRAMEWORK={
        **__import__('config.settings', fromlist=['REST_FRAMEWORK']).REST_FRAMEWORK,
        'DEFAULT_THROTTLE_RATES': {
            'anon': '10000/hour',
            'user': '10000/hour',
            'login': '1000/minute',
            'register': '1000/minute',
            'password_reset': '1000/minute',
            'upload': '1000/minute',
            'contact': '1000/minute',
            'research_application': '1000/minute',
            'chat_message': '1000/minute',
        },
    }
)
class TestSignupResponseFormat(APITestCase):
    """Every signup response must be parseable JSON."""

    def setUp(self):
        cache.clear()  # Clear DRF throttle cache from other test classes
        self.url = reverse('signup')
        self.valid_payload = {
            'email': 'newuser@example.com',
            'password': 'StrongPassword123!',
            'confirmPassword': 'StrongPassword123!',
            'firstName': 'Test',
            'lastName': 'User',
            'gender': 'man',
        }

    def test_success_response_is_json_with_tokens_and_user(self):
        """201 response has Content-Type application/json with tokens + user."""
        response = self.client.post(self.url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response['Content-Type'].split(';')[0], 'application/json',
        )
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertIn('user', response.data)

    def test_duplicate_email_returns_json_409(self):
        """409 Conflict for duplicate email is valid JSON with code=CONFLICT."""
        User.objects.create_user(
            email=self.valid_payload['email'],
            password='OtherPass123!',
            firstName='Existing',
            lastName='User',
        )
        response = self.client.post(self.url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            response['Content-Type'].split(';')[0], 'application/json',
        )
        self.assertEqual(response.data['code'], 'CONFLICT')

    def test_validation_error_returns_json_400(self):
        """400 for validation errors has parseable JSON body with field keys."""
        payload = self.valid_payload.copy()
        payload['email'] = 'validation-test@example.com'
        payload['password'] = '123'  # too short/weak
        payload['confirmPassword'] = '123'
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response['Content-Type'].split(';')[0], 'application/json',
        )
        self.assertIn('password', response.data)

    def test_missing_fields_returns_json_400(self):
        """400 for missing fields has parseable JSON body."""
        payload = {'email': 'missing-fields@example.com'}
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response['Content-Type'].split(';')[0], 'application/json',
        )
        # Should contain field-level errors
        self.assertTrue(len(response.data) > 0)

    def test_password_mismatch_returns_json_400(self):
        """400 when password and confirmPassword do not match."""
        payload = self.valid_payload.copy()
        payload['email'] = 'mismatch-test@example.com'
        payload['confirmPassword'] = 'DifferentPassword123!'
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response['Content-Type'].split(';')[0], 'application/json',
        )

    def test_user_object_in_success_has_profile_flags(self):
        """Success response user object contains has_student/mentor_profile flags."""
        payload = self.valid_payload.copy()
        payload['email'] = 'another@example.com'
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user_data = response.data['user']
        self.assertIn('has_student_profile', user_data)
        self.assertIn('has_mentor_profile', user_data)
        self.assertFalse(user_data['has_student_profile'])
        self.assertFalse(user_data['has_mentor_profile'])
