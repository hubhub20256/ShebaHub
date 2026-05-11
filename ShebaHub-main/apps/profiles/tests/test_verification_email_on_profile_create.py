"""
Tests for verification email sent after profile creation.

Ensures that when an unverified user creates a student or mentor profile,
a verification email is sent. Verified users should NOT get a duplicate email.
"""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import (
    Institution,
    Degree,
    AcademicRank,
    SpecialtyGroup,
    Specialty,
)

User = get_user_model()

STUDENT_ME_URL = '/api/profiles/student/me/'
MENTOR_ME_URL = '/api/profiles/mentor/me/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def unverified_user(db):
    """Create a user whose email is NOT verified."""
    return User.objects.create_user(
        email='unverified@example.com',
        password='TestPass123!',
        firstName='Unverified',
        lastName='User',
        email_verified=False,
    )


@pytest.fixture
def verified_user(db):
    """Create a user whose email IS verified."""
    return User.objects.create_user(
        email='verified@example.com',
        password='TestPass123!',
        firstName='Verified',
        lastName='User',
        email_verified=True,
    )


@pytest.fixture
def auth_client_unverified(api_client, unverified_user):
    api_client.force_authenticate(user=unverified_user)
    return api_client


@pytest.fixture
def auth_client_verified(api_client, verified_user):
    api_client.force_authenticate(user=verified_user)
    return api_client


@pytest.fixture
def student_reference_data(db):
    institution, _ = Institution.objects.get_or_create(
        name='Test University',
        defaults={'name_he': 'אוניברסיטת בדיקה', 'is_active': True, 'sort_order': 100},
    )
    degree, _ = Degree.objects.get_or_create(
        name='MSc',
        defaults={'name_he': 'תואר שני', 'is_active': True, 'sort_order': 100},
    )
    return {'institution': institution, 'degree': degree}


@pytest.fixture
def mentor_reference_data(db):
    institution, _ = Institution.objects.get_or_create(
        name='Test University',
        defaults={'name_he': 'אוניברסיטת בדיקה', 'is_active': True, 'sort_order': 100},
    )
    degree, _ = Degree.objects.get_or_create(
        name='PhD',
        defaults={'name_he': 'דוקטורט', 'is_active': True, 'sort_order': 100},
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
    return {
        'institution': institution,
        'degree': degree,
        'specialty_group': specialty_group,
        'specialty': specialty,
    }


# ---------------------------------------------------------------------------
# Student profile creation – verification email
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestStudentProfileCreationSendsVerificationEmail:
    """Verification email should be sent when an unverified user creates a student profile."""

    @patch('apps.profiles.views.EmailService.send_verification_email')
    def test_unverified_user_gets_verification_email(
        self, mock_send, auth_client_unverified, student_reference_data
    ):
        data = {
            'institution': student_reference_data['institution'].name,
            'degrees': [student_reference_data['degree'].name],
            'hasResearchExperience': False,
        }
        response = auth_client_unverified.post(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        mock_send.assert_called_once()
        called_user = mock_send.call_args[0][0]
        assert called_user.email == 'unverified@example.com'

    @patch('apps.profiles.views.EmailService.send_verification_email')
    def test_verified_user_does_not_get_verification_email(
        self, mock_send, auth_client_verified, student_reference_data
    ):
        data = {
            'institution': student_reference_data['institution'].name,
            'degrees': [student_reference_data['degree'].name],
            'hasResearchExperience': False,
        }
        response = auth_client_verified.post(STUDENT_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        mock_send.assert_not_called()


# ---------------------------------------------------------------------------
# Mentor profile creation – verification email
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestMentorProfileCreationSendsVerificationEmail:
    """Verification email should be sent when an unverified user creates a mentor profile."""

    @patch('apps.profiles.views.EmailService.send_verification_email')
    def test_unverified_user_gets_verification_email(
        self, mock_send, auth_client_unverified, mentor_reference_data
    ):
        data = {
            'institution': mentor_reference_data['institution'].name,
            'degrees': [mentor_reference_data['degree'].name],
            'specialtyGroup': mentor_reference_data['specialty_group'].name,
            'specialty': mentor_reference_data['specialty'].name,
            'workplace': 'Test Medical Center',
            'hasMentoringExperience': False,
        }
        response = auth_client_unverified.post(MENTOR_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        mock_send.assert_called_once()
        called_user = mock_send.call_args[0][0]
        assert called_user.email == 'unverified@example.com'

    @patch('apps.profiles.views.EmailService.send_verification_email')
    def test_verified_user_does_not_get_verification_email(
        self, mock_send, auth_client_verified, mentor_reference_data
    ):
        data = {
            'institution': mentor_reference_data['institution'].name,
            'degrees': [mentor_reference_data['degree'].name],
            'specialtyGroup': mentor_reference_data['specialty_group'].name,
            'specialty': mentor_reference_data['specialty'].name,
            'workplace': 'Test Medical Center',
            'hasMentoringExperience': False,
        }
        response = auth_client_verified.post(MENTOR_ME_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        mock_send.assert_not_called()
