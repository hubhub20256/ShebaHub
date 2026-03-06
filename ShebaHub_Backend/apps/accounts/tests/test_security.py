from unittest.mock import patch

from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

# Patch all throttles to always allow requests
_always_allow = patch(
    'rest_framework.views.APIView.check_throttles',
    return_value=None,
)


class LoginLockoutTestCase(APITestCase):
    """Tests for account lockout after failed login attempts."""

    def setUp(self):
        _always_allow.start()
        self.addCleanup(_always_allow.stop)
        self.login_url = reverse('login')
        self.email = 'lockout@example.com'
        self.password = 'TestPassword123!'
        self.user = User.objects.create_user(
            email=self.email,
            password=self.password,
            firstName='Lock',
            lastName='Out',
        )

    def _fail_login(self, n=1):
        for _ in range(n):
            self.client.post(
                self.login_url,
                {'email': self.email, 'password': 'WrongPassword!'},
                format='json',
            )

    def test_lockout_after_5_failed_attempts(self):
        """5 wrong passwords -> 6th returns 403 with retry_after."""
        self._fail_login(5)
        response = self.client.post(
            self.login_url,
            {'email': self.email, 'password': 'WrongPassword!'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('retry_after', response.data)

    def test_lockout_resets_on_success(self):
        """4 failures, then correct login -> success, counter restarted."""
        self._fail_login(4)
        # Correct login should succeed
        response = self.client.post(
            self.login_url,
            {'email': self.email, 'password': self.password},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Counter should be reset; one more failure should not lock
        self._fail_login(1)
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 1)

    def test_locked_account_rejects_even_correct_password(self):
        """Lock account, try correct password -> 403."""
        self._fail_login(5)
        # Account is now locked; correct password should still be rejected
        response = self.client.post(
            self.login_url,
            {'email': self.email, 'password': self.password},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('retry_after', response.data)


class LogoutBlacklistTestCase(APITestCase):
    """Tests for refresh-token blacklisting on logout."""

    def setUp(self):
        _always_allow.start()
        self.addCleanup(_always_allow.stop)
        self.login_url = reverse('login')
        self.logout_url = reverse('logout')
        self.refresh_url = reverse('token_refresh')
        self.email = 'logout@example.com'
        self.password = 'TestPassword123!'
        self.user = User.objects.create_user(
            email=self.email,
            password=self.password,
            firstName='Log',
            lastName='Out',
        )

    def _login(self):
        response = self.client.post(
            self.login_url,
            {'email': self.email, 'password': self.password},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Login failed: {response.data}")
        tokens = response.data['tokens']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        return tokens

    def test_logout_blacklists_refresh_token(self):
        """Login, logout with refresh, then try to refresh -> 401."""
        tokens = self._login()
        # Logout with refresh token
        response = self.client.post(
            self.logout_url,
            {'refresh': tokens['refresh']},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Try to use the blacklisted refresh token
        self.client.credentials()  # clear auth
        response = self.client.post(
            self.refresh_url,
            {'refresh': tokens['refresh']},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_refresh_still_succeeds(self):
        """POST /api/auth/logout/ without body -> 200."""
        self._login()
        response = self.client.post(self.logout_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
