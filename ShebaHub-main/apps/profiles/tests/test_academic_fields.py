"""
Tests for academic rank and affiliation fields on MentorProfile (Task 6).

Covers:
- Creating mentor profile with academic fields
- Updating academic fields
- Retrieving mentor profile includes academic fields
- Academic rank from reference table
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import (
    MentorProfile, AcademicRank, SpecialtyGroup, Institution,
)

User = get_user_model()

MENTOR_ME_URL = '/api/profiles/mentor/me/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def mentor_user(db):
    return User.objects.create_user(
        email='academic@example.com', password='TestPass123!',
        firstName='Academic', lastName='Mentor', email_verified=True,
    )


@pytest.fixture
def auth_mentor(api_client, mentor_user):
    api_client.force_authenticate(user=mentor_user)
    return api_client


@pytest.fixture
def specialty_group(db):
    return SpecialtyGroup.objects.create(
        name='Internal Medicine', name_he='רפואה פנימית', is_active=True,
    )


@pytest.fixture
def academic_rank(db):
    rank, _ = AcademicRank.objects.get_or_create(
        name='Professor', defaults={'name_he': 'פרופסור', 'is_active': True},
    )
    return rank


@pytest.fixture
def senior_lecturer_rank(db):
    rank, _ = AcademicRank.objects.get_or_create(
        name='Senior Lecturer', defaults={'name_he': 'מרצה בכיר', 'is_active': True},
    )
    return rank


@pytest.mark.django_db
class TestAcademicFields:

    def test_create_mentor_with_academic_fields(
        self, auth_mentor, specialty_group, academic_rank,
    ):
        """Creating a mentor profile with universityRank, universityAffiliation,
        and academicRank should store all values."""
        data = {
            'specialtyGroup': specialty_group.name,
            'hasMentoringExperience': False,
            'universityRank': 'פרופסור',
            'universityAffiliation': 'Tel Aviv University',
            'academicRank': academic_rank.name,
        }
        response = auth_mentor.post(MENTOR_ME_URL, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data['universityRank'] == 'פרופסור'
        assert response.data['universityAffiliation'] == 'Tel Aviv University'

    def test_update_academic_fields(
        self, auth_mentor, specialty_group, academic_rank, senior_lecturer_rank,
    ):
        """PATCH should update universityRank and universityAffiliation."""
        # Create first
        create_data = {
            'specialtyGroup': specialty_group.name,
            'hasMentoringExperience': False,
            'universityRank': 'מרצה',
            'universityAffiliation': 'Hebrew University',
        }
        resp = auth_mentor.post(MENTOR_ME_URL, create_data, format='json')
        assert resp.status_code == status.HTTP_201_CREATED

        # Update
        patch_data = {
            'universityRank': 'פרופסור חבר',
            'universityAffiliation': 'Technion',
            'academicRank': senior_lecturer_rank.name,
        }
        resp = auth_mentor.patch(MENTOR_ME_URL, patch_data, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['universityRank'] == 'פרופסור חבר'
        assert resp.data['universityAffiliation'] == 'Technion'

    def test_retrieve_includes_academic_fields(
        self, auth_mentor, specialty_group, academic_rank,
    ):
        """GET should return universityRank, universityAffiliation,
        and academicRank_detail."""
        create_data = {
            'specialtyGroup': specialty_group.name,
            'hasMentoringExperience': False,
            'universityRank': 'מרצה בכיר',
            'universityAffiliation': 'Ben Gurion University',
            'academicRank': academic_rank.name,
        }
        resp = auth_mentor.post(MENTOR_ME_URL, create_data, format='json')
        assert resp.status_code == status.HTTP_201_CREATED

        resp = auth_mentor.get(MENTOR_ME_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert 'universityRank' in resp.data
        assert 'universityAffiliation' in resp.data
        assert resp.data['universityRank'] == 'מרצה בכיר'
        assert resp.data['universityAffiliation'] == 'Ben Gurion University'
        # academicRank_detail should be a nested object
        assert resp.data['academicRank_detail'] is not None
        assert resp.data['academicRank_detail']['name'] == 'Professor'

    def test_public_mentor_includes_academic_fields(self, db, specialty_group, academic_rank):
        """Public mentor profile endpoint should include academic fields."""
        user = User.objects.create_user(
            email='public-acad@example.com', password='TestPass123!',
            firstName='Public', lastName='Academic', email_verified=True,
        )
        MentorProfile.objects.create(
            user=user, universityRank='פרופסור',
            universityAffiliation='Weizmann Institute',
            academicRank=academic_rank,
        )

        client = APIClient()
        client.force_authenticate(user=user)
        # Use the unified profile endpoint
        resp = client.get(f'/api/profiles/user/{user.id}/')
        assert resp.status_code == status.HTTP_200_OK
        mentor = resp.data['mentor']
        assert mentor is not None
        assert 'universityRank' in mentor or 'academicRank_detail' in mentor
