"""
Focused tests for the application + invitation email notifications.

Covers two helpers in apps.common.email_service and the two view paths
that trigger them:

- EmailService.send_new_application_email(mentor, applicant, research)
  triggered by POST /api/research/<id>/apply/
- EmailService.send_research_invitation_email(user, research, inviter=...)
  triggered by POST /api/research/me/<id>/invite/

Assertions check key tokens (recipient address, research name, inviter
name) — never the full Hebrew body, so future copy tweaks won't make
these tests brittle.
"""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.common.email_service import EmailService
from apps.profiles.models import Institution, MentorProfile, StudentProfile
from apps.research.models import Research, ResearchApplication

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures (mirrors the existing research-test fixture style)
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name="Email Notif Inst", name_he="מוסד התראות", is_active=True,
    )


@pytest.fixture
def mentor_owner(db):
    """Verified research owner — eligible to receive notifications."""
    user = User.objects.create_user(
        email="email_owner@example.com", password="TestPass123!",
        firstName="Owner", lastName="Mentor", email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace="Sheba Hospital")
    return user


@pytest.fixture
def applicant_student(db, institution):
    """Verified student applicant."""
    user = User.objects.create_user(
        email="email_student@example.com", password="TestPass123!",
        firstName="Sara", lastName="Cohen", email_verified=True,
    )
    StudentProfile.objects.create(
        user=user, institution=institution, isAvailableForResearch=True,
    )
    return user


@pytest.fixture
def invited_user(db, institution):
    """Verified user available to be invited."""
    user = User.objects.create_user(
        email="email_invitee@example.com", password="TestPass123!",
        firstName="Yoni", lastName="Levi", email_verified=True,
    )
    StudentProfile.objects.create(
        user=user, institution=institution, isAvailableForResearch=True,
    )
    return user


@pytest.fixture
def unverified_user(db, institution):
    """Has a profile but email_verified=False — verification gate triggers."""
    user = User.objects.create_user(
        email="email_unverified@example.com", password="TestPass123!",
        firstName="Un", lastName="Verified", email_verified=False,
    )
    StudentProfile.objects.create(
        user=user, institution=institution, isAvailableForResearch=True,
    )
    return user


@pytest.fixture
def research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner,
        researchName="Heart Imaging Study",
        description="Study used by email-notification tests.",
        researchArea="Cardiology",
        status="open",
        moderation_status="approved",
        accepting_applications=True,
    )


# ===========================================================================
# 1. send_new_application_email — direct helper
# ===========================================================================

@pytest.mark.django_db
class TestSendNewApplicationEmailHelper:
    def test_helper_sends_email_to_verified_owner(
        self, mentor_owner, applicant_student, research, mailoutbox
    ):
        result = EmailService.send_new_application_email(
            mentor_owner, applicant_student, research,
        )
        assert result is True
        assert len(mailoutbox) == 1
        msg = mailoutbox[0]
        assert msg.to == [mentor_owner.email]
        # Subject + body must reference the research and the applicant.
        assert research.researchName in msg.subject
        assert research.researchName in msg.body
        assert applicant_student.get_full_name() in msg.body

    def test_helper_skips_when_owner_not_verified(
        self, applicant_student, research, mailoutbox
    ):
        unverified_owner = User.objects.create_user(
            email="email_unverified_owner@example.com",
            password="TestPass123!",
            firstName="UnV", lastName="Owner",
            email_verified=False,
        )
        MentorProfile.objects.create(user=unverified_owner, workplace="Anywhere")

        result = EmailService.send_new_application_email(
            unverified_owner, applicant_student, research,
        )
        assert result is False
        assert len(mailoutbox) == 0


# ===========================================================================
# 2. POST /api/research/<id>/apply/ — integration
# ===========================================================================

@pytest.mark.django_db
class TestApplyTriggersApplicationEmail:
    def _apply_url(self, research_id):
        return f"/api/research/{research_id}/apply/"

    def test_apply_sends_email_to_research_owner(
        self,
        api_client,
        mentor_owner,
        applicant_student,
        research,
        mailoutbox,
    ):
        api_client.force_authenticate(user=applicant_student)
        response = api_client.post(self._apply_url(research.id), {}, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        # Filter to the application email we care about (in case _create_notification
        # ever starts emitting one too — today it only writes a ContactMessage row).
        recipients = [m for m in mailoutbox if mentor_owner.email in m.to]
        assert len(recipients) == 1
        msg = recipients[0]
        assert research.researchName in msg.subject
        assert research.researchName in msg.body
        assert applicant_student.get_full_name() in msg.body

    def test_apply_succeeds_when_send_mail_raises(
        self, api_client, mentor_owner, applicant_student, research
    ):
        """
        _safe_send wraps send_mail in try/except, so a transient SMTP failure
        must not break the apply flow. The application row should still be
        persisted with status=PENDING and the response should be 201.
        """
        api_client.force_authenticate(user=applicant_student)
        with patch(
            "apps.common.email_service.send_mail",
            side_effect=RuntimeError("smtp down"),
        ):
            response = api_client.post(
                self._apply_url(research.id), {}, format="json",
            )
        assert response.status_code == status.HTTP_201_CREATED
        app = ResearchApplication.objects.get(
            research=research, applicant=applicant_student,
        )
        assert app.status == ResearchApplication.Status.PENDING


# ===========================================================================
# 3. send_research_invitation_email — direct helper
# ===========================================================================

@pytest.mark.django_db
class TestSendInvitationEmailHelper:
    def test_helper_sends_invitation_with_inviter_name(
        self, invited_user, mentor_owner, research, mailoutbox
    ):
        result = EmailService.send_research_invitation_email(
            invited_user, research, inviter=mentor_owner,
        )
        assert result is True
        assert len(mailoutbox) == 1
        msg = mailoutbox[0]
        assert msg.to == [invited_user.email]
        assert research.researchName in msg.subject
        assert research.researchName in msg.body
        # Inviter's full name must appear in the body.
        assert mentor_owner.get_full_name() in msg.body
        # Locks the "you have been invited" Hebrew phrasing — the new
        # clearer invitation message.
        assert "הזמין/ה אותך להצטרף למחקר" in msg.body

    def test_helper_falls_back_when_inviter_is_none(
        self, invited_user, research, mailoutbox
    ):
        """
        Documents existing fallback: with inviter=None the helper substitutes
        the Hebrew literal 'מנחה במחקר'.
        """
        result = EmailService.send_research_invitation_email(
            invited_user, research, inviter=None,
        )
        assert result is True
        assert len(mailoutbox) == 1
        assert "מנחה במחקר" in mailoutbox[0].body

    def test_helper_skips_when_invited_user_not_verified(
        self, unverified_user, mentor_owner, research, mailoutbox
    ):
        result = EmailService.send_research_invitation_email(
            unverified_user, research, inviter=mentor_owner,
        )
        assert result is False
        assert len(mailoutbox) == 0


# ===========================================================================
# 4. POST /api/research/me/<id>/invite/ — integration
# ===========================================================================

@pytest.mark.django_db
class TestInviteTriggersInvitationEmail:
    def _invite_url(self, research_id):
        return f"/api/research/me/{research_id}/invite/"

    def test_invite_endpoint_sends_email_with_inviter_and_research(
        self,
        api_client,
        mentor_owner,
        invited_user,
        research,
        mailoutbox,
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            self._invite_url(research.id),
            {"user_id": str(invited_user.id), "role": "student"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED

        recipients = [m for m in mailoutbox if invited_user.email in m.to]
        assert len(recipients) == 1
        msg = recipients[0]
        assert research.researchName in msg.subject
        assert research.researchName in msg.body
        # Verifies the view actually forwards inviter=request.user so the
        # owner's full name appears in the message.
        assert mentor_owner.get_full_name() in msg.body
