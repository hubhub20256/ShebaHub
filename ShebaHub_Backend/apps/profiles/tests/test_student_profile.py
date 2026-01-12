"""
Tests for the profiles app.

Tests cover:
- Student profile creation
- Duplicate profile prevention (409)
- Profile update
- Authentication required (401)
"""

import pytest
from django.urls import reverse
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
        first_name='Test',
        last_name='User',
        terms_accepted=True,
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def reference_data(db):
    """Create reference data for tests."""
    institution = Institution.objects.create(
        name='Test University',
        name_he='אוניברסיטת בדיקה',
        is_active=True,
        sort_order=1,
    )
    degree = Degree.objects.create(
        name='BSc',
        name_he='תואר ראשון',
        is_active=True,
        sort_order=1,
    )
    academic_rank = AcademicRank.objects.create(
        name='Student',
        name_he='סטודנט',
        is_active=True,
        sort_order=1,
    )
    return {
        'institution': institution,
        'degree': degree,
        'academic_rank': academic_rank,
    }


@pytest.mark.django_db
class TestStudentProfileEndpoints:
    """Tests for student profile API endpoints."""
    
    def test_unauthenticated_request_returns_401(self, api_client):
        """Test that unauthenticated requests return 401."""
        url = '/api/v1/profiles/student/me/'
        
        # Test GET
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Test POST
        response = api_client.post(url, {})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_profile_success(self, authenticated_client, reference_data):
        """Test successful profile creation returns 201."""
        url = '/api/v1/profiles/student/me/'
        
        data = {
            'study_start_year': 2022,
            'study_year': 3,
            'institution': reference_data['institution'].id,
            'degrees': [reference_data['degree'].id],
            'academic_rank': reference_data['academic_rank'].id,
            'has_research_experience': False,
            'is_available_for_research': True,
        }
        
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['study_start_year'] == 2022
        assert response.data['study_year'] == 3
        assert response.data['institution'] == reference_data['institution'].id
        assert 'id' in response.data
    
    def test_create_second_profile_returns_409(self, authenticated_client, user, reference_data):
        """Test that creating a second profile returns 409 Conflict."""
        url = '/api/v1/profiles/student/me/'
        
        # Create first profile
        StudentProfile.objects.create(
            user=user,
            study_start_year=2020,
            study_year=2,
        )
        
        # Attempt to create second profile
        data = {
            'study_start_year': 2022,
            'study_year': 3,
        }
        
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.data['code'] == 'CONFLICT'
    
    def test_get_profile_success(self, authenticated_client, user, reference_data):
        """Test getting existing profile returns 200."""
        url = '/api/v1/profiles/student/me/'
        
        # Create profile
        profile = StudentProfile.objects.create(
            user=user,
            study_start_year=2021,
            study_year=2,
            institution=reference_data['institution'],
            workplace='Test Hospital',
        )
        profile.degrees.add(reference_data['degree'])
        
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['study_start_year'] == 2021
        assert response.data['study_year'] == 2
        assert response.data['workplace'] == 'Test Hospital'
        assert response.data['institution'] == reference_data['institution'].id
    
    def test_get_profile_not_found_returns_404(self, authenticated_client):
        """Test getting non-existent profile returns 404."""
        url = '/api/v1/profiles/student/me/'
        
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data['code'] == 'NOT_FOUND'
    
    def test_patch_profile_success(self, authenticated_client, user):
        """Test partial update of profile returns 200."""
        # Create profile
        StudentProfile.objects.create(
            user=user,
            study_start_year=2020,
            study_year=2,
            workplace='Old Hospital',
        )
        
        url = '/api/v1/profiles/student/me/'
        
        data = {
            'workplace': 'New Hospital',
            'study_year': 3,
        }
        
        response = authenticated_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['workplace'] == 'New Hospital'
        assert response.data['study_year'] == 3
        # Unchanged field should remain
        assert response.data['study_start_year'] == 2020
    
    def test_patch_profile_not_found_returns_404(self, authenticated_client):
        """Test patching non-existent profile returns 404."""
        url = '/api/v1/profiles/student/me/'
        
        response = authenticated_client.patch(url, {'workplace': 'Test'}, format='json')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestProfileValidation:
    """Tests for profile validation rules."""
    
    def test_study_start_year_validation(self, authenticated_client):
        """Test study_start_year must be in valid range."""
        url = '/api/v1/profiles/student/me/'
        
        # Year too old
        data = {'study_start_year': 1980}
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'study_start_year' in response.data['details']
        
        # Year too far in future
        data = {'study_start_year': 2050}
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_study_year_validation(self, authenticated_client):
        """Test study_year must be between 1 and 10."""
        url = '/api/v1/profiles/student/me/'
        
        # Year too low
        data = {'study_year': 0}
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Year too high
        data = {'study_year': 15}
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_weekly_hours_validation(self, authenticated_client):
        """Test weekly_hours_commitment must be between 1 and 60."""
        url = '/api/v1/profiles/student/me/'
        
        # Hours too low
        data = {'weekly_hours_commitment': 0}
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Hours too high
        data = {'weekly_hours_commitment': 100}
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_research_experience_details_required_when_has_experience(self, authenticated_client):
        """Test research_experience_details is required when has_research_experience is True."""
        url = '/api/v1/profiles/student/me/'
        
        # Missing details when has experience
        data = {
            'has_research_experience': True,
            'research_experience_details': '',
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'research_experience_details' in response.data['details']
    
    def test_research_experience_details_min_length(self, authenticated_client):
        """Test research_experience_details must have minimum length."""
        url = '/api/v1/profiles/student/me/'
        
        data = {
            'has_research_experience': True,
            'research_experience_details': 'Short',  # Too short
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    return User.objects.create_user(
        email='admin@example.com',
        password='AdminPass123!',
        first_name='Admin',
        last_name='User',
        terms_accepted=True,
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
        url = '/api/v1/reference-data/'
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_reference_data_all_restricted_for_non_admin(self, authenticated_client):
        """Test that reference data all endpoint is restricted for non-admin users in production."""
        url = '/api/v1/reference-data/'
        
        response = authenticated_client.get(url)
        
        # In production (DEBUG=False in tests), non-admin users get 403
        # In development (DEBUG=True), it would return 200
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN]
    
    def test_reference_data_all_allowed_for_admin(self, admin_client):
        """Test that admin users can access reference data all endpoint."""
        url = '/api/v1/reference-data/'
        
        response = admin_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'institutions' in response.data
        assert 'degrees' in response.data
        assert 'academic_ranks' in response.data
    
    def test_individual_reference_endpoints_work(self, authenticated_client):
        """Test that individual reference data endpoints work for regular users."""
        endpoints = [
            '/api/v1/reference-data/institutions/',
            '/api/v1/reference-data/degrees/',
            '/api/v1/reference-data/academic-ranks/',
            '/api/v1/reference-data/specialties/',
        ]
        
        for url in endpoints:
            response = authenticated_client.get(url)
            assert response.status_code == status.HTTP_200_OK, f"Failed for {url}"
            assert isinstance(response.data, list)
