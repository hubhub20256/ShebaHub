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
    SpecialtyGroup,
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
        firstName='Mentor',
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
        name='PhD',
        defaults={'name_he': 'דוקטורט', 'is_active': True, 'sort_order': 100},
    )
    academic_rank, _ = AcademicRank.objects.get_or_create(
        name='Professor',
        defaults={'name_he': 'פרופסור', 'is_active': True, 'sort_order': 100},
    )
    specialty_group, _ = SpecialtyGroup.objects.get_or_create(
        name='Internal Medicine',
        defaults={'name_he': 'רפואה פנימית', 'is_active': True, 'sort_order': 100},
    )
    specialty, _ = Specialty.objects.get_or_create(
        name='Cardiology',
        defaults={
            'name_he': 'קרדיולוגיה',
            'is_active': True,
            'sort_order': 100,
            'group': specialty_group,
        },
    )
    research_interest, _ = ResearchInterest.objects.get_or_create(
        name='Clinical Research',
        defaults={'name_he': 'מחקר קליני', 'is_active': True, 'sort_order': 100},
    )
    return {
        'institution': institution,
        'degree': degree,
        'academic_rank': academic_rank,
        'specialty_group': specialty_group,
        'specialty': specialty,
        'research_interest': research_interest,
    }


MENTOR_ME_URL = '/api/profiles/mentor/me/'


@pytest.mark.django_db
class TestMentorProfileEndpoints:
    """Tests for mentor profile API endpoints."""

    def test_unauthenticated_request_returns_401(self, api_client):
        """Test that unauthenticated requests return 401."""
        # Test GET
        response = api_client.get(MENTOR_ME_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # Test POST
        response = api_client.post(MENTOR_ME_URL, {})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_profile_success(self, authenticated_client, reference_data):
        """Test successful profile creation returns 201."""
        data = {
            'institution': reference_data['institution'].name,
            'degrees': [reference_data['degree'].name],
            'specialtyGroup': reference_data['specialty_group'].name,
            'specialty': reference_data['specialty'].name,
            'workplace': 'Test Medical Center',
            'previousResearchDescription': 'Led multiple research projects',
            'personalAcademicDescription': 'Experienced researcher',
            'hasMentoringExperience': False,
        }

        response = authenticated_client.post(MENTOR_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['workplace'] == 'Test Medical Center'
        assert 'id' in response.data

    def test_create_second_profile_returns_409(self, authenticated_client, user):
        """Test that creating a second profile returns 409 Conflict."""
        # Create first profile
        MentorProfile.objects.create(
            user=user,
            workplace='Test Hospital',
        )

        # Attempt to create second profile
        data = {
            'workplace': 'New Hospital',
        }

        response = authenticated_client.post(MENTOR_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.data['code'] == 'CONFLICT'

    def test_get_profile_success(self, authenticated_client, user, reference_data):
        """Test getting existing profile returns 200."""
        # Create profile
        profile = MentorProfile.objects.create(
            user=user,
            institution=reference_data['institution'],
            academicRank=reference_data['academic_rank'],
            workplace='Test Medical Center',
            personalAcademicDescription='Experienced mentor',
        )
        profile.degrees.add(reference_data['degree'])

        response = authenticated_client.get(MENTOR_ME_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['workplace'] == 'Test Medical Center'
        assert response.data['personalAcademicDescription'] == 'Experienced mentor'

    def test_get_profile_not_found_returns_404(self, authenticated_client):
        """Test getting non-existent profile returns 404."""
        response = authenticated_client.get(MENTOR_ME_URL)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data['code'] == 'NOT_FOUND'

    def test_patch_profile_success(self, authenticated_client, user):
        """Test partial update of profile returns 200."""
        # Create profile
        MentorProfile.objects.create(
            user=user,
            workplace='Old Hospital',
            personalAcademicDescription='Original background',
        )

        data = {
            'workplace': 'New Medical Center',
            'personalAcademicDescription': 'Updated background info',
        }

        response = authenticated_client.patch(MENTOR_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['workplace'] == 'New Medical Center'
        assert response.data['personalAcademicDescription'] == 'Updated background info'

    def test_patch_profile_not_found_returns_404(self, authenticated_client):
        """Test patching non-existent profile returns 404."""
        response = authenticated_client.patch(MENTOR_ME_URL, {'workplace': 'Test'}, format='json')

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestMentorProfileValidation:
    """Tests for mentor profile validation rules."""

    def test_create_requires_hasMentoringExperience(self, authenticated_client, reference_data):
        """Test hasMentoringExperience is required on creation."""
        data = {
            'institution': reference_data['institution'].name,
            'specialtyGroup': reference_data['specialty_group'].name,
            # Missing hasMentoringExperience (required by MentorProfileCreateSerializer)
        }
        response = authenticated_client.post(MENTOR_ME_URL, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'hasMentoringExperience' in response.data['details']

    def test_profile_with_experience_creates_successfully(self, authenticated_client, reference_data):
        """Test that profile with mentoring experience can be created."""
        data = {
            'hasMentoringExperience': True,
            'mentoringExperienceDetails': 'I have mentored several students over the past 5 years.',
            'institution': reference_data['institution'].name,
            'specialtyGroup': reference_data['specialty_group'].name,
            'workplace': 'Test Hospital',
        }
        response = authenticated_client.post(MENTOR_ME_URL, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['hasMentoringExperience'] is True
        assert response.data['mentoringExperienceDetails'] == data['mentoringExperienceDetails']

    def test_profile_without_experience_creates_successfully(self, authenticated_client, reference_data):
        """Test that profile without mentoring experience can be created."""
        data = {
            'hasMentoringExperience': False,
            'institution': reference_data['institution'].name,
            'specialtyGroup': reference_data['specialty_group'].name,
            'workplace': 'Test Hospital',
        }
        response = authenticated_client.post(MENTOR_ME_URL, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['hasMentoringExperience'] is False


@pytest.mark.django_db
class TestMentorProfileWithManyToMany:
    """Tests for mentor profile M2M degree relationships."""

    def test_profile_with_multiple_degrees(self, authenticated_client, reference_data, db):
        """Test creating profile with multiple degrees."""
        # Create additional degree
        degree2, _ = Degree.objects.get_or_create(
            name='MD',
            defaults={'name_he': 'רופא', 'is_active': True, 'sort_order': 101},
        )

        data = {
            'degrees': [reference_data['degree'].name, degree2.name],
            'institution': reference_data['institution'].name,
            'specialtyGroup': reference_data['specialty_group'].name,
            'hasMentoringExperience': False,
            'workplace': 'Test Hospital',
        }
        response = authenticated_client.post(MENTOR_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED

    def test_patch_degrees(self, authenticated_client, user, reference_data, db):
        """Test updating degrees via PATCH."""
        # Create profile without degrees
        MentorProfile.objects.create(
            user=user,
            workplace='Test Hospital',
        )

        # Add degree
        data = {'degrees': [reference_data['degree'].name]}
        response = authenticated_client.patch(MENTOR_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_200_OK
