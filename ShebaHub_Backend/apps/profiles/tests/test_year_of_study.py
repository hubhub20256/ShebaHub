"""
Tests for StudentProfile.yearOfStudy CharField validation.

Tests cover:
- Accepting Hebrew year values within the 10-char limit
- Accepting short Hebrew letters
- Rejecting values exceeding max_length of 10
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
    """Tests for the yearOfStudy CharField (max_length=10)."""

    def test_accepts_year_value(self, auth_student):
        """yearOfStudy should accept typical pill values like ד'."""
        value = "ד'"
        assert len(value) <= 10

        data = {
            'yearOfStudy': value,
        }

        response = auth_student.post(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED, response.data
        profile = StudentProfile.objects.get(
            user__email='year-student@example.com',
        )
        assert profile.yearOfStudy == value
        assert response.data['yearOfStudy'] == value

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

    def test_rejects_over_10_chars(self, auth_student):
        """yearOfStudy longer than 10 characters should be rejected."""
        too_long = 'א' * 11
        assert len(too_long) == 11

        data = {
            'yearOfStudy': too_long,
        }

        response = auth_student.post(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST, response.data
