"""
Functional tests for public directory list/detail endpoints.

Covers:
- public_student_list
- public_mentor_list
- public_mentor_detail
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import (
    StudentProfile,
    MentorProfile,
    Institution,
    SpecialtyGroup,
    Specialty,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email='regular@example.com',
        password='TestPass123!',
        firstName='Regular',
        lastName='User',
    )


@pytest.fixture
def authenticated_client(api_client, regular_user):
    api_client.force_authenticate(user=regular_user)
    return api_client


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name='Sheba Medical Center', name_he='מרכז רפואי שיבא', is_active=True,
    )


@pytest.fixture
def specialty_group(db):
    return SpecialtyGroup.objects.create(
        name='Internal Medicine', name_he='רפואה פנימית', is_active=True,
    )


@pytest.fixture
def specialty(db, specialty_group):
    return Specialty.objects.create(
        name='Cardiology', name_he='קרדיולוגיה',
        group=specialty_group, is_active=True,
    )


@pytest.fixture
def student_profile(db, institution):
    user = User.objects.create_user(
        email='student1@example.com',
        password='TestPass123!',
        firstName='Student',
        lastName='One',
    )
    return StudentProfile.objects.create(
        user=user, institution=institution,
    )


@pytest.fixture
def mentor_profile(db, institution, specialty):
    user = User.objects.create_user(
        email='mentor1@example.com',
        password='TestPass123!',
        firstName='Mentor',
        lastName='One',
    )
    profile = MentorProfile.objects.create(
        user=user, institution=institution, specialty=specialty,
    )
    return profile


# ---------------------------------------------------------------------------
# Public Student List
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPublicStudentList:
    URL = '/api/profiles/students/'

    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get(self.URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_returns_200_with_profiles(self, authenticated_client, student_profile):
        response = authenticated_client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_response_shape(self, authenticated_client, student_profile):
        response = authenticated_client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        item = response.data[0]
        assert 'id' in item
        assert 'name' in item
        assert 'institution' in item

    def test_empty_list(self, authenticated_client):
        """No profiles → empty list."""
        response = authenticated_client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_staff_excluded(self, authenticated_client, institution):
        """Staff users' profiles are excluded from public list."""
        staff = User.objects.create_user(
            email='staff@example.com',
            password='TestPass123!',
            firstName='Staff',
            lastName='User',
            is_staff=True,
        )
        StudentProfile.objects.create(user=staff, institution=institution)
        response = authenticated_client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        emails = [item.get('name', '') for item in response.data]
        # Staff user's profile should not appear
        assert not any('Staff' in name for name in emails)


# ---------------------------------------------------------------------------
# Public Mentor List
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPublicMentorList:
    URL = '/api/profiles/mentors/'

    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get(self.URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_returns_200_with_profiles(self, authenticated_client, mentor_profile):
        response = authenticated_client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_response_shape(self, authenticated_client, mentor_profile):
        response = authenticated_client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        item = response.data[0]
        assert 'id' in item
        assert 'name' in item
        assert 'specialty' in item


# ---------------------------------------------------------------------------
# Public Mentor Detail
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPublicMentorDetail:

    def test_unauthenticated_returns_401(self, api_client, mentor_profile):
        url = f'/api/profiles/mentors/{mentor_profile.id}/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_returns_200_for_existing_mentor(
        self, authenticated_client, mentor_profile,
    ):
        url = f'/api/profiles/mentors/{mentor_profile.id}/'
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == str(mentor_profile.id)

    def test_returns_404_for_nonexistent_mentor(self, authenticated_client):
        import uuid
        url = f'/api/profiles/mentors/{uuid.uuid4()}/'
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
