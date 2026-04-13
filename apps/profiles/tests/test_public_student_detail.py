"""
Tests for the public_student_detail endpoint.

Bug 2 regression: compensationPreference (JSONField) could cause 500
when serialized through PublicStudentDetailSerializer.

Also tests: auth, 404, and document visibility rules.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import (
    StudentProfile,
    MentorProfile,
    Institution,
    ProfileDocument,
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
        name='Test University', name_he='אוניברסיטת בדיקה', is_active=True,
    )


@pytest.fixture
def student_user(db):
    return User.objects.create_user(
        email='student@example.com',
        password='TestPass123!',
        firstName='Student',
        lastName='User',
    )


@pytest.fixture
def viewer_user(db):
    return User.objects.create_user(
        email='viewer@example.com',
        password='TestPass123!',
        firstName='Viewer',
        lastName='User',
    )


@pytest.fixture
def mentor_user(db):
    return User.objects.create_user(
        email='mentor@example.com',
        password='TestPass123!',
        firstName='Mentor',
        lastName='User',
    )


@pytest.fixture
def student_profile_empty_compensation(student_user, institution):
    return StudentProfile.objects.create(
        user=student_user,
        institution=institution,
        compensationPreference=[],
    )


@pytest.fixture
def student_profile_with_compensation(student_user, institution):
    return StudentProfile.objects.create(
        user=student_user,
        institution=institution,
        compensationPreference=["מלגה", "שכר"],
    )


@pytest.fixture
def viewer_client(api_client, viewer_user):
    api_client.force_authenticate(user=viewer_user)
    return api_client


@pytest.fixture
def owner_client(api_client, student_user):
    api_client.force_authenticate(user=student_user)
    return api_client


def _url(profile_id):
    return f'/api/profiles/students/{profile_id}/'


# ---------------------------------------------------------------------------
# Bug 2 Regression – compensationPreference variants
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPublicStudentDetailRegression:

    def test_returns_200_with_empty_compensation_preference(
        self, viewer_client, student_profile_empty_compensation,
    ):
        """Bug 2: empty compensationPreference=[] must not crash."""
        url = _url(student_profile_empty_compensation.id)
        response = viewer_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['compensationPreference'] == []

    def test_returns_200_with_populated_compensation_preference(
        self, viewer_client, student_user, institution,
    ):
        """Bug 2: populated list returns 200."""
        profile = StudentProfile.objects.create(
            user=student_user,
            institution=institution,
            compensationPreference=["מלגה", "שכר"],
        )
        url = _url(profile.id)
        response = viewer_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['compensationPreference'] == ["מלגה", "שכר"]

    def test_returns_200_with_single_item_compensation(
        self, viewer_client, student_user, institution,
    ):
        profile = StudentProfile.objects.create(
            user=student_user,
            institution=institution,
            compensationPreference=["מלגה"],
        )
        url = _url(profile.id)
        response = viewer_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['compensationPreference'] == ["מלגה"]


# ---------------------------------------------------------------------------
# Auth & 404
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPublicStudentDetailAuth:

    def test_unauthenticated_returns_401(
        self, api_client, student_profile_empty_compensation,
    ):
        url = _url(student_profile_empty_compensation.id)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_nonexistent_student_returns_404(self, viewer_client):
        import uuid
        url = _url(uuid.uuid4())
        response = viewer_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Document visibility
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPublicStudentDetailDocumentVisibility:

    @pytest.fixture
    def profile_with_doc(self, student_user, institution):
        profile = StudentProfile.objects.create(
            user=student_user, institution=institution,
        )
        ProfileDocument.objects.create(
            student_profile=profile,
            file='test.pdf',
            original_filename='test.pdf',
            document_type='CV',
        )
        return profile

    def test_owner_sees_documents(self, owner_client, profile_with_doc):
        url = _url(profile_with_doc.id)
        response = owner_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['documents']) == 1

    def test_unrelated_user_sees_empty_documents(
        self, viewer_client, profile_with_doc,
    ):
        url = _url(profile_with_doc.id)
        response = viewer_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['documents'] == []

    def test_mentor_with_approved_application_sees_documents(
        self, api_client, mentor_user, student_user, profile_with_doc,
    ):
        from apps.research.models import Research, ResearchApplication
        research = Research.objects.create(
            owner=mentor_user,
            researchName='Test Research',
        )
        ResearchApplication.objects.create(
            research=research,
            applicant=student_user,
            status=ResearchApplication.Status.APPROVED,
        )
        api_client.force_authenticate(user=mentor_user)
        url = _url(profile_with_doc.id)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['documents']) == 1

    def test_mentor_with_cancelled_application_cannot_see_documents(
        self, api_client, mentor_user, student_user, profile_with_doc,
    ):
        from apps.research.models import Research, ResearchApplication
        research = Research.objects.create(
            owner=mentor_user,
            researchName='Test Research',
        )
        ResearchApplication.objects.create(
            research=research,
            applicant=student_user,
            status=ResearchApplication.Status.CANCELLED,
        )
        api_client.force_authenticate(user=mentor_user)
        url = _url(profile_with_doc.id)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['documents'] == []
