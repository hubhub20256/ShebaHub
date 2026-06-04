"""
Tests for Task 5a (BSc degree support) and Task 5b (רופא מומחה training stage).
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import Degree, MedicalTrainingStage, Institution

User = get_user_model()

STUDENT_ME_URL = '/api/profiles/student/me/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='bsc_test@example.com',
        password='TestPass123!',
        firstName='BSc',
        lastName='Tester',
        email_verified=True,
    )


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def reference_data(db):
    institution, _ = Institution.objects.get_or_create(
        name='Test University',
        defaults={'name_he': 'אוניברסיטת בדיקה', 'is_active': True, 'sort_order': 100},
    )
    bsc, _ = Degree.objects.get_or_create(
        name='BSc',
        defaults={'name_he': 'BSc', 'is_active': True, 'sort_order': 6},
    )
    md, _ = Degree.objects.get_or_create(
        name='MD',
        defaults={'name_he': 'MD', 'is_active': True, 'sort_order': 1},
    )
    stage, _ = MedicalTrainingStage.objects.get_or_create(
        name='doctor_mitmahe',
        defaults={'name_he': 'רופא מומחה', 'is_active': True, 'sort_order': 6},
    )
    return {
        'institution': institution,
        'bsc': bsc,
        'md': md,
        'stage': stage,
    }


@pytest.mark.django_db
class TestBScDegree:
    """Tests that BSc is accepted as a valid degree."""

    def test_create_student_profile_with_bsc(self, authenticated_client, reference_data):
        """BSc should be accepted when creating a student profile."""
        response = authenticated_client.post(STUDENT_ME_URL, {
            'institution': reference_data['institution'].name,
            'degrees': ['BSc'],
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        # Verify degree is saved
        degrees = [d['name'] for d in response.data.get('degrees_detail', [])]
        assert 'BSc' in degrees

    def test_create_student_profile_with_bsc_and_md(self, authenticated_client, reference_data):
        """Multiple degrees including BSc should work."""
        response = authenticated_client.post(STUDENT_ME_URL, {
            'institution': reference_data['institution'].name,
            'degrees': ['BSc', 'MD'],
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        degrees = [d['name'] for d in response.data.get('degrees_detail', [])]
        assert 'BSc' in degrees
        assert 'MD' in degrees

    def test_invalid_degree_still_rejected(self, authenticated_client, reference_data):
        """Unsupported degree names should still fail validation."""
        response = authenticated_client.post(STUDENT_ME_URL, {
            'institution': reference_data['institution'].name,
            'degrees': ['FakeDegree'],
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestTrainingStageRofeMumhe:
    """Tests that רופא מומחה is resolved correctly as a training stage."""

    def test_create_student_with_rofe_mumhe(self, authenticated_client, reference_data):
        """Frontend sends 'רופא מומחה' — backend should resolve it."""
        response = authenticated_client.post(STUDENT_ME_URL, {
            'apprenticeStage': 'רופא מומחה',
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        detail = response.data.get('apprenticeStage_detail')
        assert detail is not None
        assert detail['name_he'] == 'רופא מומחה'

    def test_training_stage_reference_data_updated(self, reference_data):
        """The doctor_mitmahe entry should have name_he = רופא מומחה."""
        stage = MedicalTrainingStage.objects.get(name='doctor_mitmahe')
        assert stage.name_he == 'רופא מומחה'
