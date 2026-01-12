"""
Tests for the mentor profiles app.

Tests cover:
- Mentor profile creation
- Duplicate profile prevention (409)
- Profile update
- Authentication required (401)
- Mentoring experience validation
"""

import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import (
    MentorProfile,
    Institution,
    Degree,
    AcademicRank,
    MedicalTrainingStage,
    Specialty,
    ResearchInterest,
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
        email='mentortest@example.com',
        password='TestPass123!',
        first_name='Mentor',
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
        name='PhD',
        name_he='דוקטורט',
        is_active=True,
        sort_order=1,
    )
    academic_rank = AcademicRank.objects.create(
        name='Professor',
        name_he='פרופסור',
        is_active=True,
        sort_order=1,
    )
    medical_training_stage = MedicalTrainingStage.objects.create(
        name='Attending',
        name_he='רופא מומחה',
        is_active=True,
        sort_order=1,
    )
    specialty = Specialty.objects.create(
        name='Cardiology',
        name_he='קרדיולוגיה',
        is_active=True,
        sort_order=1,
    )
    research_interest = ResearchInterest.objects.create(
        name='Clinical Research',
        name_he='מחקר קליני',
        is_active=True,
        sort_order=1,
    )
    return {
        'institution': institution,
        'degree': degree,
        'academic_rank': academic_rank,
        'medical_training_stage': medical_training_stage,
        'specialty': specialty,
        'research_interest': research_interest,
    }


@pytest.mark.django_db
class TestMentorProfileEndpoints:
    """Tests for mentor profile API endpoints."""
    
    def test_unauthenticated_request_returns_401(self, api_client):
        """Test that unauthenticated requests return 401."""
        url = '/api/v1/profiles/mentor/me/'
        
        # Test GET
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Test POST
        response = api_client.post(url, {})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_profile_success(self, authenticated_client, reference_data):
        """Test successful profile creation returns 201."""
        url = '/api/v1/profiles/mentor/me/'
        
        data = {
            'institution': reference_data['institution'].id,
            'degrees': [reference_data['degree'].id],
            'academic_rank': reference_data['academic_rank'].id,
            'medical_training_stage': reference_data['medical_training_stage'].id,
            'specialty': reference_data['specialty'].id,
            'research_interest_field': reference_data['research_interest'].id,
            'workplace': 'Test Medical Center',
            'previous_research_description': 'Led multiple research projects',
            'background_description': 'Experienced researcher',
            'has_mentoring_experience': False,
        }
        
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['institution'] == reference_data['institution'].id
        assert response.data['workplace'] == 'Test Medical Center'
        assert 'id' in response.data
    
    def test_create_second_profile_returns_409(self, authenticated_client, user, reference_data):
        """Test that creating a second profile returns 409 Conflict."""
        url = '/api/v1/profiles/mentor/me/'
        
        # Create first profile
        MentorProfile.objects.create(
            user=user,
            workplace='Test Hospital',
        )
        
        # Attempt to create second profile
        data = {
            'workplace': 'New Hospital',
        }
        
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.data['code'] == 'CONFLICT'
    
    def test_get_profile_success(self, authenticated_client, user, reference_data):
        """Test getting existing profile returns 200."""
        url = '/api/v1/profiles/mentor/me/'
        
        # Create profile
        profile = MentorProfile.objects.create(
            user=user,
            institution=reference_data['institution'],
            academic_rank=reference_data['academic_rank'],
            workplace='Test Medical Center',
            background_description='Experienced mentor',
        )
        profile.degrees.add(reference_data['degree'])
        
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['workplace'] == 'Test Medical Center'
        assert response.data['institution'] == reference_data['institution'].id
        assert response.data['background_description'] == 'Experienced mentor'
    
    def test_get_profile_not_found_returns_404(self, authenticated_client):
        """Test getting non-existent profile returns 404."""
        url = '/api/v1/profiles/mentor/me/'
        
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data['code'] == 'NOT_FOUND'
    
    def test_patch_profile_success(self, authenticated_client, user):
        """Test partial update of profile returns 200."""
        # Create profile
        MentorProfile.objects.create(
            user=user,
            workplace='Old Hospital',
            background_description='Original background',
        )
        
        url = '/api/v1/profiles/mentor/me/'
        
        data = {
            'workplace': 'New Medical Center',
            'background_description': 'Updated background info',
        }
        
        response = authenticated_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['workplace'] == 'New Medical Center'
        assert response.data['background_description'] == 'Updated background info'
    
    def test_patch_profile_not_found_returns_404(self, authenticated_client):
        """Test patching non-existent profile returns 404."""
        url = '/api/v1/profiles/mentor/me/'
        
        response = authenticated_client.patch(url, {'workplace': 'Test'}, format='json')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestMentorProfileValidation:
    """Tests for mentor profile validation rules."""
    
    def test_mentoring_experience_details_required_when_has_experience(self, authenticated_client):
        """Test mentoring_experience_details is required when has_mentoring_experience is True."""
        url = '/api/v1/profiles/mentor/me/'
        
        # Missing details when has experience
        data = {
            'has_mentoring_experience': True,
            'mentoring_experience_details': '',
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'mentoring_experience_details' in response.data['details']
    
    def test_mentoring_experience_details_min_length(self, authenticated_client):
        """Test mentoring_experience_details must have minimum length."""
        url = '/api/v1/profiles/mentor/me/'
        
        data = {
            'has_mentoring_experience': True,
            'mentoring_experience_details': 'Short',  # Too short
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_mentoring_experience_details_valid(self, authenticated_client):
        """Test valid mentoring experience details are accepted."""
        url = '/api/v1/profiles/mentor/me/'
        
        data = {
            'has_mentoring_experience': True,
            'mentoring_experience_details': 'I have mentored several students over the past 5 years.',
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['has_mentoring_experience'] is True
        assert response.data['mentoring_experience_details'] == data['mentoring_experience_details']
    
    def test_profile_without_experience_creates_successfully(self, authenticated_client):
        """Test that profile without mentoring experience can be created."""
        url = '/api/v1/profiles/mentor/me/'
        
        data = {
            'has_mentoring_experience': False,
            'workplace': 'Test Hospital',
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['has_mentoring_experience'] is False


@pytest.mark.django_db
class TestMentorProfileWithManyToMany:
    """Tests for mentor profile M2M degree relationships."""
    
    def test_profile_with_multiple_degrees(self, authenticated_client, reference_data, db):
        """Test creating profile with multiple degrees."""
        url = '/api/v1/profiles/mentor/me/'
        
        # Create additional degree
        degree2 = Degree.objects.create(
            name='MD',
            name_he='רופא',
            is_active=True,
            sort_order=2,
        )
        
        data = {
            'degrees': [reference_data['degree'].id, degree2.id],
            'workplace': 'Test Hospital',
        }
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data['degrees']) == 2
        assert reference_data['degree'].id in response.data['degrees']
        assert degree2.id in response.data['degrees']
    
    def test_patch_degrees(self, authenticated_client, user, reference_data, db):
        """Test updating degrees via PATCH."""
        # Create profile without degrees
        profile = MentorProfile.objects.create(
            user=user,
            workplace='Test Hospital',
        )
        
        url = '/api/v1/profiles/mentor/me/'
        
        # Add degree
        data = {'degrees': [reference_data['degree'].id]}
        response = authenticated_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert reference_data['degree'].id in response.data['degrees']

