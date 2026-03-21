"""Tests for admin panel research moderation endpoints."""

import pytest
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.admin_panel.models import AdminActionLog
from apps.research.models import Research


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="staffuser@example.com",
        password="StaffPass123!",
        firstName="Staff",
        lastName="Admin",
        is_staff=True,
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email="regular@example.com",
        password="RegularPass123!",
        firstName="Regular",
        lastName="User",
    )


@pytest.fixture
def research_owner(db):
    return User.objects.create_user(
        email="owner@example.com",
        password="OwnerPass123!",
        firstName="Research",
        lastName="Owner",
    )


@pytest.fixture
def research(db, research_owner):
    return Research.all_objects.create(
        owner=research_owner,
        researchName="Test Research",
        description="A test research project",
        researchArea="Medicine",
        moderation_status="pending",
    )


@pytest.fixture
def staff_client(staff_user):
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def regular_client(regular_user):
    client = APIClient()
    client.force_authenticate(user=regular_user)
    return client


@pytest.fixture
def anon_client():
    return APIClient()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

URL_PREFIX = "/api/admin-panel/researches/"


def _detail_url(pk, action):
    return f"{URL_PREFIX}{pk}/{action}/"


# ---------------------------------------------------------------------------
# GET /api/admin-panel/researches/ — list researches
# ---------------------------------------------------------------------------


class TestListResearches:
    @pytest.mark.django_db
    def test_staff_can_list(self, staff_client, research):
        resp = staff_client.get(URL_PREFIX)
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, list)
        assert len(resp.data) == 1
        assert resp.data[0]["id"] == research.id

    @pytest.mark.django_db
    def test_non_staff_gets_403(self, regular_client):
        resp = regular_client.get(URL_PREFIX)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    def test_anon_gets_401(self, anon_client):
        resp = anon_client.get(URL_PREFIX)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.django_db
    def test_filter_by_moderation_status(self, staff_client, research_owner):
        Research.all_objects.create(
            owner=research_owner,
            researchName="Approved Research",
            description="desc",
            moderation_status="approved",
        )
        Research.all_objects.create(
            owner=research_owner,
            researchName="Pending Research",
            description="desc",
            moderation_status="pending",
        )
        resp = staff_client.get(URL_PREFIX, {"moderation_status": "pending"})
        assert resp.status_code == status.HTTP_200_OK
        for item in resp.data:
            assert item["moderation_status"] == "pending"

    @pytest.mark.django_db
    def test_soft_deleted_excluded_by_default(self, staff_client, research_owner):
        Research.all_objects.create(
            owner=research_owner,
            researchName="Deleted Research",
            description="desc",
            is_deleted=True,
        )
        resp = staff_client.get(URL_PREFIX)
        assert resp.status_code == status.HTTP_200_OK
        for item in resp.data:
            assert item["is_deleted"] is False

    @pytest.mark.django_db
    def test_include_deleted(self, staff_client, research_owner):
        Research.all_objects.create(
            owner=research_owner,
            researchName="Deleted Research",
            description="desc",
            is_deleted=True,
        )
        resp = staff_client.get(URL_PREFIX, {"include_deleted": "true"})
        assert resp.status_code == status.HTTP_200_OK
        deleted_items = [item for item in resp.data if item["is_deleted"]]
        assert len(deleted_items) >= 1

    @pytest.mark.django_db
    def test_search_by_name(self, staff_client, research_owner):
        Research.all_objects.create(
            owner=research_owner,
            researchName="UniqueNameXYZ",
            description="desc",
        )
        resp = staff_client.get(URL_PREFIX, {"search": "UniqueNameXYZ"})
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        assert resp.data[0]["researchName"] == "UniqueNameXYZ"


# ---------------------------------------------------------------------------
# POST /api/admin-panel/researches/<id>/approve/
# ---------------------------------------------------------------------------


class TestApproveResearch:
    @pytest.mark.django_db
    @patch("apps.admin_panel.views.EmailService")
    def test_approve_sets_status_and_logs(self, mock_email, staff_client, research, staff_user):
        resp = staff_client.post(
            _detail_url(research.id, "approve"),
            {"note": "Looks good"},
        )
        assert resp.status_code == status.HTTP_200_OK

        research.refresh_from_db()
        assert research.moderation_status == "approved"
        assert research.moderation_note == "Looks good"

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.RESEARCH_APPROVE,
            target_research_id=research.id,
        ).first()
        assert log is not None
        assert log.admin == staff_user
        assert log.details["new_status"] == "approved"

    @pytest.mark.django_db
    def test_approve_not_found(self, staff_client):
        resp = staff_client.post(_detail_url(999999, "approve"))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_non_staff_cannot_approve(self, regular_client, research):
        resp = regular_client.post(_detail_url(research.id, "approve"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# POST /api/admin-panel/researches/<id>/reject/
# ---------------------------------------------------------------------------


class TestRejectResearch:
    @pytest.mark.django_db
    @patch("apps.admin_panel.views.EmailService")
    def test_reject_sets_status_and_logs(self, mock_email, staff_client, research, staff_user):
        resp = staff_client.post(
            _detail_url(research.id, "reject"),
            {"note": "Needs revision"},
        )
        assert resp.status_code == status.HTTP_200_OK

        research.refresh_from_db()
        assert research.moderation_status == "rejected"
        assert research.moderation_note == "Needs revision"

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.RESEARCH_REJECT,
            target_research_id=research.id,
        ).first()
        assert log is not None
        assert log.admin == staff_user
        assert log.details["new_status"] == "rejected"

    @pytest.mark.django_db
    def test_non_staff_cannot_reject(self, regular_client, research):
        resp = regular_client.post(_detail_url(research.id, "reject"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# POST /api/admin-panel/researches/<id>/flag/
# ---------------------------------------------------------------------------


class TestFlagResearch:
    @pytest.mark.django_db
    def test_flag_sets_status_and_logs(self, staff_client, research, staff_user):
        resp = staff_client.post(
            _detail_url(research.id, "flag"),
            {"note": "Suspicious content"},
        )
        assert resp.status_code == status.HTTP_200_OK

        research.refresh_from_db()
        assert research.moderation_status == "flagged"
        assert research.moderation_note == "Suspicious content"

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.RESEARCH_FLAG,
            target_research_id=research.id,
        ).first()
        assert log is not None
        assert log.admin == staff_user
        assert log.details["new_status"] == "flagged"

    @pytest.mark.django_db
    def test_non_staff_cannot_flag(self, regular_client, research):
        resp = regular_client.post(_detail_url(research.id, "flag"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# POST /api/admin-panel/researches/<id>/soft-delete/
# ---------------------------------------------------------------------------


class TestSoftDeleteResearch:
    @pytest.mark.django_db
    def test_soft_delete_sets_flag_and_logs(self, staff_client, research, staff_user):
        resp = staff_client.post(
            _detail_url(research.id, "soft-delete"),
            {"note": "Duplicate"},
        )
        assert resp.status_code == status.HTTP_200_OK

        research.refresh_from_db()
        assert research.is_deleted is True

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.RESEARCH_SOFT_DELETE,
            target_research_id=research.id,
        ).first()
        assert log is not None
        assert log.admin == staff_user

    @pytest.mark.django_db
    def test_non_staff_cannot_soft_delete(self, regular_client, research):
        resp = regular_client.post(_detail_url(research.id, "soft-delete"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# POST /api/admin-panel/researches/<id>/restore/
# ---------------------------------------------------------------------------


class TestRestoreResearch:
    @pytest.mark.django_db
    def test_restore_clears_flag_and_logs(self, staff_client, research_owner, staff_user):
        deleted = Research.all_objects.create(
            owner=research_owner,
            researchName="Deleted Research",
            description="deleted",
            is_deleted=True,
        )
        resp = staff_client.post(_detail_url(deleted.id, "restore"))
        assert resp.status_code == status.HTTP_200_OK

        deleted.refresh_from_db()
        assert deleted.is_deleted is False

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.RESEARCH_RESTORE,
            target_research_id=deleted.id,
        ).first()
        assert log is not None
        assert log.admin == staff_user

    @pytest.mark.django_db
    def test_non_staff_cannot_restore(self, regular_client, research):
        resp = regular_client.post(_detail_url(research.id, "restore"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# PATCH /api/admin-panel/researches/<id>/edit/
# ---------------------------------------------------------------------------


class TestEditResearch:
    @pytest.mark.django_db
    def test_edit_updates_fields_and_logs_changes(self, staff_client, research, staff_user):
        resp = staff_client.patch(
            _detail_url(research.id, "edit"),
            {"researchName": "Updated Name", "description": "Updated description"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "researchName" in resp.data.get("changed", [])

        research.refresh_from_db()
        assert research.researchName == "Updated Name"
        assert research.description == "Updated description"

        log = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.RESEARCH_EDIT,
            target_research_id=research.id,
        ).first()
        assert log is not None
        assert "changed_fields" in log.details
        assert "researchName" in log.details["changed_fields"]

    @pytest.mark.django_db
    def test_edit_no_changes_detected(self, staff_client, research):
        resp = staff_client.patch(
            _detail_url(research.id, "edit"),
            {"researchName": research.researchName},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["detail"] == "No changes detected."
        assert AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.RESEARCH_EDIT,
            target_research_id=research.id,
        ).count() == 0

    @pytest.mark.django_db
    def test_edit_not_found(self, staff_client):
        resp = staff_client.patch(
            _detail_url(999999, "edit"),
            {"researchName": "X"},
            format="json",
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_non_staff_cannot_edit(self, regular_client, research):
        resp = regular_client.patch(
            _detail_url(research.id, "edit"),
            {"researchName": "Hacked"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# POST /api/admin-panel/researches/bulk/
# ---------------------------------------------------------------------------


BULK_URL = "/api/admin-panel/researches/bulk/"


class TestBulkResearchAction:
    @pytest.mark.django_db
    @patch("apps.admin_panel.views.EmailService")
    def test_bulk_approve(self, mock_email, staff_client, research_owner, staff_user):
        r1 = Research.all_objects.create(
            owner=research_owner,
            researchName="R1",
            description="desc",
            moderation_status="pending",
        )
        r2 = Research.all_objects.create(
            owner=research_owner,
            researchName="R2",
            description="desc",
            moderation_status="pending",
        )
        resp = staff_client.post(
            BULK_URL,
            {"ids": [r1.id, r2.id], "action": "approve"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "2 researches updated" in resp.data["detail"]

        r1.refresh_from_db()
        r2.refresh_from_db()
        assert r1.moderation_status == "approved"
        assert r2.moderation_status == "approved"

        logs = AdminActionLog.objects.filter(
            action_type=AdminActionLog.ActionType.RESEARCH_APPROVE,
        )
        assert logs.count() == 2

    @pytest.mark.django_db
    @patch("apps.admin_panel.views.EmailService")
    def test_bulk_reject(self, mock_email, staff_client, research_owner):
        r1 = Research.all_objects.create(
            owner=research_owner,
            researchName="R1",
            description="desc",
            moderation_status="pending",
        )
        resp = staff_client.post(
            BULK_URL,
            {"ids": [r1.id], "action": "reject", "note": "Bad"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        r1.refresh_from_db()
        assert r1.moderation_status == "rejected"

    @pytest.mark.django_db
    def test_bulk_flag(self, staff_client, research_owner):
        r1 = Research.all_objects.create(
            owner=research_owner,
            researchName="R1",
            description="desc",
            moderation_status="pending",
        )
        resp = staff_client.post(
            BULK_URL,
            {"ids": [r1.id], "action": "flag"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        r1.refresh_from_db()
        assert r1.moderation_status == "flagged"

    @pytest.mark.django_db
    def test_bulk_soft_delete(self, staff_client, research_owner):
        r1 = Research.all_objects.create(
            owner=research_owner,
            researchName="R1",
            description="desc",
        )
        resp = staff_client.post(
            BULK_URL,
            {"ids": [r1.id], "action": "soft_delete"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        r1.refresh_from_db()
        assert r1.is_deleted is True

    @pytest.mark.django_db
    def test_bulk_restore(self, staff_client, research_owner):
        r1 = Research.all_objects.create(
            owner=research_owner,
            researchName="R1",
            description="desc",
            is_deleted=True,
        )
        resp = staff_client.post(
            BULK_URL,
            {"ids": [r1.id], "action": "restore"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        r1.refresh_from_db()
        assert r1.is_deleted is False

    @pytest.mark.django_db
    def test_bulk_invalid_action(self, staff_client):
        resp = staff_client.post(
            BULK_URL,
            {"ids": [1], "action": "nuke"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_bulk_empty_ids(self, staff_client):
        resp = staff_client.post(
            BULK_URL,
            {"ids": [], "action": "approve"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_bulk_skips_nonexistent(self, staff_client):
        resp = staff_client.post(
            BULK_URL,
            {"ids": [999999], "action": "flag"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "0 researches updated" in resp.data["detail"]

    @pytest.mark.django_db
    def test_non_staff_cannot_bulk(self, regular_client):
        resp = regular_client.post(
            BULK_URL,
            {"ids": [1], "action": "approve"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
