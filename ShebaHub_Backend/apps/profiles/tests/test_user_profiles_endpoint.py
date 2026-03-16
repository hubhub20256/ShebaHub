"""
Tests for the unified public_user_profiles endpoint (Change 1A).

Covers:
- GET /api/profiles/user/<uuid:user_id>/ — returns both student and mentor profiles
- Dual-role user returns both profiles
- Single-role user returns one profile and null for the other
- Non-existent user returns 404
- User with no profiles returns 404
"""

import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import (
    Institution,
    MentorProfile,
    Specialty,
    SpecialtyGroup,
    StudentProfile,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


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
def dual_role_user(db, institution, specialty):
    """A user with both student and mentor profiles."""
    user = User.objects.create_user(
        email='dual@example.com',
        password='TestPass123!',
        firstName='Dual',
        lastName='Role',
        email_verified=True,
    )
    StudentProfile.objects.create(user=user, institution=institution)
    MentorProfile.objects.create(user=user, institution=institution, specialty=specialty)
    return user


@pytest.fixture
def student_only_user(db, institution):
    """A user with only a student profile."""
    user = User.objects.create_user(
        email='student_only@example.com',
        password='TestPass123!',
        firstName='Student',
        lastName='Only',
        email_verified=True,
    )
    StudentProfile.objects.create(user=user, institution=institution)
    return user


@pytest.fixture
def mentor_only_user(db, institution, specialty):
    """A user with only a mentor profile."""
    user = User.objects.create_user(
        email='mentor_only@example.com',
        password='TestPass123!',
        firstName='Mentor',
        lastName='Only',
        email_verified=True,
    )
    MentorProfile.objects.create(user=user, institution=institution, specialty=specialty)
    return user


@pytest.fixture
def no_profile_user(db):
    """A user with no profiles at all."""
    return User.objects.create_user(
        email='noprofile@example.com',
        password='TestPass123!',
        firstName='No',
        lastName='Profile',
        email_verified=True,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPublicUserProfiles:
    URL_TEMPLATE = '/api/profiles/user/{}/'

    def test_dual_role_user_returns_both_profiles(self, api_client, dual_role_user):
        """Dual-role user should return both student and mentor data."""
        url = self.URL_TEMPLATE.format(dual_role_user.id)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['student'] is not None
        assert response.data['mentor'] is not None
        # Both should have name and userId
        assert response.data['student']['name'] == 'Dual Role'
        assert response.data['mentor']['name'] == 'Dual Role'
        assert response.data['student']['userId'] == str(dual_role_user.id)
        assert response.data['mentor']['userId'] == str(dual_role_user.id)

    def test_student_only_user(self, api_client, student_only_user):
        """Student-only user should return student data, mentor=null."""
        url = self.URL_TEMPLATE.format(student_only_user.id)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['student'] is not None
        assert response.data['mentor'] is None

    def test_mentor_only_user(self, api_client, mentor_only_user):
        """Mentor-only user should return mentor data, student=null."""
        url = self.URL_TEMPLATE.format(mentor_only_user.id)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['student'] is None
        assert response.data['mentor'] is not None

    def test_no_profile_user_returns_404(self, api_client, no_profile_user):
        """User with no profiles returns 404."""
        url = self.URL_TEMPLATE.format(no_profile_user.id)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_nonexistent_user_returns_404(self, api_client):
        """Non-existent user UUID returns 404."""
        url = self.URL_TEMPLATE.format(uuid.uuid4())
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_allows_unauthenticated_access(self, api_client, student_only_user):
        """Endpoint is AllowAny — no authentication needed."""
        response = api_client.get(self.URL_TEMPLATE.format(student_only_user.id))
        assert response.status_code == status.HTTP_200_OK

    def test_student_response_contains_specialtyGroups_detail(self, api_client, dual_role_user):
        """Student profile should include specialtyGroups_detail field."""
        url = self.URL_TEMPLATE.format(dual_role_user.id)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        student = response.data['student']
        assert 'specialtyGroups_detail' in student

    def test_mentor_response_contains_specialtyGroups_detail(self, api_client, dual_role_user):
        """Mentor profile should include specialtyGroups_detail field."""
        url = self.URL_TEMPLATE.format(dual_role_user.id)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        mentor = response.data['mentor']
        assert 'specialtyGroups_detail' in mentor
