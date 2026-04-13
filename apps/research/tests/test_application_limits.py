"""
Tests for research application limit enforcement (Task 2).

Covers:
- Valid application submission
- Submission blocked when accepting_applications=False
- Mentor cannot bypass accepting_applications restriction
- Application limits enforced for all users
- Team capacity enforcement
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.admin_panel.models import SiteSetting
from apps.profiles.models import MentorProfile, StudentProfile, Institution
from apps.research.models import Research, ResearchApplication

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name='Test Hospital', name_he='בית חולים לבדיקה', is_active=True,
    )


@pytest.fixture
def mentor_owner(db):
    user = User.objects.create_user(
        email='owner@example.com', password='TestPass123!',
        firstName='Owner', lastName='Mentor', email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace='Sheba')
    return user


@pytest.fixture
def research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner, researchName='Test Research',
        description='A test research project.', status='open',
        accepting_applications=True,
    )


@pytest.fixture
def student_applicant(db, institution):
    user = User.objects.create_user(
        email='student@example.com', password='TestPass123!',
        firstName='Student', lastName='Applicant', email_verified=True,
    )
    StudentProfile.objects.create(user=user, institution=institution, isAvailableForResearch=True)
    return user


@pytest.fixture
def mentor_applicant(db):
    user = User.objects.create_user(
        email='mentor_applicant@example.com', password='TestPass123!',
        firstName='Mentor', lastName='Applicant', email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace='Other Hospital')
    return user


@pytest.mark.django_db
class TestApplicationLimits:

    def _apply_url(self, research_id):
        return f'/api/research/{research_id}/apply/'

    def test_valid_student_application(self, api_client, research, student_applicant):
        """A student with a profile can apply to an open research."""
        api_client.force_authenticate(user=student_applicant)
        response = api_client.post(self._apply_url(research.id))
        assert response.status_code == status.HTTP_201_CREATED

    def test_valid_mentor_application(self, api_client, research, mentor_applicant):
        """A mentor can apply to an open research."""
        api_client.force_authenticate(user=mentor_applicant)
        response = api_client.post(self._apply_url(research.id))
        assert response.status_code == status.HTTP_201_CREATED

    def test_application_blocked_when_not_accepting(self, api_client, research, student_applicant):
        """Applications blocked when research.accepting_applications=False."""
        research.accepting_applications = False
        research.save(update_fields=['accepting_applications'])

        api_client.force_authenticate(user=student_applicant)
        response = api_client.post(self._apply_url(research.id))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_mentor_cannot_bypass_accepting_applications(self, api_client, research, mentor_applicant):
        """Mentor must NOT bypass accepting_applications=False (was a bug)."""
        research.accepting_applications = False
        research.save(update_fields=['accepting_applications'])

        api_client.force_authenticate(user=mentor_applicant)
        response = api_client.post(self._apply_url(research.id))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_team_full_blocks_application(self, api_client, research, student_applicant, institution):
        """When team is full, new applications are blocked."""
        research.teamSize = 1
        research.save(update_fields=['teamSize'])

        # Fill the team with another student
        filler = User.objects.create_user(
            email='filler@example.com', password='TestPass123!',
            firstName='Filler', lastName='Student', email_verified=True,
        )
        StudentProfile.objects.create(user=filler, institution=institution)
        ResearchApplication.objects.create(
            research=research, applicant=filler,
            status=ResearchApplication.Status.APPROVED,
        )

        api_client.force_authenticate(user=student_applicant)
        response = api_client.post(self._apply_url(research.id))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_mentor_blocked_when_team_full(self, api_client, research, mentor_applicant, institution):
        """Mentor should also be blocked when team is full (no bypass)."""
        research.teamSize = 1
        research.save(update_fields=['teamSize'])

        filler = User.objects.create_user(
            email='filler2@example.com', password='TestPass123!',
            firstName='Filler', lastName='Student', email_verified=True,
        )
        StudentProfile.objects.create(user=filler, institution=institution)
        ResearchApplication.objects.create(
            research=research, applicant=filler,
            status=ResearchApplication.Status.APPROVED,
        )

        api_client.force_authenticate(user=mentor_applicant)
        response = api_client.post(self._apply_url(research.id))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_max_applications_per_student_enforced(self, api_client, student_applicant, mentor_owner):
        """max_applications_per_student should block additional applications."""
        site = SiteSetting.load()
        site.max_applications_per_student = 1
        site.save()

        # Create two researches
        r1 = Research.objects.create(
            owner=mentor_owner, researchName='Research 1',
            description='First research.', status='open',
        )
        r2 = Research.objects.create(
            owner=mentor_owner, researchName='Research 2',
            description='Second research.', status='open',
        )

        api_client.force_authenticate(user=student_applicant)

        # First application should succeed
        resp1 = api_client.post(self._apply_url(r1.id))
        assert resp1.status_code == status.HTTP_201_CREATED

        # Second should be blocked by limit
        resp2 = api_client.post(self._apply_url(r2.id))
        assert resp2.status_code == status.HTTP_400_BAD_REQUEST

    def test_owner_cannot_apply_to_own_research(self, api_client, research, mentor_owner):
        """Research owner cannot apply to their own research."""
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(self._apply_url(research.id))
        assert response.status_code == status.HTTP_400_BAD_REQUEST
