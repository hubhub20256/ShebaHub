"""
Tests for StudentProfile.yearOfStudy CharField validation.

Tests cover:
- Accepting long Hebrew text within the 50-char limit
- Accepting short Hebrew letters
- Rejecting values exceeding max_length of 50
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import StudentProfile

User = get_user_model()

STUDENT_ME_URL = '/api/profiles/student/me/'


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def student_user(db):
    return User.objects.create_user(
        email='year-student@example.com',
        password='TestPass123!',
        firstName='Year',
        lastName='Student',
        email_verified=True,
    )


@pytest.fixture
def auth_student(api_client, student_user):
    api_client.force_authenticate(user=student_user)
    return api_client


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestYearOfStudy:
    """Tests for the yearOfStudy CharField (max_length=50)."""

    def test_accepts_long_text(self, auth_student):
        """yearOfStudy should accept descriptive Hebrew text up to 50 chars."""
        long_value = "שנה ד' לתואר שני"
        assert len(long_value) <= 50

        data = {
            'yearOfStudy': long_value,
        }

        response = auth_student.post(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED, response.data
        profile = StudentProfile.objects.get(
            user__email='year-student@example.com',
        )
        assert profile.yearOfStudy == long_value
        assert response.data['yearOfStudy'] == long_value

    def test_accepts_hebrew_letters(self, auth_student):
        """yearOfStudy should accept a single Hebrew letter like 'ד'."""
        data = {
            'yearOfStudy': 'ד',
        }

        response = auth_student.post(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED, response.data
        profile = StudentProfile.objects.get(
            user__email='year-student@example.com',
        )
        assert profile.yearOfStudy == 'ד'

    def test_rejects_over_50_chars(self, auth_student):
        """yearOfStudy longer than 50 characters should be rejected."""
        too_long = 'א' * 51
        assert len(too_long) == 51

        data = {
            'yearOfStudy': too_long,
        }

        response = auth_student.post(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST, response.data
