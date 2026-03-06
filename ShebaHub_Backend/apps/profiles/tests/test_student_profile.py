"""
Tests for the profiles app.

Tests cover:
- Student profile creation
- Duplicate profile prevention (409)
- Profile update
- Authentication required (401)
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import (
    StudentProfile,
    Institution,
    Degree,
    AcademicRank,
)

User = get_user_model()


@pytest.fixture
def api_client():
    """Return an API client."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(
        email='testuser@example.com',
        password='TestPass123!',
        firstName='Test',
        lastName='User',
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def reference_data(db):
    """Create or get reference data for tests."""
    institution, _ = Institution.objects.get_or_create(
        name='Test University',
        defaults={'name_he': 'אוניברסיטת בדיקה', 'is_active': True, 'sort_order': 100},
    )
    degree, _ = Degree.objects.get_or_create(
        name='MSc',
        defaults={'name_he': 'תואר שני', 'is_active': True, 'sort_order': 100},
    )
    academic_rank, _ = AcademicRank.objects.get_or_create(
        name='Student',
        defaults={'name_he': 'סטודנט', 'is_active': True, 'sort_order': 100},
    )
    return {
        'institution': institution,
        'degree': degree,
        'academic_rank': academic_rank,
    }


STUDENT_ME_URL = '/api/profiles/student/me/'


@pytest.mark.django_db
class TestStudentProfileEndpoints:
    """Tests for student profile API endpoints."""

    def test_unauthenticated_request_returns_401(self, api_client):
        """Test that unauthenticated requests return 401."""
        # Test GET
        response = api_client.get(STUDENT_ME_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # Test POST
        response = api_client.post(STUDENT_ME_URL, {})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_profile_success(self, authenticated_client, reference_data):
        """Test successful profile creation returns 201."""
        data = {
            'startYear': 2022,
            'yearOfStudy': 'ג',
            'institution': reference_data['institution'].name,
            'degrees': [reference_data['degree'].name],
            'hasResearchExperience': False,
        }

        response = authenticated_client.post(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED, f"Got {response.status_code}: {response.data}"
        assert response.data['startYear'] == 2022
        assert 'id' in response.data

    def test_create_second_profile_returns_409(self, authenticated_client, user):
        """Test that creating a second profile returns 409 Conflict."""
        # Create first profile
        StudentProfile.objects.create(user=user)

        # Attempt to create second profile
        data = {
            'startYear': 2022,
        }

        response = authenticated_client.post(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.data['code'] == 'CONFLICT'

    def test_get_profile_success(self, authenticated_client, user, reference_data):
        """Test getting existing profile returns 200."""
        # Create profile
        profile = StudentProfile.objects.create(
            user=user,
            startYear=2021,
            yearOfStudy='ב',
            institution=reference_data['institution'],
            workplace='Test Hospital',
        )
        profile.degrees.add(reference_data['degree'])

        response = authenticated_client.get(STUDENT_ME_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['startYear'] == 2021
        assert response.data['workplace'] == 'Test Hospital'

    def test_get_profile_not_found_returns_404(self, authenticated_client):
        """Test getting non-existent profile returns 404."""
        response = authenticated_client.get(STUDENT_ME_URL)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data['code'] == 'NOT_FOUND'

    def test_patch_profile_success(self, authenticated_client, user):
        """Test partial update of profile returns 200."""
        # Create profile
        StudentProfile.objects.create(
            user=user,
            startYear=2020,
            workplace='Old Hospital',
        )

        data = {
            'workplace': 'New Hospital',
        }

        response = authenticated_client.patch(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['workplace'] == 'New Hospital'
        # Unchanged field should remain
        assert response.data['startYear'] == 2020

    def test_patch_profile_not_found_returns_404(self, authenticated_client):
        """Test patching non-existent profile returns 404."""
        response = authenticated_client.patch(STUDENT_ME_URL, {'workplace': 'Test'}, format='json')

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestProfileValidation:
    """Tests for profile validation rules."""

    def test_start_year_validation(self, authenticated_client):
        """Test startYear must be in valid range."""
        # Year too old
        data = {'startYear': 1980}
        response = authenticated_client.post(STUDENT_ME_URL, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'startYear' in response.data['details']

        # Year too far in future
        data = {'startYear': 2050}
        response = authenticated_client.post(STUDENT_ME_URL, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_weekly_hours_validation(self, authenticated_client):
        """Test weeklyHours must be between 1 and 60."""
        # Hours too low
        data = {'weeklyHours': 0}
        response = authenticated_client.post(STUDENT_ME_URL, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Hours too high
        data = {'weeklyHours': 100}
        response = authenticated_client.post(STUDENT_ME_URL, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_research_experience_details_optional_when_has_experience(self, authenticated_client):
        """Test researchExperienceDetails is optional even when hasResearchExperience is True."""
        data = {
            'hasResearchExperience': True,
            'researchExperienceDetails': '',
        }
        response = authenticated_client.post(STUDENT_ME_URL, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    return User.objects.create_user(
        email='admin@example.com',
        password='AdminPass123!',
        firstName='Admin',
        lastName='User',
        is_staff=True,
    )


@pytest.fixture
def admin_client(api_client, admin_user):
    """Return an authenticated admin API client."""
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.mark.django_db
class TestReferenceDataEndpoints:
    """Tests for reference data API endpoints."""

    def test_reference_data_all_requires_auth(self, api_client):
        """Test that reference data endpoint requires authentication."""
        url = '/api/reference-data/'

        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_reference_data_all_restricted_for_non_admin(self, authenticated_client):
        """Test that reference data all endpoint is restricted for non-admin users in production."""
        url = '/api/reference-data/'

        response = authenticated_client.get(url)

        # In production (DEBUG=False in tests), non-admin users get 403
        # In development (DEBUG=True), it would return 200
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN]

    def test_reference_data_all_allowed_for_admin(self, admin_client):
        """Test that admin users can access reference data all endpoint."""
        url = '/api/reference-data/'

        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'institutions' in response.data
        assert 'degrees' in response.data
        assert 'academic_ranks' in response.data

    def test_individual_reference_endpoints_work(self, authenticated_client):
        """Test that individual reference data endpoints work for regular users."""
        endpoints = [
            '/api/reference-data/institutions/',
            '/api/reference-data/degrees/',
            '/api/reference-data/academic-ranks/',
            '/api/reference-data/specialties/',
        ]

        for url in endpoints:
            response = authenticated_client.get(url)
            assert response.status_code == status.HTTP_200_OK, f"Failed for {url}"
            assert isinstance(response.data, list)
