"""
Tests for student_profile_me compensationPreference JSONField handling.

Bug 4 regression: GET /api/profiles/student/me/ returned 500 when
compensationPreference was serialized (JSONField round-trip issues).
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import StudentProfile, Institution

User = get_user_model()

STUDENT_ME_URL = '/api/profiles/student/me/'


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='student@example.com',
        password='TestPass123!',
        firstName='Test',
        lastName='User',
    )


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name='Test University', name_he='אוניברסיטת בדיקה', is_active=True,
    )


# ---------------------------------------------------------------------------
# Bug 4 Regression – GET with various compensationPreference values
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestStudentMeCompensationPreferenceRegression:

    def test_get_profile_with_empty_compensation(
        self, authenticated_client, user, institution,
    ):
        """Bug 4: GET returns 200 when compensationPreference is []."""
        StudentProfile.objects.create(
            user=user, institution=institution, compensationPreference=[],
        )
        response = authenticated_client.get(STUDENT_ME_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['compensationPreference'] == []

    def test_get_profile_with_populated_compensation(
        self, authenticated_client, user, institution,
    ):
        """Bug 4: GET returns 200 when compensationPreference has items."""
        StudentProfile.objects.create(
            user=user, institution=institution,
            compensationPreference=["מלגה", "שכר"],
        )
        response = authenticated_client.get(STUDENT_ME_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['compensationPreference'] == ["מלגה", "שכר"]

    def test_get_profile_with_single_compensation(
        self, authenticated_client, user, institution,
    ):
        StudentProfile.objects.create(
            user=user, institution=institution,
            compensationPreference=["מלגה"],
        )
        response = authenticated_client.get(STUDENT_ME_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['compensationPreference'] == ["מלגה"]


# ---------------------------------------------------------------------------
# Round-trip: POST / PATCH / GET
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestStudentMeCompensationPreferenceRoundTrip:

    def test_create_profile_with_compensation_preference(
        self, authenticated_client, institution,
    ):
        """POST saves compensationPreference and returns it."""
        data = {
            'institution': institution.name,
            'compensationPreference': ["מלגה", "שכר"],
            'hasResearchExperience': False,
        }
        response = authenticated_client.post(STUDENT_ME_URL, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['compensationPreference'] == ["מלגה", "שכר"]

    def test_create_profile_without_compensation_preference(
        self, authenticated_client, institution,
    ):
        """POST without compensationPreference defaults to []."""
        data = {
            'institution': institution.name,
            'hasResearchExperience': False,
        }
        response = authenticated_client.post(STUDENT_ME_URL, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['compensationPreference'] == []

    def test_patch_compensation_preference(
        self, authenticated_client, user, institution,
    ):
        """PATCH updates the list."""
        StudentProfile.objects.create(
            user=user, institution=institution, compensationPreference=["מלגה"],
        )
        data = {'compensationPreference': ["מלגה", "שכר"]}
        response = authenticated_client.patch(STUDENT_ME_URL, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['compensationPreference'] == ["מלגה", "שכר"]

    def test_patch_compensation_preference_to_empty(
        self, authenticated_client, user, institution,
    ):
        """PATCH clears the list to []."""
        StudentProfile.objects.create(
            user=user, institution=institution,
            compensationPreference=["מלגה", "שכר"],
        )
        data = {'compensationPreference': []}
        response = authenticated_client.patch(STUDENT_ME_URL, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['compensationPreference'] == []

    def test_get_returns_404_when_no_profile(self, authenticated_client):
        """GET returns 404 when no profile exists."""
        response = authenticated_client.get(STUDENT_ME_URL)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data['code'] == 'NOT_FOUND'
