"""
Tests for the complete research application lifecycle.

Covers:
- Approve: owner can approve pending application, notification created
- Approve: non-owner gets 403/404
- Approve: permitted mentor (can_approve=True) can approve
- Reject: owner can reject application, notification created
- Reject: permitted mentor (can_approve=True) can reject
- Remove: owner can remove approved member, status becomes "removed"
- Remove: non-owner gets 403/404
- Cancel: applicant cancels own pending application
- Cancel: cancelling an approved application also works (sets to cancelled)
- Leave: approved member leaves, status becomes cancelled
- Leave: non-approved member cannot leave
- Permissions: owner can set can_edit, can_approve, etc.
- Permissions: non-owner cannot update permissions
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.admin_panel.models import SiteSetting
from apps.profiles.models import MentorProfile, StudentProfile, Institution
from apps.research.models import Research, ResearchApplication, ContactMessage

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
        name='Test Hospital', name_he='בית חולים לבדיקה', is_active=True,
    )


@pytest.fixture
def mentor_owner(db):
    """Mentor user who owns a research."""
    user = User.objects.create_user(
        email='lifecycle_owner@example.com', password='TestPass123!',
        firstName='Owner', lastName='Mentor', email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace='Sheba Hospital')
    return user


@pytest.fixture
def student_applicant(db, institution):
    """Student who applies to a research."""
    user = User.objects.create_user(
        email='lifecycle_student@example.com', password='TestPass123!',
        firstName='Student', lastName='Applicant', email_verified=True,
    )
    StudentProfile.objects.create(user=user, institution=institution, isAvailableForResearch=True)
    return user


@pytest.fixture
def other_mentor(db):
    """Another mentor who is NOT the research owner."""
    user = User.objects.create_user(
        email='lifecycle_other_mentor@example.com', password='TestPass123!',
        firstName='Other', lastName='Mentor', email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace='Other Hospital')
    return user


@pytest.fixture
def random_user(db):
    """An unrelated user with no profile — cannot manage research."""
    return User.objects.create_user(
        email='lifecycle_random@example.com', password='TestPass123!',
        firstName='Random', lastName='User', email_verified=True,
    )


@pytest.fixture
def research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner, researchName='Lifecycle Research',
        description='A research for lifecycle tests.', status='open',
        moderation_status='approved', accepting_applications=True,
    )


@pytest.fixture
def pending_application(db, research, student_applicant):
    return ResearchApplication.objects.create(
        research=research, applicant=student_applicant,
        status=ResearchApplication.Status.PENDING,
    )


@pytest.fixture
def approved_application(db, research, student_applicant):
    return ResearchApplication.objects.create(
        research=research, applicant=student_applicant,
        status=ResearchApplication.Status.APPROVED,
    )


# ---------------------------------------------------------------------------
# Approve application tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestApproveApplication:
    def _approve_url(self, research_id, application_id):
        return f'/api/research/me/{research_id}/applications/{application_id}/approve/'

    def test_owner_can_approve_pending_application(self, api_client, mentor_owner, research, pending_application):
        """Research owner can approve a pending application."""
        api_client.force_authenticate(user=mentor_owner)
        url = self._approve_url(research.id, pending_application.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'approved'
        pending_application.refresh_from_db()
        assert pending_application.status == ResearchApplication.Status.APPROVED

    def test_approve_creates_notification(self, api_client, mentor_owner, research, pending_application, student_applicant):
        """Approving an application creates an in-app notification for the applicant."""
        api_client.force_authenticate(user=mentor_owner)
        url = self._approve_url(research.id, pending_application.id)
        api_client.post(url)
        notification = ContactMessage.objects.filter(
            recipient=student_applicant,
            notification_type=ContactMessage.NotificationType.APPLICATION_APPROVED,
        ).first()
        assert notification is not None
        assert research.researchName in notification.subject

    def test_approve_with_note(self, api_client, mentor_owner, research, pending_application):
        """Owner can include a note when approving."""
        api_client.force_authenticate(user=mentor_owner)
        url = self._approve_url(research.id, pending_application.id)
        response = api_client.post(url, {'note': 'Welcome aboard!'}, format='json')
        assert response.status_code == status.HTTP_200_OK
        pending_application.refresh_from_db()
        assert pending_application.mentor_note == 'Welcome aboard!'

    def test_non_owner_cannot_approve(self, api_client, random_user, research, pending_application):
        """A user who is not the owner or permitted mentor gets 404."""
        api_client.force_authenticate(user=random_user)
        url = self._approve_url(research.id, pending_application.id)
        response = api_client.post(url)
        # random_user is not a mentor at all, so require_mentor returns 403
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_other_mentor_without_permission_cannot_approve(self, api_client, other_mentor, research, pending_application):
        """A mentor without can_approve permission cannot approve."""
        # Give other_mentor an approved application but no can_approve
        ResearchApplication.objects.create(
            research=research, applicant=other_mentor,
            status=ResearchApplication.Status.APPROVED,
            can_approve=False,
        )
        api_client.force_authenticate(user=other_mentor)
        url = self._approve_url(research.id, pending_application.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_permitted_mentor_can_approve(self, api_client, other_mentor, research, pending_application):
        """A mentor with can_approve=True can approve applications."""
        ResearchApplication.objects.create(
            research=research, applicant=other_mentor,
            status=ResearchApplication.Status.APPROVED,
            can_approve=True,
        )
        api_client.force_authenticate(user=other_mentor)
        url = self._approve_url(research.id, pending_application.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'approved'

    def test_approve_nonexistent_application_returns_404(self, api_client, mentor_owner, research):
        """Approving a non-existent application returns 404."""
        api_client.force_authenticate(user=mentor_owner)
        url = self._approve_url(research.id, 99999)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Reject application tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestRejectApplication:
    def _reject_url(self, research_id, application_id):
        return f'/api/research/me/{research_id}/applications/{application_id}/reject/'

    def test_owner_can_reject_application(self, api_client, mentor_owner, research, pending_application):
        """Research owner can reject a pending application."""
        api_client.force_authenticate(user=mentor_owner)
        url = self._reject_url(research.id, pending_application.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'rejected'
        pending_application.refresh_from_db()
        assert pending_application.status == ResearchApplication.Status.REJECTED

    def test_reject_creates_notification(self, api_client, mentor_owner, research, pending_application, student_applicant):
        """Rejecting an application creates an in-app notification for the applicant."""
        api_client.force_authenticate(user=mentor_owner)
        url = self._reject_url(research.id, pending_application.id)
        api_client.post(url)
        notification = ContactMessage.objects.filter(
            recipient=student_applicant,
            notification_type=ContactMessage.NotificationType.APPLICATION_REJECTED,
        ).first()
        assert notification is not None

    def test_reject_with_note(self, api_client, mentor_owner, research, pending_application):
        """Owner can include a note when rejecting."""
        api_client.force_authenticate(user=mentor_owner)
        url = self._reject_url(research.id, pending_application.id)
        response = api_client.post(url, {'note': 'Sorry, not a fit.'}, format='json')
        assert response.status_code == status.HTTP_200_OK
        pending_application.refresh_from_db()
        assert pending_application.mentor_note == 'Sorry, not a fit.'

    def test_permitted_mentor_can_reject(self, api_client, other_mentor, research, pending_application):
        """A mentor with can_approve=True can reject applications."""
        ResearchApplication.objects.create(
            research=research, applicant=other_mentor,
            status=ResearchApplication.Status.APPROVED,
            can_approve=True,
        )
        api_client.force_authenticate(user=other_mentor)
        url = self._reject_url(research.id, pending_application.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'rejected'

    def test_non_owner_cannot_reject(self, api_client, random_user, research, pending_application):
        """A user who is not the owner or permitted mentor cannot reject."""
        api_client.force_authenticate(user=random_user)
        url = self._reject_url(research.id, pending_application.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# Remove application tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestRemoveApplication:
    def _remove_url(self, research_id, application_id):
        return f'/api/research/me/{research_id}/applications/{application_id}/remove/'

    def test_owner_can_remove_approved_member(self, api_client, mentor_owner, research, approved_application):
        """Owner can remove an approved member; status changes to 'removed'."""
        api_client.force_authenticate(user=mentor_owner)
        url = self._remove_url(research.id, approved_application.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'removed'
        approved_application.refresh_from_db()
        assert approved_application.status == ResearchApplication.Status.REMOVED

    def test_remove_creates_notification(self, api_client, mentor_owner, research, approved_application, student_applicant):
        """Removing a member creates an in-app notification."""
        api_client.force_authenticate(user=mentor_owner)
        url = self._remove_url(research.id, approved_application.id)
        api_client.post(url)
        notification = ContactMessage.objects.filter(
            recipient=student_applicant,
            notification_type=ContactMessage.NotificationType.APPLICATION_REMOVED,
        ).first()
        assert notification is not None

    def test_cannot_remove_non_approved_member(self, api_client, mentor_owner, research, pending_application):
        """Cannot remove a member whose status is not 'approved'."""
        api_client.force_authenticate(user=mentor_owner)
        url = self._remove_url(research.id, pending_application.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_non_owner_cannot_remove(self, api_client, random_user, research, approved_application):
        """A user who is not the owner cannot remove members."""
        api_client.force_authenticate(user=random_user)
        url = self._remove_url(research.id, approved_application.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_permitted_mentor_can_remove_student(self, api_client, other_mentor, research, approved_application):
        """A mentor with can_remove=True can remove non-mentor members."""
        ResearchApplication.objects.create(
            research=research, applicant=other_mentor,
            status=ResearchApplication.Status.APPROVED,
            can_remove=True,
        )
        api_client.force_authenticate(user=other_mentor)
        url = self._remove_url(research.id, approved_application.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'removed'

    def test_only_owner_can_remove_mentors(self, api_client, other_mentor, research, mentor_owner):
        """Non-owner permitted mentor cannot remove another mentor."""
        # Create another mentor to be the target
        target_mentor = User.objects.create_user(
            email='target_mentor@example.com', password='TestPass123!',
            firstName='Target', lastName='Mentor', email_verified=True,
        )
        MentorProfile.objects.create(user=target_mentor, workplace='Hospital Z')
        target_app = ResearchApplication.objects.create(
            research=research, applicant=target_mentor,
            status=ResearchApplication.Status.APPROVED,
        )

        # Give other_mentor can_remove permission
        ResearchApplication.objects.create(
            research=research, applicant=other_mentor,
            status=ResearchApplication.Status.APPROVED,
            can_remove=True,
        )

        api_client.force_authenticate(user=other_mentor)
        url = self._remove_url(research.id, target_app.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_owner_can_remove_mentors(self, api_client, mentor_owner, research):
        """Owner can remove mentor members."""
        target_mentor = User.objects.create_user(
            email='target_mentor2@example.com', password='TestPass123!',
            firstName='Target2', lastName='Mentor', email_verified=True,
        )
        MentorProfile.objects.create(user=target_mentor, workplace='Hospital Z')
        target_app = ResearchApplication.objects.create(
            research=research, applicant=target_mentor,
            status=ResearchApplication.Status.APPROVED,
        )

        api_client.force_authenticate(user=mentor_owner)
        url = self._remove_url(research.id, target_app.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'removed'


# ---------------------------------------------------------------------------
# Cancel application tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCancelApplication:
    def _cancel_url(self, research_id):
        return f'/api/research/{research_id}/cancel/'

    def test_applicant_can_cancel_pending_application(self, api_client, student_applicant, research, pending_application):
        """Applicant can cancel their own pending application."""
        api_client.force_authenticate(user=student_applicant)
        url = self._cancel_url(research.id)
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'cancelled'
        pending_application.refresh_from_db()
        assert pending_application.status == ResearchApplication.Status.CANCELLED

    def test_applicant_can_cancel_approved_application(self, api_client, student_applicant, research, approved_application):
        """The cancel endpoint sets status to cancelled regardless of current status."""
        api_client.force_authenticate(user=student_applicant)
        url = self._cancel_url(research.id)
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'cancelled'

    def test_cancel_nonexistent_application_returns_404(self, api_client, student_applicant, research):
        """If no application exists, cancelling returns 404."""
        api_client.force_authenticate(user=student_applicant)
        url = self._cancel_url(research.id)
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cancel_nonexistent_research_returns_404(self, api_client, student_applicant):
        """Cancelling an application for a non-existent research returns 404."""
        api_client.force_authenticate(user=student_applicant)
        url = self._cancel_url(99999)
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Leave research tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestLeaveResearch:
    def _leave_url(self, research_id):
        return f'/api/research/{research_id}/leave/'

    def test_approved_member_can_leave(self, api_client, student_applicant, research, approved_application):
        """An approved member can leave the research; status becomes 'cancelled'."""
        api_client.force_authenticate(user=student_applicant)
        url = self._leave_url(research.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'cancelled'
        approved_application.refresh_from_db()
        assert approved_application.status == ResearchApplication.Status.CANCELLED

    def test_leave_creates_notification_for_owner(self, api_client, student_applicant, research, approved_application, mentor_owner):
        """Leaving the research creates a notification for the owner."""
        api_client.force_authenticate(user=student_applicant)
        url = self._leave_url(research.id)
        api_client.post(url)
        notification = ContactMessage.objects.filter(
            recipient=mentor_owner,
            sender=student_applicant,
        ).first()
        assert notification is not None

    def test_non_approved_member_cannot_leave(self, api_client, student_applicant, research, pending_application):
        """A member with a non-approved status cannot leave."""
        api_client.force_authenticate(user=student_applicant)
        url = self._leave_url(research.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_leave_nonexistent_application_returns_404(self, api_client, student_applicant, research):
        """If no application exists, leaving returns 404."""
        api_client.force_authenticate(user=student_applicant)
        url = self._leave_url(research.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_leave_reopens_applications_when_team_was_full(self, api_client, student_applicant, research, approved_application):
        """When team was full and a member leaves, accepting_applications should reopen."""
        research.teamSize = 1
        research.accepting_applications = False
        research.save(update_fields=['teamSize', 'accepting_applications'])

        api_client.force_authenticate(user=student_applicant)
        url = self._leave_url(research.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        research.refresh_from_db()
        assert research.accepting_applications is True


# ---------------------------------------------------------------------------
# Update mentor permissions tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestUpdateMentorPermissions:
    def _permissions_url(self, research_id, application_id):
        return f'/api/research/me/{research_id}/applications/{application_id}/permissions/'

    def test_owner_can_set_permissions(self, api_client, mentor_owner, research, other_mentor):
        """Owner can set can_edit, can_approve, can_invite, can_remove, can_manage_chat."""
        app = ResearchApplication.objects.create(
            research=research, applicant=other_mentor,
            status=ResearchApplication.Status.APPROVED,
        )
        api_client.force_authenticate(user=mentor_owner)
        url = self._permissions_url(research.id, app.id)
        response = api_client.patch(url, {
            'can_edit': True,
            'can_approve': True,
            'can_invite': True,
            'can_remove': True,
            'can_manage_chat': True,
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        app.refresh_from_db()
        assert app.can_edit is True
        assert app.can_approve is True
        assert app.can_invite is True
        assert app.can_remove is True
        assert app.can_manage_chat is True

    def test_owner_can_revoke_permissions(self, api_client, mentor_owner, research, other_mentor):
        """Owner can revoke permissions."""
        app = ResearchApplication.objects.create(
            research=research, applicant=other_mentor,
            status=ResearchApplication.Status.APPROVED,
            can_edit=True, can_approve=True,
        )
        api_client.force_authenticate(user=mentor_owner)
        url = self._permissions_url(research.id, app.id)
        response = api_client.patch(url, {
            'can_edit': False,
            'can_approve': False,
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        app.refresh_from_db()
        assert app.can_edit is False
        assert app.can_approve is False

    def test_non_owner_cannot_update_permissions(self, api_client, other_mentor, research, student_applicant):
        """Non-owner mentor cannot update permissions (owner-only action)."""
        # other_mentor has approved app with all permissions
        ResearchApplication.objects.create(
            research=research, applicant=other_mentor,
            status=ResearchApplication.Status.APPROVED,
            can_edit=True, can_approve=True, can_invite=True, can_remove=True,
        )
        # Create a target app
        target_app = ResearchApplication.objects.create(
            research=research, applicant=student_applicant,
            status=ResearchApplication.Status.APPROVED,
        )
        api_client.force_authenticate(user=other_mentor)
        url = self._permissions_url(research.id, target_app.id)
        response = api_client.patch(url, {'can_edit': True}, format='json')
        # check_research_permission with permission_name=None returns 404 for non-owners
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_set_permissions_on_non_approved(self, api_client, mentor_owner, research, other_mentor):
        """Cannot update permissions on a non-approved application."""
        app = ResearchApplication.objects.create(
            research=research, applicant=other_mentor,
            status=ResearchApplication.Status.PENDING,
        )
        api_client.force_authenticate(user=mentor_owner)
        url = self._permissions_url(research.id, app.id)
        response = api_client.patch(url, {'can_edit': True}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_set_permissions_on_non_mentor(self, api_client, mentor_owner, research, approved_application):
        """Cannot update permissions on a student (non-mentor) application."""
        api_client.force_authenticate(user=mentor_owner)
        url = self._permissions_url(research.id, approved_application.id)
        response = api_client.patch(url, {'can_edit': True}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_cannot_update_permissions(self, api_client, research, other_mentor):
        """Unauthenticated user cannot update permissions."""
        app = ResearchApplication.objects.create(
            research=research, applicant=other_mentor,
            status=ResearchApplication.Status.APPROVED,
        )
        url = self._permissions_url(research.id, app.id)
        response = api_client.patch(url, {'can_edit': True}, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
