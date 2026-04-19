"""
Tests for PDF-only document upload restriction (Task 4).

Covers:
- Valid PDF upload accepted
- JPG file rejected
- DOC file rejected
- Incorrect MIME type (fake extension) rejected via magic bytes
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import StudentProfile, Institution

User = get_user_model()

STUDENT_DOCS_URL = '/api/profiles/student/me/documents/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name='Test University', name_he='אוניברסיטת בדיקה', is_active=True,
    )


@pytest.fixture
def student_user(db, institution):
    user = User.objects.create_user(
        email='pdf-test@example.com', password='TestPass123!',
        firstName='PDF', lastName='Tester', email_verified=True,
    )
    StudentProfile.objects.create(user=user, institution=institution)
    return user


@pytest.fixture
def auth_student(api_client, student_user):
    api_client.force_authenticate(user=student_user)
    return api_client


@pytest.mark.django_db
class TestPDFOnlyUpload:

    def test_valid_pdf_accepted(self, auth_student):
        """A valid PDF file should be accepted."""
        pdf_content = b'%PDF-1.4 test content for validation'
        pdf_file = SimpleUploadedFile('cv.pdf', pdf_content, content_type='application/pdf')

        response = auth_student.post(STUDENT_DOCS_URL, {
            'file': pdf_file,
            'document_type': 'CV',
        }, format='multipart')
        assert response.status_code == status.HTTP_201_CREATED

    def test_jpg_rejected(self, auth_student):
        """A JPG file should be rejected (only PDF allowed)."""
        jpg_content = b'\xff\xd8\xff\xe0' + b'\x00' * 100
        jpg_file = SimpleUploadedFile('photo.jpg', jpg_content, content_type='image/jpeg')

        response = auth_student.post(STUDENT_DOCS_URL, {
            'file': jpg_file,
            'document_type': 'OTHER',
        }, format='multipart')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_doc_rejected(self, auth_student):
        """A DOC file should be rejected (only PDF allowed)."""
        doc_content = b'\xd0\xcf\x11\xe0' + b'\x00' * 100
        doc_file = SimpleUploadedFile('resume.doc', doc_content, content_type='application/msword')

        response = auth_student.post(STUDENT_DOCS_URL, {
            'file': doc_file,
            'document_type': 'CV',
        }, format='multipart')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_docx_rejected(self, auth_student):
        """A DOCX file should be rejected (only PDF allowed)."""
        docx_content = b'PK\x03\x04' + b'\x00' * 100
        docx_file = SimpleUploadedFile('resume.docx', docx_content, content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')

        response = auth_student.post(STUDENT_DOCS_URL, {
            'file': docx_file,
            'document_type': 'CV',
        }, format='multipart')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_png_rejected(self, auth_student):
        """A PNG file should be rejected (only PDF allowed)."""
        png_content = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100
        png_file = SimpleUploadedFile('image.png', png_content, content_type='image/png')

        response = auth_student.post(STUDENT_DOCS_URL, {
            'file': png_file,
            'document_type': 'OTHER',
        }, format='multipart')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_fake_pdf_extension_wrong_content_rejected(self, auth_student):
        """A file with .pdf extension but non-PDF content should be rejected
        by magic bytes validation."""
        fake_pdf = SimpleUploadedFile('fake.pdf', b'This is not a PDF', content_type='application/pdf')

        response = auth_student.post(STUDENT_DOCS_URL, {
            'file': fake_pdf,
            'document_type': 'CV',
        }, format='multipart')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
