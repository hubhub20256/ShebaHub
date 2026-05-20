"""
Tests for the secure document download endpoint.

Endpoint: GET /api/profiles/documents/<document_id>/download/

Access control rules (from the view):
- Authenticated users only (401 otherwise)
- Document owner can download
- Staff can download any document
- Mentor whose research the student (doc owner) applied to can download
  (excluding cancelled/removed applications)
- Everyone else gets 403
- Non-existent document returns 404
"""

import uuid

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import (
    Institution,
    MentorProfile,
    ProfileDocument,
    StudentProfile,
)
from apps.research.models import Research, ResearchApplication

User = get_user_model()

DOWNLOAD_URL_TEMPLATE = "/api/profiles/documents/{document_id}/download/"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name="Download Test University",
        name_he="אוניברסיטת בדיקה",
        is_active=True,
    )


@pytest.fixture
def student_user(db):
    return User.objects.create_user(
        email="student-dl@example.com",
        password="TestPass123!",
        firstName="Student",
        lastName="Downloader",
        email_verified=True,
    )


@pytest.fixture
def student_profile(db, student_user, institution):
    return StudentProfile.objects.create(user=student_user, institution=institution)


@pytest.fixture
def mentor_user(db):
    return User.objects.create_user(
        email="mentor-dl@example.com",
        password="TestPass123!",
        firstName="Mentor",
        lastName="Downloader",
        email_verified=True,
    )


@pytest.fixture
def mentor_profile(db, mentor_user):
    return MentorProfile.objects.create(user=mentor_user)


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="other-dl@example.com",
        password="TestPass123!",
        firstName="Other",
        lastName="User",
        email_verified=True,
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="staff-dl@example.com",
        password="TestPass123!",
        firstName="Staff",
        lastName="User",
        is_staff=True,
        email_verified=True,
    )


@pytest.fixture
def student_document(db, student_profile):
    """Create a ProfileDocument owned by the student profile with a real file."""
    pdf_content = b"%PDF-1.4 test document content"
    uploaded_file = SimpleUploadedFile(
        "test_cv.pdf", pdf_content, content_type="application/pdf"
    )
    return ProfileDocument.objects.create(
        student_profile=student_profile,
        file=uploaded_file,
        original_filename="test_cv.pdf",
        document_type=ProfileDocument.DocumentType.CV,
    )


@pytest.fixture
def mentor_document(db, mentor_profile):
    """Create a ProfileDocument owned by the mentor profile."""
    pdf_content = b"%PDF-1.4 mentor document content"
    uploaded_file = SimpleUploadedFile(
        "mentor_cv.pdf", pdf_content, content_type="application/pdf"
    )
    return ProfileDocument.objects.create(
        mentor_profile=mentor_profile,
        file=uploaded_file,
        original_filename="mentor_cv.pdf",
        document_type=ProfileDocument.DocumentType.CV,
    )


def _download_url(document_id):
    return DOWNLOAD_URL_TEMPLATE.format(document_id=document_id)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestDocumentDownloadOwnership:

    def test_owner_can_download_own_document(self, api_client, student_user, student_document):
        """The student who owns the document should be able to download it."""
        api_client.force_authenticate(user=student_user)
        response = api_client.get(_download_url(student_document.id))
        assert response.status_code == status.HTTP_200_OK
        assert "Content-Disposition" in response
        assert "attachment" in response["Content-Disposition"]

    def test_mentor_owner_can_download_own_document(self, api_client, mentor_user, mentor_document):
        """The mentor who owns the document should be able to download it."""
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get(_download_url(mentor_document.id))
        assert response.status_code == status.HTTP_200_OK

    def test_non_owner_cannot_download(self, api_client, other_user, student_document):
        """A non-owner, non-staff user should be denied."""
        api_client.force_authenticate(user=other_user)
        response = api_client.get(_download_url(student_document.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestDocumentDownloadStaffAccess:

    def test_staff_can_download_any_student_document(
        self, api_client, staff_user, student_document
    ):
        """Staff should be able to download any document."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.get(_download_url(student_document.id))
        assert response.status_code == status.HTTP_200_OK

    def test_staff_can_download_any_mentor_document(
        self, api_client, staff_user, mentor_document
    ):
        """Staff should be able to download mentor documents too."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.get(_download_url(mentor_document.id))
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestDocumentDownloadNotFound:

    def test_nonexistent_document_returns_404(self, api_client, student_user):
        """Requesting a document ID that does not exist should return 404."""
        api_client.force_authenticate(user=student_user)
        fake_id = uuid.uuid4()
        response = api_client.get(_download_url(fake_id))
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestDocumentDownloadAuthentication:

    def test_unauthenticated_user_gets_401(self, api_client, student_document):
        """Unauthenticated requests should receive 401."""
        response = api_client.get(_download_url(student_document.id))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestDocumentDownloadMentorResearchAccess:
    """
    A mentor whose research the student applied to (with a non-cancelled /
    non-removed application) should be able to download the student's documents.
    """

    def test_mentor_with_active_application_can_download(
        self, api_client, mentor_user, mentor_profile, student_user, student_document
    ):
        """Mentor with a pending application from the student can download."""
        research = Research.objects.create(
            owner=mentor_user,
            researchName="Test Research",
            description="desc",
            status=Research.StatusChoices.OPEN,
        )
        ResearchApplication.objects.create(
            research=research,
            applicant=student_user,
            status=ResearchApplication.Status.PENDING,
        )

        api_client.force_authenticate(user=mentor_user)
        response = api_client.get(_download_url(student_document.id))
        assert response.status_code == status.HTTP_200_OK

    def test_mentor_with_approved_application_can_download(
        self, api_client, mentor_user, mentor_profile, student_user, student_document
    ):
        """Mentor with an approved application from the student can download."""
        research = Research.objects.create(
            owner=mentor_user,
            researchName="Test Research 2",
            description="desc",
            status=Research.StatusChoices.OPEN,
        )
        ResearchApplication.objects.create(
            research=research,
            applicant=student_user,
            status=ResearchApplication.Status.APPROVED,
        )

        api_client.force_authenticate(user=mentor_user)
        response = api_client.get(_download_url(student_document.id))
        assert response.status_code == status.HTTP_200_OK

    def test_mentor_with_cancelled_application_cannot_download(
        self, api_client, mentor_user, mentor_profile, student_user, student_document
    ):
        """Cancelled applications should NOT grant download access."""
        research = Research.objects.create(
            owner=mentor_user,
            researchName="Test Research Cancelled",
            description="desc",
            status=Research.StatusChoices.OPEN,
        )
        ResearchApplication.objects.create(
            research=research,
            applicant=student_user,
            status=ResearchApplication.Status.CANCELLED,
        )

        api_client.force_authenticate(user=mentor_user)
        response = api_client.get(_download_url(student_document.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_mentor_with_removed_application_cannot_download(
        self, api_client, mentor_user, mentor_profile, student_user, student_document
    ):
        """Removed applications should NOT grant download access."""
        research = Research.objects.create(
            owner=mentor_user,
            researchName="Test Research Removed",
            description="desc",
            status=Research.StatusChoices.OPEN,
        )
        ResearchApplication.objects.create(
            research=research,
            applicant=student_user,
            status=ResearchApplication.Status.REMOVED,
        )

        api_client.force_authenticate(user=mentor_user)
        response = api_client.get(_download_url(student_document.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unrelated_mentor_cannot_download_student_document(
        self, api_client, other_user, student_document
    ):
        """A mentor who has no research connection to the student should be denied."""
        MentorProfile.objects.create(user=other_user)
        api_client.force_authenticate(user=other_user)
        response = api_client.get(_download_url(student_document.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_mentor_cannot_download_other_mentor_document_via_research(
        self, api_client, mentor_user, mentor_profile, mentor_document
    ):
        """The research-application path only applies to student documents,
        not mentor documents. A different mentor should be denied."""
        # Create another mentor who owns mentor_document
        # mentor_user tries to download mentor_document (owned by mentor_profile/mentor_user)
        # This test uses a third user trying to access mentor_document
        third_user = User.objects.create_user(
            email="third-mentor@example.com",
            password="TestPass123!",
            firstName="Third",
            lastName="Mentor",
            email_verified=True,
        )
        MentorProfile.objects.create(user=third_user)

        api_client.force_authenticate(user=third_user)
        response = api_client.get(_download_url(mentor_document.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN
