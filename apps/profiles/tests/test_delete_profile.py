"""
Tests for profile deletion endpoints.

Tests cover:
- Student profile deletion (204, 404, 401)
- Mentor profile deletion (204, 404, 401)
- Cleanup of associated documents, recommendations, and avatar
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import (
    StudentProfile,
    MentorProfile,
    ProfileDocument,
    ProfessionalRecommendation,
    Institution,
)

User = get_user_model()

STUDENT_ME_URL = '/api/profiles/student/me/'
MENTOR_ME_URL = '/api/profiles/mentor/me/'


@pytest.fixture
def api_client():
    """Return an API client."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(
        email='deletetest@example.com',
        password='TestPass123!',
        firstName='Delete',
        lastName='Test',
    )


@pytest.fixture
def other_user(db):
    """Create a second test user."""
    return User.objects.create_user(
        email='otheruser@example.com',
        password='TestPass123!',
        firstName='Other',
        lastName='User',
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def institution(db):
    """Create a test institution."""
    inst, _ = Institution.objects.get_or_create(
        name='Delete Test University',
        defaults={'name_he': 'אוניברסיטת מחיקה', 'is_active': True, 'sort_order': 100},
    )
    return inst


@pytest.mark.django_db
class TestDeleteStudentProfile:
    """Tests for DELETE /api/profiles/student/me/"""

    def test_delete_student_profile_success(self, authenticated_client, user):
        """Deleting an existing student profile returns 204."""
        StudentProfile.objects.create(user=user)

        response = authenticated_client.delete(STUDENT_ME_URL)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not StudentProfile.objects.filter(user=user).exists()

    def test_delete_student_profile_not_found(self, authenticated_client):
        """Deleting when no profile exists returns 404."""
        response = authenticated_client.delete(STUDENT_ME_URL)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data['code'] == 'NOT_FOUND'

    def test_delete_student_profile_unauthenticated(self, api_client):
        """Unauthenticated delete request returns 401."""
        response = api_client.delete(STUDENT_ME_URL)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_student_profile_cleans_up_documents(self, authenticated_client, user):
        """Deleting a profile also removes associated documents."""
        profile = StudentProfile.objects.create(user=user)
        doc = ProfileDocument.objects.create(
            student_profile=profile,
            document_type='CV',
            file=SimpleUploadedFile('test.pdf', b'%PDF-1.4\ncontent\n%%EOF', content_type='application/pdf'),
        )
        doc_id = doc.id

        response = authenticated_client.delete(STUDENT_ME_URL)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ProfileDocument.objects.filter(id=doc_id).exists()

    def test_delete_student_profile_cleans_up_recommendations(self, authenticated_client, user):
        """Deleting a profile also removes associated recommendations."""
        profile = StudentProfile.objects.create(user=user)
        rec = ProfessionalRecommendation.objects.create(
            student_profile=profile,
            recommender_name='Dr. Test',
            recommender_email='dr@test.com',
        )
        rec_id = rec.id

        response = authenticated_client.delete(STUDENT_ME_URL)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ProfessionalRecommendation.objects.filter(id=rec_id).exists()


@pytest.mark.django_db
class TestDeleteMentorProfile:
    """Tests for DELETE /api/profiles/mentor/me/"""

    def test_delete_mentor_profile_success(self, authenticated_client, user):
        """Deleting an existing mentor profile returns 204."""
        MentorProfile.objects.create(user=user)

        response = authenticated_client.delete(MENTOR_ME_URL)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not MentorProfile.objects.filter(user=user).exists()

    def test_delete_mentor_profile_not_found(self, authenticated_client):
        """Deleting when no mentor profile exists returns 404."""
        response = authenticated_client.delete(MENTOR_ME_URL)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data['code'] == 'NOT_FOUND'

    def test_delete_mentor_profile_unauthenticated(self, api_client):
        """Unauthenticated delete request returns 401."""
        response = api_client.delete(MENTOR_ME_URL)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_mentor_profile_cleans_up_documents(self, authenticated_client, user):
        """Deleting a mentor profile also removes associated documents."""
        profile = MentorProfile.objects.create(user=user)
        doc = ProfileDocument.objects.create(
            mentor_profile=profile,
            document_type='CV',
            file=SimpleUploadedFile('test.pdf', b'%PDF-1.4\ncontent\n%%EOF', content_type='application/pdf'),
        )
        doc_id = doc.id

        response = authenticated_client.delete(MENTOR_ME_URL)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ProfileDocument.objects.filter(id=doc_id).exists()

    def test_delete_mentor_profile_cleans_up_recommendations(self, authenticated_client, user):
        """Deleting a mentor profile also removes associated recommendations."""
        profile = MentorProfile.objects.create(user=user)
        rec = ProfessionalRecommendation.objects.create(
            mentor_profile=profile,
            recommender_name='Prof. Mentor',
            recommender_email='prof@test.com',
        )
        rec_id = rec.id

        response = authenticated_client.delete(MENTOR_ME_URL)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ProfessionalRecommendation.objects.filter(id=rec_id).exists()
