"""
Tests for the invite_to_research role-aware invitation system (Change 3).

Covers:
- Invite with role=student succeeds for users with student profile
- Invite with role=mentor succeeds and skips availability check
- Invite with role=student for user without student profile returns 400
- Invite with role=mentor for user without mentor profile returns 400
- Invite without role (backwards compat) continues to work
- invited_role is stored on the ResearchApplication
- invited_role appears in serializer output

Also covers Change 2A:
- get_institution falls back to mentor workplace
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import Institution, MentorProfile, StudentProfile, AcademicRank
from apps.research.models import Research, ResearchApplication
from apps.research.serializers import ResearchApplicationSerializer

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
        name='Sheba Medical Center', name_he='מרכז רפואי שיבא', is_active=True,
    )


@pytest.fixture
def mentor_owner(db):
    """Mentor user who owns a research."""
    user = User.objects.create_user(
        email='owner@example.com',
        password='TestPass123!',
        firstName='Owner',
        lastName='Mentor',
        email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace='Sheba Hospital')
    return user


@pytest.fixture
def research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner,
        researchName='Test Research',
        description='A research for testing invitations.',
        status='open',
    )


@pytest.fixture
def dual_role_target(db, institution):
    """Target user with both student and mentor profiles."""
    user = User.objects.create_user(
        email='dual_target@example.com',
        password='TestPass123!',
        firstName='DualTarget',
        lastName='User',
        email_verified=True,
    )
    StudentProfile.objects.create(user=user, institution=institution, isAvailableForResearch=True)
    MentorProfile.objects.create(user=user, workplace='Some Hospital')
    return user


@pytest.fixture
def student_only_target(db, institution):
    """Target user with only a student profile."""
    user = User.objects.create_user(
        email='student_target@example.com',
        password='TestPass123!',
        firstName='StudentTarget',
        lastName='User',
        email_verified=True,
    )
    StudentProfile.objects.create(user=user, institution=institution, isAvailableForResearch=True)
    return user


@pytest.fixture
def mentor_only_target(db):
    """Target user with only a mentor profile."""
    user = User.objects.create_user(
        email='mentor_target@example.com',
        password='TestPass123!',
        firstName='MentorTarget',
        lastName='User',
        email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace='Hospital X')
    return user


@pytest.fixture
def unavailable_student_target(db, institution):
    """Target user with student profile NOT available for research."""
    user = User.objects.create_user(
        email='unavailable@example.com',
        password='TestPass123!',
        firstName='Unavailable',
        lastName='Student',
        email_verified=True,
    )
    StudentProfile.objects.create(user=user, institution=institution, isAvailableForResearch=False)
    MentorProfile.objects.create(user=user, workplace='Hospital Y')
    return user


@pytest.fixture
def auth_owner_client(api_client, mentor_owner):
    api_client.force_authenticate(user=mentor_owner)
    return api_client


# ---------------------------------------------------------------------------
# Invite with role tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestInviteWithRole:
    def _invite_url(self, research_id):
        return f'/api/research/me/{research_id}/invite/'

    def test_invite_with_role_student_succeeds(self, auth_owner_client, research, dual_role_target):
        url = self._invite_url(research.id)
        response = auth_owner_client.post(url, {'user_id': str(dual_role_target.id), 'role': 'student'})
        assert response.status_code == status.HTTP_201_CREATED
        app = ResearchApplication.objects.get(research=research, applicant=dual_role_target)
        assert app.invited_role == 'student'
        assert app.status == ResearchApplication.Status.INVITED

    def test_invite_with_role_mentor_succeeds(self, auth_owner_client, research, dual_role_target):
        url = self._invite_url(research.id)
        response = auth_owner_client.post(url, {'user_id': str(dual_role_target.id), 'role': 'mentor'})
        assert response.status_code == status.HTTP_201_CREATED
        app = ResearchApplication.objects.get(research=research, applicant=dual_role_target)
        assert app.invited_role == 'mentor'

    def test_invite_without_role_backwards_compat(self, auth_owner_client, research, student_only_target):
        """Existing invite flow (no role specified) should continue to work."""
        url = self._invite_url(research.id)
        response = auth_owner_client.post(url, {'user_id': str(student_only_target.id)})
        assert response.status_code == status.HTTP_201_CREATED
        app = ResearchApplication.objects.get(research=research, applicant=student_only_target)
        assert app.invited_role == ''

    def test_invite_role_student_no_student_profile_returns_400(self, auth_owner_client, research, mentor_only_target):
        """Invite with role=student for user without student profile → 400."""
        url = self._invite_url(research.id)
        response = auth_owner_client.post(url, {'user_id': str(mentor_only_target.id), 'role': 'student'})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invite_role_mentor_no_mentor_profile_returns_400(self, auth_owner_client, research, student_only_target):
        """Invite with role=mentor for user without mentor profile → 400."""
        url = self._invite_url(research.id)
        response = auth_owner_client.post(url, {'user_id': str(student_only_target.id), 'role': 'mentor'})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invite_role_mentor_skips_availability_check(self, auth_owner_client, research, unavailable_student_target):
        """Invite with role=mentor should skip isAvailableForResearch check."""
        url = self._invite_url(research.id)
        response = auth_owner_client.post(url, {
            'user_id': str(unavailable_student_target.id),
            'role': 'mentor',
        })
        assert response.status_code == status.HTTP_201_CREATED

    def test_invite_without_role_checks_availability(self, auth_owner_client, research, unavailable_student_target):
        """Invite without role should enforce isAvailableForResearch check."""
        url = self._invite_url(research.id)
        response = auth_owner_client.post(url, {
            'user_id': str(unavailable_student_target.id),
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_role_returns_400(self, auth_owner_client, research, dual_role_target):
        """Invalid role value returns 400."""
        url = self._invite_url(research.id)
        response = auth_owner_client.post(url, {'user_id': str(dual_role_target.id), 'role': 'admin'})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invited_role_in_serializer_output(self, auth_owner_client, research, dual_role_target):
        """invited_role should appear in the serialized response."""
        url = self._invite_url(research.id)
        response = auth_owner_client.post(url, {'user_id': str(dual_role_target.id), 'role': 'mentor'})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['invited_role'] == 'mentor'


# ---------------------------------------------------------------------------
# Institution fallback tests (Change 2A)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestInstitutionFallback:
    def test_mentor_only_applicant_shows_workplace_as_institution(self, db):
        """
        ResearchApplicationSerializer.get_institution should fall back to
        mentor.workplace when the applicant has no student profile.
        """
        mentor_user = User.objects.create_user(
            email='mentorapp@example.com',
            password='TestPass123!',
            firstName='MentorApp',
            lastName='User',
        )
        MentorProfile.objects.create(user=mentor_user, workplace='Sheba Research Center')

        owner = User.objects.create_user(
            email='resowner@example.com',
            password='TestPass123!',
            firstName='ResOwner',
            lastName='User',
        )
        MentorProfile.objects.create(user=owner)
        research = Research.objects.create(
            owner=owner,
            researchName='Fallback Test',
            description='Testing institution fallback.',
            status='open',
        )
        app = ResearchApplication.objects.create(
            research=research,
            applicant=mentor_user,
            status=ResearchApplication.Status.APPROVED,
        )

        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = owner

        serializer = ResearchApplicationSerializer(app, context={'request': request})
        assert serializer.data['institution'] == 'Sheba Research Center'

    def test_student_with_institution_uses_student_institution(self, db, institution):
        """
        When applicant has a student profile with an institution,
        get_institution should return the student institution, not mentor workplace.
        """
        user = User.objects.create_user(
            email='studapp@example.com',
            password='TestPass123!',
            firstName='StudApp',
            lastName='User',
        )
        StudentProfile.objects.create(user=user, institution=institution)
        MentorProfile.objects.create(user=user, workplace='Some Other Hospital')

        owner = User.objects.create_user(
            email='resowner2@example.com',
            password='TestPass123!',
            firstName='Owner2',
            lastName='User',
        )
        MentorProfile.objects.create(user=owner)
        research = Research.objects.create(
            owner=owner,
            researchName='Priority Test',
            description='Testing institution priority.',
            status='open',
        )
        app = ResearchApplication.objects.create(
            research=research,
            applicant=user,
            status=ResearchApplication.Status.APPROVED,
        )

        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = owner

        serializer = ResearchApplicationSerializer(app, context={'request': request})
        # Should return student institution, NOT mentor workplace
        assert serializer.data['institution'] == 'מרכז רפואי שיבא'
