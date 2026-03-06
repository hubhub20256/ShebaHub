from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.profiles.models import MentorProfile
from apps.research.models import Research, ResearchApplication

User = get_user_model()


class ContractDownloadPermissionTestCase(APITestCase):
    """Tests for secure contract file download permissions."""

    def setUp(self):
        # Create mentor user with MentorProfile
        self.mentor = User.objects.create_user(
            email='mentor@example.com',
            password='TestPassword123!',
            firstName='Mentor',
            lastName='User',
        )
        MentorProfile.objects.create(user=self.mentor)

        # Create research with a dummy contract file
        dummy_file = SimpleUploadedFile(
            'contract.pdf', b'%PDF-1.4 dummy content', content_type='application/pdf'
        )
        self.research = Research.objects.create(
            owner=self.mentor,
            researchName='Test Research Project',
            description='A test research project for contract testing.',
            status='open',
            contract=dummy_file,
        )

        # Create student users
        self.approved_student = User.objects.create_user(
            email='approved@example.com',
            password='TestPassword123!',
            firstName='Approved',
            lastName='Student',
        )
        self.rejected_student = User.objects.create_user(
            email='rejected@example.com',
            password='TestPassword123!',
            firstName='Rejected',
            lastName='Student',
        )
        self.pending_student = User.objects.create_user(
            email='pending@example.com',
            password='TestPassword123!',
            firstName='Pending',
            lastName='Student',
        )
        self.unrelated_user = User.objects.create_user(
            email='unrelated@example.com',
            password='TestPassword123!',
            firstName='Unrelated',
            lastName='User',
        )

        # Create applications with different statuses
        ResearchApplication.objects.create(
            research=self.research,
            applicant=self.approved_student,
            status=ResearchApplication.Status.APPROVED,
        )
        ResearchApplication.objects.create(
            research=self.research,
            applicant=self.rejected_student,
            status=ResearchApplication.Status.REJECTED,
        )
        ResearchApplication.objects.create(
            research=self.research,
            applicant=self.pending_student,
            status=ResearchApplication.Status.PENDING,
        )

        self.url = reverse('research-contract-download', args=[self.research.id])

    def test_owner_can_download_contract(self):
        self.client.force_authenticate(user=self.mentor)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_approved_applicant_can_download(self):
        self.client.force_authenticate(user=self.approved_student)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rejected_applicant_cannot_download(self):
        self.client.force_authenticate(user=self.rejected_student)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pending_applicant_cannot_download(self):
        self.client.force_authenticate(user=self.pending_student)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_download(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unrelated_user_cannot_download(self):
        self.client.force_authenticate(user=self.unrelated_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
