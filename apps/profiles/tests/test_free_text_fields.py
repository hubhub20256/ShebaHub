"""
Tests for free-text fields on profiles.

Tests cover:
- StudentProfile.workType as free-text CharField (max_length=255)
- MentorProfile.researchInterests as free-text CharField (max_length=500)
- Hebrew and English values
- Partial update preserves free-text values
- Max-length validation
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import (
    StudentProfile,
    MentorProfile,
    SpecialtyGroup,
    Specialty,
)

User = get_user_model()

STUDENT_ME_URL = '/api/profiles/student/me/'
MENTOR_ME_URL = '/api/profiles/mentor/me/'


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def student_user(db):
    return User.objects.create_user(
        email='freetext-student@example.com',
        password='TestPass123!',
        firstName='Free',
        lastName='Student',
        email_verified=True,
    )


@pytest.fixture
def mentor_user(db):
    return User.objects.create_user(
        email='freetext-mentor@example.com',
        password='TestPass123!',
        firstName='Free',
        lastName='Mentor',
        email_verified=True,
    )


@pytest.fixture
def auth_student(api_client, student_user):
    api_client.force_authenticate(user=student_user)
    return api_client


@pytest.fixture
def auth_mentor(api_client, mentor_user):
    api_client.force_authenticate(user=mentor_user)
    return api_client


@pytest.fixture
def specialty_group(db):
    """Create a specialty group with one specialty for mentor creation."""
    group = SpecialtyGroup.objects.create(
        name='FreeTextGroup', name_he='קבוצה חופשית', is_active=True,
    )
    Specialty.objects.create(
        name='GeneralMedicine', name_he='רפואה כללית',
        group=group, is_active=True,
    )
    return group


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestFreeTextFields:
    """Tests for free-text workType (student) and researchInterests (mentor)."""

    def test_student_create_with_free_text_worktype(self, auth_student):
        """workType should accept Hebrew free text and store it as-is."""
        data = {
            'workType': 'מחקר קליני',
        }

        response = auth_student.post(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED, response.data
        profile = StudentProfile.objects.get(
            user__email='freetext-student@example.com',
        )
        assert profile.workType == 'מחקר קליני'
        # Also verify the value comes back in the response
        assert response.data['workType'] == 'מחקר קליני'

    def test_student_create_worktype_english(self, auth_student):
        """workType should accept English free text and store it as-is."""
        data = {
            'workType': 'Full-time research',
        }

        response = auth_student.post(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED, response.data
        profile = StudentProfile.objects.get(
            user__email='freetext-student@example.com',
        )
        assert profile.workType == 'Full-time research'

    def test_mentor_create_with_free_text_research_interests(
        self, auth_mentor, specialty_group,
    ):
        """researchInterests should accept free text and store it as-is."""
        data = {
            'specialtyGroup': specialty_group.name,
            'hasMentoringExperience': False,
            'researchInterests': 'Cardiovascular biology',
        }

        response = auth_mentor.post(MENTOR_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED, response.data
        profile = MentorProfile.objects.get(
            user__email='freetext-mentor@example.com',
        )
        assert profile.researchInterests == 'Cardiovascular biology'
        assert response.data['researchInterests'] == 'Cardiovascular biology'

    def test_update_preserves_free_text_values(self, auth_student):
        """PATCH that does not include workType should not erase it."""
        # Create with workType set
        create_data = {
            'workType': 'מחקר קליני',
            'yearOfStudy': 'ב',
        }
        resp = auth_student.post(STUDENT_ME_URL, create_data, format='json')
        assert resp.status_code == status.HTTP_201_CREATED, resp.data

        # Patch a different field only
        patch_data = {
            'yearOfStudy': 'ג',
        }
        resp = auth_student.patch(STUDENT_ME_URL, patch_data, format='json')

        assert resp.status_code == status.HTTP_200_OK, resp.data
        profile = StudentProfile.objects.get(
            user__email='freetext-student@example.com',
        )
        # workType must still be the original value
        assert profile.workType == 'מחקר קליני'
        assert resp.data['workType'] == 'מחקר קליני'

    def test_worktype_max_length_validation(self, auth_student):
        """workType longer than 255 characters should be rejected."""
        data = {
            'workType': 'x' * 256,
        }

        response = auth_student.post(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST, response.data
