"""
Tests for the research chat endpoints under /api/research/me/<id>/chat/.

Covers:
- List messages (auth, ordering, before/after/limit pagination)
- Send text and file messages (validation, mentors_only, files_enabled)
- Chat settings GET/PATCH
- Pin/unpin
- Delete messages (sender / owner / can_manage_chat / plain member)
- Mark seen GET/POST (no regression)
- Members list (owner first, mentor flag)
- Permission cases: unauthenticated, unverified (with SiteSetting toggle on),
  owner, plain approved member, approved member with can_manage_chat=True,
  outsider / non-member
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import Institution, MentorProfile, StudentProfile
from apps.research.models import (
    ContactMessage,
    Research,
    ResearchApplication,
    ResearchChatMessage,
    ResearchChatSettings,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _chat_url(research_id):
    return f"/api/research/me/{research_id}/chat/"


def _settings_url(research_id):
    return f"/api/research/me/{research_id}/chat/settings/"


def _pin_url(research_id, message_id):
    return f"/api/research/me/{research_id}/chat/{message_id}/pin/"


def _delete_url(research_id, message_id):
    return f"/api/research/me/{research_id}/chat/{message_id}/"


def _seen_url(research_id):
    return f"/api/research/me/{research_id}/chat/seen/"


def _members_url(research_id):
    return f"/api/research/me/{research_id}/chat/members/"


def _pdf_bytes(payload: bytes = b"hello-pdf") -> bytes:
    return b"%PDF-1.4\n" + payload + b"\n%%EOF"


def _pdf_file(name: str = "doc.pdf", payload: bytes = b"hello-pdf") -> SimpleUploadedFile:
    return SimpleUploadedFile(name, _pdf_bytes(payload), content_type="application/pdf")


def _txt_file(name: str = "note.txt") -> SimpleUploadedFile:
    return SimpleUploadedFile(name, b"plain text content", content_type="text/plain")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name="Chat Institution", name_he="מוסד לצ'אט", is_active=True,
    )


@pytest.fixture
def mentor_owner(db):
    user = User.objects.create_user(
        email="chat_owner@example.com", password="TestPass123!",
        firstName="Owner", lastName="Mentor", email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace="Sheba Hospital")
    return user


@pytest.fixture
def member_student(db, institution):
    """Approved member, plain student (no can_manage_chat)."""
    user = User.objects.create_user(
        email="chat_member@example.com", password="TestPass123!",
        firstName="Plain", lastName="Member", email_verified=True,
    )
    StudentProfile.objects.create(user=user, institution=institution, isAvailableForResearch=True)
    return user


@pytest.fixture
def manager_mentor(db):
    """Approved member with can_manage_chat=True, has MentorProfile."""
    user = User.objects.create_user(
        email="chat_manager@example.com", password="TestPass123!",
        firstName="Manager", lastName="Mentor", email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace="Other Hospital")
    return user


@pytest.fixture
def outsider(db, institution):
    user = User.objects.create_user(
        email="chat_outsider@example.com", password="TestPass123!",
        firstName="Out", lastName="Sider", email_verified=True,
    )
    StudentProfile.objects.create(user=user, institution=institution, isAvailableForResearch=True)
    return user


@pytest.fixture
def unverified_user(db):
    user = User.objects.create_user(
        email="chat_unverified@example.com", password="TestPass123!",
        firstName="Un", lastName="Verified", email_verified=False,
    )
    MentorProfile.objects.create(user=user, workplace="Somewhere")
    return user


@pytest.fixture
def research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner,
        researchName="Chat Research",
        description="A research used by chat tests.",
        status="open",
        moderation_status="approved",
        accepting_applications=True,
    )


@pytest.fixture
def member_application(db, research, member_student):
    return ResearchApplication.objects.create(
        research=research,
        applicant=member_student,
        status=ResearchApplication.Status.APPROVED,
    )


@pytest.fixture
def manager_application(db, research, manager_mentor):
    return ResearchApplication.objects.create(
        research=research,
        applicant=manager_mentor,
        status=ResearchApplication.Status.APPROVED,
        can_manage_chat=True,
    )


@pytest.fixture
def media_root(tmp_path, settings):
    settings.MEDIA_ROOT = str(tmp_path)
    return tmp_path


def _msg(research, sender, body="hello", is_pinned=False):
    return ResearchChatMessage.objects.create(
        research=research, sender=sender, body=body, is_pinned=is_pinned,
    )


# ---------------------------------------------------------------------------
# List messages
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestChatList:
    def test_unauthenticated_returns_401(self, api_client, research):
        response = api_client.get(_chat_url(research.id))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unverified_blocked_when_setting_enabled(
        self, api_client, unverified_user, research
    ):
        from apps.admin_panel.models import SiteSetting
        site = SiteSetting.load()
        site.require_email_verification_to_apply = True
        site.save()
        api_client.force_authenticate(user=unverified_user)
        response = api_client.get(_chat_url(research.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_outsider_returns_403(self, api_client, outsider, research):
        api_client.force_authenticate(user=outsider)
        response = api_client.get(_chat_url(research.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_research_not_found_returns_404(self, api_client, mentor_owner):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(_chat_url(999999))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_owner_sees_messages(self, api_client, mentor_owner, research):
        m = _msg(research, mentor_owner, "hi")
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(_chat_url(research.id))
        assert response.status_code == status.HTTP_200_OK
        assert any(item["id"] == m.id for item in response.data)

    def test_member_sees_messages(
        self, api_client, member_student, member_application, research, mentor_owner
    ):
        _msg(research, mentor_owner, "from owner")
        api_client.force_authenticate(user=member_student)
        response = api_client.get(_chat_url(research.id))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_default_returns_chronological_order(
        self, api_client, mentor_owner, research
    ):
        m1 = _msg(research, mentor_owner, "first")
        m2 = _msg(research, mentor_owner, "second")
        m3 = _msg(research, mentor_owner, "third")
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(_chat_url(research.id))
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data]
        assert ids == [m1.id, m2.id, m3.id]

    def test_after_returns_only_newer(self, api_client, mentor_owner, research):
        m1 = _msg(research, mentor_owner, "a")
        m2 = _msg(research, mentor_owner, "b")
        m3 = _msg(research, mentor_owner, "c")
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(_chat_url(research.id), {"after": m1.id})
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data]
        assert ids == [m2.id, m3.id]

    def test_before_returns_only_older(self, api_client, mentor_owner, research):
        m1 = _msg(research, mentor_owner, "a")
        m2 = _msg(research, mentor_owner, "b")
        m3 = _msg(research, mentor_owner, "c")
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(_chat_url(research.id), {"before": m3.id})
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data]
        assert m3.id not in ids
        assert m1.id in ids and m2.id in ids


# ---------------------------------------------------------------------------
# Send messages
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestChatSendMessage:
    def test_unauthenticated_returns_401(self, api_client, research):
        response = api_client.post(_chat_url(research.id), {"body": "hi"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_outsider_returns_403(self, api_client, outsider, research):
        api_client.force_authenticate(user=outsider)
        response = api_client.post(_chat_url(research.id), {"body": "hi"})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_owner_can_send_text(self, api_client, mentor_owner, research):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(_chat_url(research.id), {"body": "hello team"})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["body"] == "hello team"

    def test_member_can_send_text(
        self, api_client, member_student, member_application, research
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.post(_chat_url(research.id), {"body": "hi"})
        assert response.status_code == status.HTTP_201_CREATED

    def test_empty_body_no_file_returns_400(
        self, api_client, member_student, member_application, research
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.post(_chat_url(research.id), {"body": "   "})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_body_too_long_returns_400(
        self, api_client, member_student, member_application, research
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.post(_chat_url(research.id), {"body": "a" * 2001})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_send_pdf_file_returns_201(
        self, api_client, mentor_owner, research, media_root
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            _chat_url(research.id),
            {"body": "", "file": _pdf_file("attached.pdf")},
            format="multipart",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["file_name"]

    def test_send_non_allowed_filetype_returns_400(
        self, api_client, mentor_owner, research, media_root
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            _chat_url(research.id),
            {"body": "", "file": _txt_file("note.txt")},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_send_with_files_disabled_returns_403(
        self, api_client, mentor_owner, research, media_root
    ):
        ResearchChatSettings.objects.create(research=research, files_enabled=False)
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            _chat_url(research.id),
            {"body": "", "file": _pdf_file("blocked.pdf")},
            format="multipart",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_mentors_only_blocks_plain_student_member(
        self, api_client, member_student, member_application, research
    ):
        ResearchChatSettings.objects.create(
            research=research,
            send_permission=ResearchChatSettings.SendPermission.MENTORS_ONLY,
        )
        api_client.force_authenticate(user=member_student)
        response = api_client.post(_chat_url(research.id), {"body": "hello"})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_mentors_only_allows_owner(self, api_client, mentor_owner, research):
        ResearchChatSettings.objects.create(
            research=research,
            send_permission=ResearchChatSettings.SendPermission.MENTORS_ONLY,
        )
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(_chat_url(research.id), {"body": "hi"})
        assert response.status_code == status.HTTP_201_CREATED

    def test_mentors_only_allows_mentor_member(
        self, api_client, manager_mentor, manager_application, research
    ):
        ResearchChatSettings.objects.create(
            research=research,
            send_permission=ResearchChatSettings.SendPermission.MENTORS_ONLY,
        )
        api_client.force_authenticate(user=manager_mentor)
        response = api_client.post(_chat_url(research.id), {"body": "hi"})
        assert response.status_code == status.HTTP_201_CREATED

    def test_at_all_creates_chat_mention_notifications(
        self,
        api_client,
        member_student,
        member_application,
        manager_mentor,
        manager_application,
        research,
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.post(_chat_url(research.id), {"body": "hello @all team"})
        assert response.status_code == status.HTTP_201_CREATED

        # @all → notifications go to all members EXCEPT the sender.
        recipients = set(
            ContactMessage.objects.filter(
                notification_type=ContactMessage.NotificationType.CHAT_MENTION
            ).values_list("recipient_id", flat=True)
        )
        assert member_student.id not in recipients
        assert research.owner_id in recipients
        assert manager_mentor.id in recipients


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestChatSettings:
    def test_get_member_returns_defaults(
        self, api_client, member_student, member_application, research
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.get(_settings_url(research.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["send_permission"] == "all"
        assert response.data["files_enabled"] is True

    def test_get_outsider_returns_403(self, api_client, outsider, research):
        api_client.force_authenticate(user=outsider)
        response = api_client.get(_settings_url(research.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_patch_owner_succeeds(self, api_client, mentor_owner, research):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.patch(
            _settings_url(research.id),
            {"send_permission": "mentors_only", "files_enabled": False},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["send_permission"] == "mentors_only"
        assert response.data["files_enabled"] is False

    def test_patch_can_manage_chat_succeeds(
        self, api_client, manager_mentor, manager_application, research
    ):
        api_client.force_authenticate(user=manager_mentor)
        response = api_client.patch(
            _settings_url(research.id), {"files_enabled": False}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["files_enabled"] is False

    def test_patch_plain_member_returns_403(
        self, api_client, member_student, member_application, research
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.patch(
            _settings_url(research.id), {"files_enabled": False}, format="json"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_patch_invalid_send_permission_returns_400(
        self, api_client, mentor_owner, research
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.patch(
            _settings_url(research.id),
            {"send_permission": "not-a-mode"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# Pin / unpin
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestChatPin:
    def test_owner_can_toggle_pin(self, api_client, mentor_owner, research):
        msg = _msg(research, mentor_owner, "pin me")
        api_client.force_authenticate(user=mentor_owner)

        response = api_client.post(_pin_url(research.id, msg.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_pinned"] is True
        assert response.data["pinned_by_name"] == mentor_owner.get_full_name()

        response = api_client.post(_pin_url(research.id, msg.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_pinned"] is False
        assert response.data["pinned_by_name"] is None

    def test_can_manage_chat_can_pin(
        self, api_client, manager_mentor, manager_application, research, mentor_owner
    ):
        msg = _msg(research, mentor_owner, "pin from manager")
        api_client.force_authenticate(user=manager_mentor)
        response = api_client.post(_pin_url(research.id, msg.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_pinned"] is True

    def test_plain_member_cannot_pin_returns_403(
        self, api_client, member_student, member_application, research, mentor_owner
    ):
        msg = _msg(research, mentor_owner, "no")
        api_client.force_authenticate(user=member_student)
        response = api_client.post(_pin_url(research.id, msg.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_pin_outsider_returns_403(
        self, api_client, outsider, research, mentor_owner
    ):
        msg = _msg(research, mentor_owner, "no")
        api_client.force_authenticate(user=outsider)
        response = api_client.post(_pin_url(research.id, msg.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_pin_message_in_other_research_returns_404(
        self, api_client, mentor_owner, research
    ):
        # Create a second research owned by the same user, with its own message.
        other = Research.objects.create(
            owner=mentor_owner, researchName="Other", description="x",
            status="open", moderation_status="approved",
        )
        foreign_msg = _msg(other, mentor_owner, "elsewhere")
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(_pin_url(research.id, foreign_msg.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Delete message
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestChatDelete:
    def test_sender_can_delete_own_message(
        self, api_client, member_student, member_application, research
    ):
        msg = _msg(research, member_student, "mine")
        api_client.force_authenticate(user=member_student)
        response = api_client.delete(_delete_url(research.id, msg.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ResearchChatMessage.objects.filter(id=msg.id).exists()

    def test_owner_can_delete_others_message(
        self, api_client, mentor_owner, member_student, member_application, research
    ):
        msg = _msg(research, member_student, "theirs")
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.delete(_delete_url(research.id, msg.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_can_manage_chat_can_delete_others_message(
        self,
        api_client,
        manager_mentor,
        manager_application,
        member_student,
        member_application,
        research,
    ):
        msg = _msg(research, member_student, "del me")
        api_client.force_authenticate(user=manager_mentor)
        response = api_client.delete(_delete_url(research.id, msg.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_plain_member_cannot_delete_others_returns_403(
        self,
        api_client,
        member_student,
        member_application,
        manager_mentor,
        manager_application,
        research,
    ):
        msg = _msg(research, manager_mentor, "not yours")
        api_client.force_authenticate(user=member_student)
        response = api_client.delete(_delete_url(research.id, msg.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert ResearchChatMessage.objects.filter(id=msg.id).exists()

    def test_delete_outsider_returns_403(
        self, api_client, outsider, research, mentor_owner
    ):
        msg = _msg(research, mentor_owner, "x")
        api_client.force_authenticate(user=outsider)
        response = api_client.delete(_delete_url(research.id, msg.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_message_in_other_research_returns_404(
        self, api_client, mentor_owner, research
    ):
        other = Research.objects.create(
            owner=mentor_owner, researchName="Other", description="x",
            status="open", moderation_status="approved",
        )
        foreign_msg = _msg(other, mentor_owner, "elsewhere")
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.delete(_delete_url(research.id, foreign_msg.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Mark seen
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestChatMarkSeen:
    def test_get_seen_owner_returns_owner_pointer(
        self, api_client, mentor_owner, research
    ):
        research.owner_last_seen_chat_message_id = 42
        research.save(update_fields=["owner_last_seen_chat_message_id"])
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(_seen_url(research.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["message_id"] == 42

    def test_get_seen_member_returns_application_pointer(
        self, api_client, member_student, member_application, research
    ):
        member_application.last_seen_chat_message_id = 7
        member_application.save(update_fields=["last_seen_chat_message_id"])
        api_client.force_authenticate(user=member_student)
        response = api_client.get(_seen_url(research.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["message_id"] == 7

    def test_post_seen_owner_advances_pointer(
        self, api_client, mentor_owner, research
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(_seen_url(research.id), {"message_id": 100}, format="json")
        assert response.status_code == status.HTTP_200_OK
        research.refresh_from_db()
        assert research.owner_last_seen_chat_message_id == 100

    def test_post_seen_member_advances_pointer(
        self, api_client, member_student, member_application, research
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.post(_seen_url(research.id), {"message_id": 5}, format="json")
        assert response.status_code == status.HTTP_200_OK
        member_application.refresh_from_db()
        assert member_application.last_seen_chat_message_id == 5

    def test_post_seen_does_not_regress_pointer(
        self, api_client, mentor_owner, research
    ):
        research.owner_last_seen_chat_message_id = 50
        research.save(update_fields=["owner_last_seen_chat_message_id"])
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(_seen_url(research.id), {"message_id": 5}, format="json")
        assert response.status_code == status.HTTP_200_OK
        research.refresh_from_db()
        assert research.owner_last_seen_chat_message_id == 50

    def test_post_seen_missing_id_returns_400(
        self, api_client, mentor_owner, research
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(_seen_url(research.id), {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_post_seen_invalid_id_returns_400(
        self, api_client, mentor_owner, research
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            _seen_url(research.id), {"message_id": "abc"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# Members list
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestChatMembers:
    def test_outsider_returns_403(self, api_client, outsider, research):
        api_client.force_authenticate(user=outsider)
        response = api_client.get(_members_url(research.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_owner_appears_first(
        self,
        api_client,
        mentor_owner,
        member_student,
        member_application,
        research,
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(_members_url(research.id))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert response.data[0]["user_id"] == str(mentor_owner.id)

    def test_mentor_flag_is_correct(
        self,
        api_client,
        mentor_owner,
        member_student,
        member_application,
        manager_mentor,
        manager_application,
        research,
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(_members_url(research.id))
        assert response.status_code == status.HTTP_200_OK
        flags = {m["user_id"]: m["is_mentor"] for m in response.data}
        assert flags[str(mentor_owner.id)] is True
        assert flags[str(manager_mentor.id)] is True
        assert flags[str(member_student.id)] is False
