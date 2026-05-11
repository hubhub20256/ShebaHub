"""
Tests for multi-select specialties on student and mentor profiles.

Tests cover:
- Creating profiles with multiple specialties (M2M)
- Updating specialties replaces existing set
- Clearing specialties with empty list
- specialties_detail returned in GET responses
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
    Institution,
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
        email='spec-student@example.com',
        password='TestPass123!',
        firstName='Spec',
        lastName='Student',
        email_verified=True,
    )


@pytest.fixture
def mentor_user(db):
    return User.objects.create_user(
        email='spec-mentor@example.com',
        password='TestPass123!',
        firstName='Spec',
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
def specialties(db):
    """Create a specialty group with three specialties."""
    group = SpecialtyGroup.objects.create(
        name='TestGroup', name_he='קבוצת בדיקה', is_active=True,
    )
    cardiology = Specialty.objects.create(
        name='Cardiology', name_he='קרדיולוגיה', group=group, is_active=True,
    )
    neurology = Specialty.objects.create(
        name='Neurology', name_he='נוירולוגיה', group=group, is_active=True,
    )
    dermatology = Specialty.objects.create(
        name='Dermatology', name_he='דרמטולוגיה', group=group, is_active=True,
    )
    return {
        'group': group,
        'cardiology': cardiology,
        'neurology': neurology,
        'dermatology': dermatology,
    }


@pytest.fixture
def institution(db):
    inst, _ = Institution.objects.get_or_create(
        name='Tel Aviv University',
        defaults={'name_he': 'אוניברסיטת תל אביב', 'is_active': True},
    )
    return inst


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestSpecialtiesMultiSelect:
    """Tests for M2M specialties field on student and mentor profiles."""

    def test_student_create_with_multiple_specialties(
        self, auth_student, specialties,
    ):
        """Creating a student profile with specialties=['Cardiology','Neurology']
        should store both specialties in the M2M relation."""
        data = {
            'specialties': ['Cardiology', 'Neurology'],
            'specialtyGroup': specialties['group'].name,
        }

        response = auth_student.post(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED, response.data
        profile = StudentProfile.objects.get(user__email='spec-student@example.com')
        saved_names = set(profile.specialties.values_list('name', flat=True))
        assert saved_names == {'Cardiology', 'Neurology'}

    def test_mentor_create_with_multiple_specialties(
        self, auth_mentor, specialties, institution,
    ):
        """Creating a mentor profile with specialties=['Cardiology','Neurology']
        should store both specialties in the M2M relation."""
        data = {
            'specialtyGroup': specialties['group'].name,
            'specialties': ['Cardiology', 'Neurology'],
            'hasMentoringExperience': False,
        }

        response = auth_mentor.post(MENTOR_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED, response.data
        profile = MentorProfile.objects.get(user__email='spec-mentor@example.com')
        saved_names = set(profile.specialties.values_list('name', flat=True))
        assert saved_names == {'Cardiology', 'Neurology'}

    def test_update_replaces_specialties(
        self, auth_student, specialties,
    ):
        """PATCH with a new specialties list should fully replace existing M2M."""
        # Create profile with Cardiology + Neurology
        create_data = {
            'specialties': ['Cardiology', 'Neurology'],
            'specialtyGroup': specialties['group'].name,
        }
        resp = auth_student.post(STUDENT_ME_URL, create_data, format='json')
        assert resp.status_code == status.HTTP_201_CREATED, resp.data

        # Update to Dermatology only
        patch_data = {
            'specialties': ['Dermatology'],
        }
        resp = auth_student.patch(STUDENT_ME_URL, patch_data, format='json')

        assert resp.status_code == status.HTTP_200_OK, resp.data
        profile = StudentProfile.objects.get(user__email='spec-student@example.com')
        saved_names = list(profile.specialties.values_list('name', flat=True))
        assert saved_names == ['Dermatology']

    def test_empty_list_clears_specialties(
        self, auth_student, specialties,
    ):
        """PATCH with specialties=[] should clear all M2M entries."""
        # Create with specialties
        create_data = {
            'specialties': ['Cardiology', 'Neurology'],
            'specialtyGroup': specialties['group'].name,
        }
        resp = auth_student.post(STUDENT_ME_URL, create_data, format='json')
        assert resp.status_code == status.HTTP_201_CREATED, resp.data

        # Clear specialties
        patch_data = {
            'specialties': [],
        }
        resp = auth_student.patch(STUDENT_ME_URL, patch_data, format='json')

        assert resp.status_code == status.HTTP_200_OK, resp.data
        profile = StudentProfile.objects.get(user__email='spec-student@example.com')
        assert profile.specialties.count() == 0

    def test_specialties_returned_in_detail(
        self, auth_student, specialties,
    ):
        """GET response should include specialties_detail with id, name, and
        name_he for each associated specialty."""
        create_data = {
            'specialties': ['Cardiology', 'Neurology'],
            'specialtyGroup': specialties['group'].name,
        }
        resp = auth_student.post(STUDENT_ME_URL, create_data, format='json')
        assert resp.status_code == status.HTTP_201_CREATED, resp.data

        resp = auth_student.get(STUDENT_ME_URL)
        assert resp.status_code == status.HTTP_200_OK

        detail = resp.data['specialties_detail']
        assert len(detail) == 2
        detail_names = {item['name'] for item in detail}
        assert detail_names == {'Cardiology', 'Neurology'}
        # Each item should have the expected keys
        for item in detail:
            assert 'id' in item
            assert 'name' in item
            assert 'name_he' in item
