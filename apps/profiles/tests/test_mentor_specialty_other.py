"""
Tests for mentor 'Other' specialization with free text (Task 5c).
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import MentorProfile, Specialty, SpecialtyGroup

User = get_user_model()

MENTOR_ME_URL = '/api/profiles/mentor/me/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def specialty_group(db):
    group, _ = SpecialtyGroup.objects.get_or_create(
        name='TestGroup', defaults={'name_he': 'קבוצה', 'is_active': True}
    )
    return group


@pytest.fixture
def other_specialty(db):
    spec, _ = Specialty.objects.get_or_create(
        name='Other',
        defaults={'name_he': 'אחר', 'is_active': True, 'sort_order': 9999},
    )
    return spec


@pytest.fixture
def regular_specialty(db, specialty_group):
    spec, _ = Specialty.objects.get_or_create(
        name='Cardiology',
        defaults={'name_he': 'קרדיולוגיה', 'group': specialty_group, 'is_active': True},
    )
    return spec


def _make_mentor_user(db, email):
    return User.objects.create_user(
        email=email,
        password='TestPass123!',
        firstName='Mentor',
        lastName='Other',
        email_verified=True,
    )


def _base_payload(specialty_group):
    """Required fields for mentor profile creation."""
    return {
        'specialtyGroup': specialty_group.name_he,
        'hasMentoringExperience': 'כן',
    }


@pytest.mark.django_db
class TestMentorSpecialtyOther:

    def test_create_mentor_with_other_specialty_and_free_text(
        self, api_client, db, other_specialty, specialty_group,
    ):
        user = _make_mentor_user(db, 'mo1@example.com')
        api_client.force_authenticate(user=user)
        payload = _base_payload(specialty_group)
        payload['specialties'] = ['אחר']
        payload['specialty_other'] = 'Biomechanical Engineering'
        response = api_client.post(MENTOR_ME_URL, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['specialty_other'] == 'Biomechanical Engineering'

    def test_create_mentor_with_other_specialty_without_free_text(
        self, api_client, db, other_specialty, specialty_group,
    ):
        """Should still succeed — free text is optional."""
        user = _make_mentor_user(db, 'mo2@example.com')
        api_client.force_authenticate(user=user)
        payload = _base_payload(specialty_group)
        payload['specialties'] = ['אחר']
        response = api_client.post(MENTOR_ME_URL, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['specialty_other'] == ''

    def test_create_mentor_with_regular_specialty(
        self, api_client, db, regular_specialty, specialty_group,
    ):
        """Regular specialties should work without specialty_other."""
        user = _make_mentor_user(db, 'mo3@example.com')
        api_client.force_authenticate(user=user)
        payload = _base_payload(specialty_group)
        payload['specialties'] = ['קרדיולוגיה']
        response = api_client.post(MENTOR_ME_URL, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['specialty_other'] == ''

    def test_update_mentor_specialty_other(
        self, api_client, db, other_specialty, specialty_group,
    ):
        user = _make_mentor_user(db, 'mo4@example.com')
        api_client.force_authenticate(user=user)
        payload = _base_payload(specialty_group)
        payload['specialties'] = ['אחר']
        payload['specialty_other'] = 'Initial'
        create_resp = api_client.post(MENTOR_ME_URL, payload, format='json')
        assert create_resp.status_code == status.HTTP_201_CREATED

        response = api_client.patch(MENTOR_ME_URL, {
            'specialty_other': 'Updated Specialization',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['specialty_other'] == 'Updated Specialization'

    def test_other_specialty_exists_in_reference_data(self, other_specialty):
        assert Specialty.objects.filter(name='Other', name_he='אחר').exists()
