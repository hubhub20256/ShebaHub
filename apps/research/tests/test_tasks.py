"""
Tests for the Task Manager endpoints under /api/research/tasks/.

Covers:
- List tasks (visibility, filters, search)
- Create task (permissions, validation, attachments, explicit assignees)
- Retrieve task detail
- Update task (PATCH)
- Delete task
- Assign / unassign user to task
- Comments: list, create, delete (author / owner / other)
- Attachments: upload (PDF only) and delete
- Permission cases: unauthenticated, unverified, owner, plain member
  (approved, can_edit=False), editor mentor (approved, can_edit=True), outsider
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import Institution, MentorProfile, StudentProfile
from apps.research.models import (
    Research,
    ResearchApplication,
    ResearchTask,
    ResearchTaskAssignee,
    ResearchTaskAttachment,
    ResearchTaskComment,
)

User = get_user_model()

TASKS_URL = "/api/research/tasks/"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pdf_bytes(payload: bytes = b"hello-pdf") -> bytes:
    """Return bytes that pass the PDF magic-byte check in file_security."""
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
        name="Tasks Institution", name_he="מוסד למשימות", is_active=True,
    )


@pytest.fixture
def mentor_owner(db):
    user = User.objects.create_user(
        email="tasks_owner@example.com", password="TestPass123!",
        firstName="Owner", lastName="Mentor", email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace="Sheba Hospital")
    return user


@pytest.fixture
def member_student(db, institution):
    """Approved member, but plain (no can_edit)."""
    user = User.objects.create_user(
        email="tasks_member@example.com", password="TestPass123!",
        firstName="Plain", lastName="Member", email_verified=True,
    )
    StudentProfile.objects.create(user=user, institution=institution, isAvailableForResearch=True)
    return user


@pytest.fixture
def editor_mentor(db):
    """Approved member with can_edit=True (editor)."""
    user = User.objects.create_user(
        email="tasks_editor@example.com", password="TestPass123!",
        firstName="Editor", lastName="Mentor", email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace="Other Hospital")
    return user


@pytest.fixture
def outsider(db, institution):
    """Authenticated user with a profile but no relation to the research."""
    user = User.objects.create_user(
        email="tasks_outsider@example.com", password="TestPass123!",
        firstName="Out", lastName="Sider", email_verified=True,
    )
    StudentProfile.objects.create(user=user, institution=institution, isAvailableForResearch=True)
    return user


@pytest.fixture
def unverified_user(db):
    """Has a profile but email_verified=False — IsEmailVerified must block."""
    user = User.objects.create_user(
        email="tasks_unverified@example.com", password="TestPass123!",
        firstName="Un", lastName="Verified", email_verified=False,
    )
    MentorProfile.objects.create(user=user, workplace="Somewhere")
    return user


@pytest.fixture
def research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner,
        researchName="Tasks Research",
        description="A research used by task tests.",
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
def editor_application(db, research, editor_mentor):
    return ResearchApplication.objects.create(
        research=research,
        applicant=editor_mentor,
        status=ResearchApplication.Status.APPROVED,
        can_edit=True,
    )


@pytest.fixture
def task(db, research, mentor_owner):
    """Task created by the owner — owner is auto-assigned with role='owner'."""
    t = ResearchTask.objects.create(
        research=research,
        created_by=mentor_owner,
        title="Initial Task",
        description="Initial description.",
        urgency=ResearchTask.Urgency.MEDIUM,
        status=ResearchTask.Status.TODO,
    )
    ResearchTaskAssignee.objects.create(task=t, user=mentor_owner, role="owner")
    return t


@pytest.fixture
def media_root(tmp_path, settings):
    """Isolate file uploads in a temp dir for each test."""
    settings.MEDIA_ROOT = str(tmp_path)
    return tmp_path


# ---------------------------------------------------------------------------
# List tasks
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestListTasks:
    def test_list_unauthenticated_returns_401(self, api_client):
        response = api_client.get(TASKS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unverified_user_blocked_when_setting_enabled(
        self, api_client, unverified_user
    ):
        """
        IsEmailVerified is gated by SiteSetting.require_email_verification_to_apply.
        With the toggle on, unverified non-staff users must be blocked.
        """
        from apps.admin_panel.models import SiteSetting
        site = SiteSetting.load()
        site.require_email_verification_to_apply = True
        site.save()
        api_client.force_authenticate(user=unverified_user)
        response = api_client.get(TASKS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_owner_sees_own_research_tasks(self, api_client, mentor_owner, task):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(TASKS_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [t["id"] for t in response.data]
        assert task.id in ids

    def test_approved_member_sees_research_tasks(
        self, api_client, member_student, member_application, task
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.get(TASKS_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [t["id"] for t in response.data]
        assert task.id in ids

    def test_outsider_does_not_see_tasks(self, api_client, outsider, task):
        api_client.force_authenticate(user=outsider)
        response = api_client.get(TASKS_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [t["id"] for t in response.data]
        assert task.id not in ids

    def test_filter_by_research_id(self, api_client, mentor_owner, research, task):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(TASKS_URL, {"research_id": research.id})
        assert response.status_code == status.HTTP_200_OK
        assert all(int(t["researchId"]) == research.id for t in response.data)

    def test_filter_by_status(self, api_client, mentor_owner, research, task):
        ResearchTask.objects.create(
            research=research, created_by=mentor_owner,
            title="Done task", status=ResearchTask.Status.COMPLETED,
        )
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(TASKS_URL, {"status": "completed"})
        assert response.status_code == status.HTTP_200_OK
        statuses = {t["status"] for t in response.data}
        assert statuses == {"completed"}

    def test_filter_by_urgency(self, api_client, mentor_owner, research, task):
        ResearchTask.objects.create(
            research=research, created_by=mentor_owner,
            title="High urgency task", urgency=ResearchTask.Urgency.HIGH,
        )
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(TASKS_URL, {"urgency": "high"})
        assert response.status_code == status.HTTP_200_OK
        urgencies = {t["urgency"] for t in response.data}
        assert urgencies == {"high"}

    def test_invalid_status_returns_400(self, api_client, mentor_owner):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(TASKS_URL, {"status": "not-a-status"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_urgency_returns_400(self, api_client, mentor_owner):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(TASKS_URL, {"urgency": "nope"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_research_id_returns_400(self, api_client, mentor_owner):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(TASKS_URL, {"research_id": "abc"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_search_q_matches_title_icontains(
        self, api_client, mentor_owner, research, task
    ):
        ResearchTask.objects.create(
            research=research, created_by=mentor_owner, title="Special UNIQUEWORD task",
        )
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(TASKS_URL, {"q": "uniqueword"})
        assert response.status_code == status.HTTP_200_OK
        titles = [t["title"] for t in response.data]
        assert any("UNIQUEWORD" in title for title in titles)
        assert task.title not in titles


# ---------------------------------------------------------------------------
# Create task
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCreateTask:
    def test_owner_can_create_task(self, api_client, mentor_owner, research):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            TASKS_URL,
            {"research_id": research.id, "title": "New task", "description": "x"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        new_id = response.data["id"]
        # Creator was auto-assigned with role='owner'
        assert ResearchTaskAssignee.objects.filter(
            task_id=new_id, user=mentor_owner, role="owner"
        ).exists()

    def test_member_can_create_task(
        self, api_client, member_student, member_application, research
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.post(
            TASKS_URL, {"research_id": research.id, "title": "Member's task"}
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Member's task"

    def test_outsider_create_returns_403(self, api_client, outsider, research):
        api_client.force_authenticate(user=outsider)
        response = api_client.post(
            TASKS_URL, {"research_id": research.id, "title": "Nope"}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_create_returns_401(self, api_client, research):
        response = api_client.post(
            TASKS_URL, {"research_id": research.id, "title": "Nope"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_without_research_id_returns_400(self, api_client, mentor_owner):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(TASKS_URL, {"title": "No research"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_with_unknown_research_returns_404(self, api_client, mentor_owner):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            TASKS_URL, {"research_id": 999999, "title": "Ghost research"}
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_without_title_returns_400(self, api_client, mentor_owner, research):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(TASKS_URL, {"research_id": research.id})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_with_explicit_assignees_keeps_only_research_members(
        self, api_client, mentor_owner, research,
        member_student, member_application, outsider,
    ):
        """
        Per current view behavior, non-member ids in `assignees` are silently
        dropped and only research members are kept.
        """
        import json

        api_client.force_authenticate(user=mentor_owner)
        payload = {
            "research_id": research.id,
            "title": "Pick assignees",
            "assignees": json.dumps([
                {"id": str(member_student.id), "role": "student"},
                {"id": str(outsider.id), "role": "ghost"},
            ]),
        }
        response = api_client.post(TASKS_URL, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assignee_ids = {str(a["id"]) for a in response.data["assignees"]}
        assert str(member_student.id) in assignee_ids
        assert str(outsider.id) not in assignee_ids

    def test_create_with_pdf_attachment(
        self, api_client, mentor_owner, research, media_root
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            TASKS_URL,
            {
                "research_id": str(research.id),
                "title": "With file",
                "files": _pdf_file("attached.pdf"),
            },
            format="multipart",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data["attachments"]) == 1


# ---------------------------------------------------------------------------
# Retrieve task detail
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestRetrieveTask:
    def _detail_url(self, task_id):
        return f"/api/research/tasks/{task_id}/"

    def test_unauthenticated_returns_401(self, api_client, task):
        response = api_client.get(self._detail_url(task.id))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_owner_can_retrieve(self, api_client, mentor_owner, task):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(self._detail_url(task.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == task.id

    def test_member_can_retrieve(
        self, api_client, member_student, member_application, task
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.get(self._detail_url(task.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == task.id

    def test_outsider_gets_404(self, api_client, outsider, task):
        api_client.force_authenticate(user=outsider)
        response = api_client.get(self._detail_url(task.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_nonexistent_returns_404(self, api_client, mentor_owner):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(self._detail_url(999999))
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Update task
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestUpdateTask:
    def _detail_url(self, task_id):
        return f"/api/research/tasks/{task_id}/"

    def test_owner_can_patch(self, api_client, mentor_owner, task):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.patch(
            self._detail_url(task.id),
            {"title": "Renamed", "status": "in_progress"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Renamed"
        assert response.data["status"] == "in_progress"

    def test_task_creator_can_patch(self, api_client, mentor_owner, task):
        # `task` was created by mentor_owner who is also the research owner;
        # this confirms the creator path works regardless.
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.patch(
            self._detail_url(task.id), {"description": "edited"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["description"] == "edited"

    def test_editor_mentor_can_patch(
        self, api_client, editor_mentor, editor_application, task
    ):
        api_client.force_authenticate(user=editor_mentor)
        response = api_client.patch(
            self._detail_url(task.id), {"title": "Editor renamed"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Editor renamed"

    def test_plain_member_cannot_patch_returns_403(
        self, api_client, member_student, member_application, task
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.patch(
            self._detail_url(task.id), {"title": "Nope"}, format="json"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_outsider_patch_returns_404(self, api_client, outsider, task):
        api_client.force_authenticate(user=outsider)
        response = api_client.patch(
            self._detail_url(task.id), {"title": "Nope"}, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Delete task
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestDeleteTask:
    def _detail_url(self, task_id):
        return f"/api/research/tasks/{task_id}/"

    def test_owner_can_delete(self, api_client, mentor_owner, task):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.delete(self._detail_url(task.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ResearchTask.objects.filter(id=task.id).exists()

    def test_editor_mentor_can_delete(
        self, api_client, editor_mentor, editor_application, task
    ):
        api_client.force_authenticate(user=editor_mentor)
        response = api_client.delete(self._detail_url(task.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_plain_member_cannot_delete_returns_403(
        self, api_client, member_student, member_application, task
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.delete(self._detail_url(task.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert ResearchTask.objects.filter(id=task.id).exists()

    def test_outsider_delete_returns_404(self, api_client, outsider, task):
        api_client.force_authenticate(user=outsider)
        response = api_client.delete(self._detail_url(task.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert ResearchTask.objects.filter(id=task.id).exists()


# ---------------------------------------------------------------------------
# Assign / unassign
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAssignUnassign:
    def _assign_url(self, task_id):
        return f"/api/research/tasks/{task_id}/assignees/"

    def _unassign_url(self, task_id, user_id):
        return f"/api/research/tasks/{task_id}/assignees/{user_id}/"

    def test_assign_member_succeeds_201(
        self, api_client, mentor_owner, task, member_student, member_application
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            self._assign_url(task.id),
            {"user_id": member_student.id, "role": "student"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert ResearchTaskAssignee.objects.filter(
            task=task, user=member_student
        ).exists()

    def test_assign_idempotent_returns_200_when_already_assigned(
        self, api_client, mentor_owner, task
    ):
        # mentor_owner is already auto-assigned via the `task` fixture
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            self._assign_url(task.id),
            {"user_id": mentor_owner.id},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

    def test_assign_non_member_returns_400(
        self, api_client, mentor_owner, task, outsider
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            self._assign_url(task.id),
            {"user_id": outsider.id},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_assign_missing_user_id_returns_400(
        self, api_client, mentor_owner, task
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(self._assign_url(task.id), {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_assign_invalid_user_id_returns_400(
        self, api_client, mentor_owner, task
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            self._assign_url(task.id), {"user_id": "not-an-int"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_assign_by_plain_member_returns_403(
        self,
        api_client,
        member_student,
        member_application,
        task,
        editor_mentor,
        editor_application,
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.post(
            self._assign_url(task.id),
            {"user_id": editor_mentor.id},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unassign_member_returns_204(
        self,
        api_client,
        mentor_owner,
        task,
        member_student,
        member_application,
    ):
        ResearchTaskAssignee.objects.create(task=task, user=member_student, role="student")
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.delete(self._unassign_url(task.id, member_student.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ResearchTaskAssignee.objects.filter(
            task=task, user=member_student
        ).exists()

    def test_unassign_nonexistent_returns_404(
        self, api_client, mentor_owner, task, outsider
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.delete(self._unassign_url(task.id, outsider.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_unassign_by_outsider_returns_404(
        self, api_client, outsider, task, mentor_owner
    ):
        api_client.force_authenticate(user=outsider)
        response = api_client.delete(self._unassign_url(task.id, mentor_owner.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_assign_with_string_uuid_user_id(
        self, api_client, mentor_owner, task, member_student, member_application
    ):
        """Sending user_id as a string UUID should succeed (201)."""
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            self._assign_url(task.id),
            {"user_id": str(member_student.id), "role": "reviewer"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert ResearchTaskAssignee.objects.filter(
            task=task, user=member_student
        ).exists()

    def test_assign_with_invalid_uuid_string_returns_400(
        self, api_client, mentor_owner, task
    ):
        """Sending a malformed UUID string as user_id should return 400."""
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            self._assign_url(task.id),
            {"user_id": "not-a-valid-uuid-at-all"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unassign_with_uuid_in_url(
        self, api_client, mentor_owner, task, member_student, member_application
    ):
        """Unassign endpoint correctly handles UUID user_id in URL path."""
        ResearchTaskAssignee.objects.create(task=task, user=member_student, role="student")
        api_client.force_authenticate(user=mentor_owner)
        # Use the string representation of the UUID in the URL
        response = api_client.delete(self._unassign_url(task.id, str(member_student.id)))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ResearchTaskAssignee.objects.filter(
            task=task, user=member_student
        ).exists()


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestComments:
    def _comments_url(self, task_id):
        return f"/api/research/tasks/{task_id}/comments/"

    def _comment_detail_url(self, task_id, comment_id):
        return f"/api/research/tasks/{task_id}/comments/{comment_id}/"

    def test_list_comments_for_member_returns_200(
        self,
        api_client,
        member_student,
        member_application,
        task,
        mentor_owner,
    ):
        ResearchTaskComment.objects.create(task=task, author=mentor_owner, body="hi")
        api_client.force_authenticate(user=member_student)
        response = api_client.get(self._comments_url(task.id))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["body"] == "hi"

    def test_list_comments_for_outsider_returns_404(
        self, api_client, outsider, task
    ):
        api_client.force_authenticate(user=outsider)
        response = api_client.get(self._comments_url(task.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_member_can_post_comment(
        self, api_client, member_student, member_application, task
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.post(
            self._comments_url(task.id), {"body": "Hello team"}, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["body"] == "Hello team"

    def test_post_empty_comment_returns_400(
        self, api_client, member_student, member_application, task
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.post(
            self._comments_url(task.id), {"body": "   "}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_post_comment_too_long_returns_400(
        self, api_client, member_student, member_application, task
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.post(
            self._comments_url(task.id), {"body": "a" * 2001}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_author_can_delete_own_comment_204(
        self, api_client, member_student, member_application, task
    ):
        comment = ResearchTaskComment.objects.create(
            task=task, author=member_student, body="mine"
        )
        api_client.force_authenticate(user=member_student)
        response = api_client.delete(self._comment_detail_url(task.id, comment.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ResearchTaskComment.objects.filter(id=comment.id).exists()

    def test_owner_can_delete_other_users_comment(
        self,
        api_client,
        mentor_owner,
        task,
        member_student,
        member_application,
    ):
        comment = ResearchTaskComment.objects.create(
            task=task, author=member_student, body="theirs"
        )
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.delete(self._comment_detail_url(task.id, comment.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_other_member_cannot_delete_others_comment_returns_403(
        self,
        api_client,
        member_student,
        member_application,
        editor_mentor,
        editor_application,
        task,
    ):
        comment = ResearchTaskComment.objects.create(
            task=task, author=editor_mentor, body="not yours"
        )
        api_client.force_authenticate(user=member_student)
        response = api_client.delete(self._comment_detail_url(task.id, comment.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert ResearchTaskComment.objects.filter(id=comment.id).exists()


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAttachments:
    def _upload_url(self, task_id):
        return f"/api/research/tasks/{task_id}/attachments/"

    def _detail_url(self, task_id, attachment_id):
        return f"/api/research/tasks/{task_id}/attachments/{attachment_id}/"

    def test_member_with_edit_can_upload_pdf(
        self,
        api_client,
        editor_mentor,
        editor_application,
        task,
        media_root,
    ):
        api_client.force_authenticate(user=editor_mentor)
        response = api_client.post(
            self._upload_url(task.id),
            {"files": _pdf_file("a.pdf")},
            format="multipart",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 1

    def test_owner_can_upload_pdf(
        self, api_client, mentor_owner, task, media_root
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            self._upload_url(task.id),
            {"files": _pdf_file("b.pdf")},
            format="multipart",
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_upload_without_file_returns_400(
        self, api_client, mentor_owner, task, media_root
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(self._upload_url(task.id), {}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_non_pdf_returns_400(
        self, api_client, mentor_owner, task, media_root
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.post(
            self._upload_url(task.id),
            {"files": _txt_file("note.txt")},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_outsider_upload_returns_404(
        self, api_client, outsider, task, media_root
    ):
        api_client.force_authenticate(user=outsider)
        response = api_client.post(
            self._upload_url(task.id),
            {"files": _pdf_file("c.pdf")},
            format="multipart",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_plain_member_upload_returns_403(
        self,
        api_client,
        member_student,
        member_application,
        task,
        media_root,
    ):
        api_client.force_authenticate(user=member_student)
        response = api_client.post(
            self._upload_url(task.id),
            {"files": _pdf_file("d.pdf")},
            format="multipart",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_owner_can_delete_attachment(
        self, api_client, mentor_owner, task, media_root
    ):
        att = ResearchTaskAttachment.objects.create(
            task=task,
            file=_pdf_file("e.pdf"),
            file_name="e.pdf",
            size=128,
            uploaded_by=mentor_owner,
        )
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.delete(self._detail_url(task.id, att.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ResearchTaskAttachment.objects.filter(id=att.id).exists()

    def test_delete_nonexistent_attachment_returns_404(
        self, api_client, mentor_owner, task
    ):
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.delete(self._detail_url(task.id, 999999))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_plain_member_cannot_delete_attachment_returns_403(
        self,
        api_client,
        member_student,
        member_application,
        task,
        mentor_owner,
        media_root,
    ):
        att = ResearchTaskAttachment.objects.create(
            task=task,
            file=_pdf_file("f.pdf"),
            file_name="f.pdf",
            size=128,
            uploaded_by=mentor_owner,
        )
        api_client.force_authenticate(user=member_student)
        response = api_client.delete(self._detail_url(task.id, att.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert ResearchTaskAttachment.objects.filter(id=att.id).exists()
