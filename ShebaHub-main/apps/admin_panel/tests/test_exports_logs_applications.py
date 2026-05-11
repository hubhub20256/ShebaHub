"""
Tests for admin-panel endpoints not yet covered:
- GET /api/admin-panel/researches/export/  (CSV)
- GET /api/admin-panel/users/export/       (CSV)
- GET /api/admin-panel/logs/export/        (CSV)
- GET /api/admin-panel/logs/                (JSON, paginated)
- GET /api/admin-panel/applications/        (JSON, paginated)
- POST /api/admin-panel/applications/<pk>/override/

Security focus:
- All admin endpoints reject anon (401) and non-staff (403).
- override_application validates new_status and audits via AdminActionLog.
- CSV exports respect filters and emit a header row.
"""

import csv
import io

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.admin_panel.models import AdminActionLog
from apps.research.models import Research, ResearchApplication


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="exports_staff@example.com",
        password="StaffPass123!",
        firstName="Staff",
        lastName="Admin",
        is_staff=True,
        email_verified=True,
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email="exports_regular@example.com",
        password="RegularPass123!",
        firstName="Regular",
        lastName="User",
        email_verified=True,
    )


@pytest.fixture
def research_owner(db):
    return User.objects.create_user(
        email="exports_owner@example.com",
        password="OwnerPass123!",
        firstName="Research",
        lastName="Owner",
        email_verified=True,
    )


@pytest.fixture
def applicant(db):
    return User.objects.create_user(
        email="exports_applicant@example.com",
        password="ApplicantPass123!",
        firstName="App",
        lastName="Licant",
        email_verified=True,
    )


@pytest.fixture
def research(db, research_owner):
    return Research.all_objects.create(
        owner=research_owner,
        researchName="Exports Research",
        description="A research used by exports tests.",
        researchArea="Medicine",
        moderation_status="approved",
        status="open",
    )


@pytest.fixture
def soft_deleted_research(db, research_owner):
    return Research.all_objects.create(
        owner=research_owner,
        researchName="Soft Deleted Research",
        description="x",
        researchArea="Cardiology",
        moderation_status="approved",
        is_deleted=True,
    )


@pytest.fixture
def application(db, research, applicant):
    return ResearchApplication.objects.create(
        research=research,
        applicant=applicant,
        status=ResearchApplication.Status.PENDING,
    )


@pytest.fixture
def admin_log(db, staff_user, applicant):
    return AdminActionLog.objects.create(
        admin=staff_user,
        action_type=AdminActionLog.ActionType.USER_DEACTIVATE,
        target_user=applicant,
        note="audit-test",
        details={"reason": "manual"},
    )


@pytest.fixture
def staff_client(staff_user):
    c = APIClient()
    c.force_authenticate(user=staff_user)
    return c


@pytest.fixture
def regular_client(regular_user):
    c = APIClient()
    c.force_authenticate(user=regular_user)
    return c


@pytest.fixture
def anon_client():
    return APIClient()


# ---------------------------------------------------------------------------
# CSV helper
# ---------------------------------------------------------------------------

def _csv_rows(response):
    """
    Decode a CSV HttpResponse into rows, stripping any BOM characters that
    leak through from the production utf-8-sig + explicit \\ufeff combo.
    """
    text = response.content.decode("utf-8")
    rows = list(csv.reader(io.StringIO(text)))
    return [[cell.lstrip("﻿") for cell in row] for row in rows]


# ===========================================================================
# CSV: researches export
# ===========================================================================

@pytest.mark.django_db
class TestExportResearchesCsv:
    URL = "/api/admin-panel/researches/export/"

    def test_anon_gets_401(self, anon_client):
        response = anon_client.get(self.URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_staff_gets_403(self, regular_client):
        response = regular_client.get(self.URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_gets_csv_with_header(self, staff_client, research):
        response = staff_client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        assert response["Content-Type"].startswith("text/csv")
        assert "attachment" in response["Content-Disposition"]
        rows = _csv_rows(response)
        assert rows[0] == [
            "ID", "Name", "Owner Email", "Area",
            "Status", "Moderation", "Created At",
        ]
        names = [r[1] for r in rows[1:]]
        assert research.researchName in names

    def test_default_excludes_soft_deleted(
        self, staff_client, research, soft_deleted_research
    ):
        response = staff_client.get(self.URL)
        rows = _csv_rows(response)
        names = [r[1] for r in rows[1:]]
        assert research.researchName in names
        assert soft_deleted_research.researchName not in names

    def test_include_deleted_returns_them(
        self, staff_client, research, soft_deleted_research
    ):
        response = staff_client.get(self.URL, {"include_deleted": "true"})
        rows = _csv_rows(response)
        names = [r[1] for r in rows[1:]]
        assert soft_deleted_research.researchName in names

    def test_search_filters_by_name(
        self, staff_client, research, soft_deleted_research
    ):
        response = staff_client.get(
            self.URL, {"include_deleted": "true", "search": "Soft"}
        )
        rows = _csv_rows(response)
        names = [r[1] for r in rows[1:]]
        assert soft_deleted_research.researchName in names
        assert research.researchName not in names

    def test_moderation_status_filter(
        self, staff_client, research, research_owner
    ):
        Research.all_objects.create(
            owner=research_owner,
            researchName="Pending One",
            description="x",
            moderation_status="pending",
        )
        response = staff_client.get(self.URL, {"moderation_status": "pending"})
        rows = _csv_rows(response)
        names = [r[1] for r in rows[1:]]
        assert "Pending One" in names
        assert research.researchName not in names


# ===========================================================================
# CSV: users export
# ===========================================================================

@pytest.mark.django_db
class TestExportUsersCsv:
    URL = "/api/admin-panel/users/export/"

    def test_anon_gets_401(self, anon_client):
        assert anon_client.get(self.URL).status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_staff_gets_403(self, regular_client):
        assert regular_client.get(self.URL).status_code == status.HTTP_403_FORBIDDEN

    def test_staff_gets_csv_with_header(self, staff_client, regular_user):
        response = staff_client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        rows = _csv_rows(response)
        assert rows[0] == [
            "Email", "First Name", "Last Name", "Active",
            "Staff", "Email Verified", "Date Joined",
        ]
        emails = [r[0] for r in rows[1:]]
        assert regular_user.email in emails

    def test_search_filter(self, staff_client, regular_user, applicant):
        response = staff_client.get(self.URL, {"search": regular_user.email})
        rows = _csv_rows(response)
        emails = [r[0] for r in rows[1:]]
        assert regular_user.email in emails
        assert applicant.email not in emails

    def test_is_active_filter_excludes_inactive(
        self, staff_client, regular_user, applicant
    ):
        applicant.is_active = False
        applicant.save(update_fields=["is_active"])
        response = staff_client.get(self.URL, {"is_active": "true"})
        rows = _csv_rows(response)
        emails = [r[0] for r in rows[1:]]
        assert regular_user.email in emails
        assert applicant.email not in emails


# ===========================================================================
# CSV: logs export
# ===========================================================================

@pytest.mark.django_db
class TestExportLogsCsv:
    URL = "/api/admin-panel/logs/export/"

    def test_anon_gets_401(self, anon_client):
        assert anon_client.get(self.URL).status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_staff_gets_403(self, regular_client):
        assert regular_client.get(self.URL).status_code == status.HTTP_403_FORBIDDEN

    def test_staff_gets_csv_with_header(self, staff_client, admin_log):
        response = staff_client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        rows = _csv_rows(response)
        assert rows[0] == [
            "Date", "Action Type", "Admin Email",
            "Target User Email", "Research ID", "Note",
        ]
        actions = [r[1] for r in rows[1:]]
        assert admin_log.action_type in actions

    def test_action_type_filter(self, staff_client, admin_log, staff_user, applicant):
        AdminActionLog.objects.create(
            admin=staff_user,
            action_type=AdminActionLog.ActionType.USER_REACTIVATE,
            target_user=applicant,
            note="other",
        )
        response = staff_client.get(self.URL, {"action_type": admin_log.action_type})
        rows = _csv_rows(response)
        actions = {r[1] for r in rows[1:]}
        assert actions == {admin_log.action_type}


# ===========================================================================
# JSON: list logs
# ===========================================================================

@pytest.mark.django_db
class TestListLogs:
    URL = "/api/admin-panel/logs/"

    def test_anon_gets_401(self, anon_client):
        assert anon_client.get(self.URL).status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_staff_gets_403(self, regular_client):
        assert regular_client.get(self.URL).status_code == status.HTTP_403_FORBIDDEN

    def test_staff_gets_paginated_results(self, staff_client, admin_log):
        response = staff_client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        # Paginated: dict with results / count
        assert "results" in response.data
        action_types = {item["action_type"] for item in response.data["results"]}
        assert admin_log.action_type in action_types

    def test_action_type_filter_narrows(
        self, staff_client, admin_log, staff_user, applicant
    ):
        other = AdminActionLog.objects.create(
            admin=staff_user,
            action_type=AdminActionLog.ActionType.USER_REACTIVATE,
            target_user=applicant,
        )
        response = staff_client.get(self.URL, {"action_type": admin_log.action_type})
        assert response.status_code == status.HTTP_200_OK
        action_types = {item["action_type"] for item in response.data["results"]}
        assert action_types == {admin_log.action_type}
        assert other.action_type not in action_types


# ===========================================================================
# JSON: list applications
# ===========================================================================

@pytest.mark.django_db
class TestListApplications:
    URL = "/api/admin-panel/applications/"

    def test_anon_gets_401(self, anon_client):
        assert anon_client.get(self.URL).status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_staff_gets_403(self, regular_client):
        assert regular_client.get(self.URL).status_code == status.HTTP_403_FORBIDDEN

    def test_staff_gets_paginated_results(self, staff_client, application):
        response = staff_client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        ids = [item["id"] for item in response.data["results"]]
        assert application.id in ids

    def test_status_filter(self, staff_client, application, research, applicant):
        # Add a second applicant in a different status
        other = User.objects.create_user(
            email="other_app@example.com", password="X", email_verified=True,
        )
        ResearchApplication.objects.create(
            research=research, applicant=other,
            status=ResearchApplication.Status.APPROVED,
        )
        response = staff_client.get(self.URL, {"status": "pending"})
        assert response.status_code == status.HTTP_200_OK
        statuses = {item["status"] for item in response.data["results"]}
        assert statuses == {"pending"}

    def test_research_id_filter(
        self, staff_client, application, research, applicant, research_owner
    ):
        other_research = Research.all_objects.create(
            owner=research_owner, researchName="Other", description="x",
            moderation_status="approved",
        )
        ResearchApplication.objects.create(
            research=other_research, applicant=applicant,
            status=ResearchApplication.Status.PENDING,
        )
        response = staff_client.get(self.URL, {"research_id": research.id})
        assert response.status_code == status.HTTP_200_OK
        for item in response.data["results"]:
            # research field on serializer is the id reference; verify by lookup
            assert ResearchApplication.objects.get(id=item["id"]).research_id == research.id

    def test_search_filter_on_applicant_email(
        self, staff_client, application, applicant
    ):
        response = staff_client.get(self.URL, {"search": applicant.email})
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert application.id in ids


# ===========================================================================
# Override application
# ===========================================================================

@pytest.mark.django_db
class TestOverrideApplication:
    def _url(self, pk):
        return f"/api/admin-panel/applications/{pk}/override/"

    def test_anon_gets_401(self, anon_client, application):
        response = anon_client.post(
            self._url(application.id), {"new_status": "approved"}, format="json"
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_staff_gets_403(self, regular_client, application):
        response = regular_client.post(
            self._url(application.id), {"new_status": "approved"}, format="json"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_overrides_to_approved(self, staff_client, application, staff_user):
        response = staff_client.post(
            self._url(application.id), {"new_status": "approved"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        application.refresh_from_db()
        assert application.status == "approved"

        # Audit log row created with the override action type.
        log = AdminActionLog.objects.filter(
            admin=staff_user,
            action_type=AdminActionLog.ActionType.APPLICATION_OVERRIDE,
        ).order_by("-created_at").first()
        assert log is not None
        assert log.target_user_id == application.applicant_id
        assert log.target_research_id == application.research_id
        assert log.details.get("new_status") == "approved"
        assert log.details.get("old_status") == "pending"

    def test_staff_overrides_to_rejected(self, staff_client, application):
        response = staff_client.post(
            self._url(application.id), {"new_status": "rejected"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        application.refresh_from_db()
        assert application.status == "rejected"

    def test_invalid_status_returns_400(self, staff_client, application):
        response = staff_client.post(
            self._url(application.id), {"new_status": "not-a-status"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_status_returns_400(self, staff_client, application):
        response = staff_client.post(
            self._url(application.id), {}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_application_not_found_returns_404(self, staff_client):
        response = staff_client.post(
            self._url(999999), {"new_status": "approved"}, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_with_note_saves_mentor_note(self, staff_client, application):
        response = staff_client.post(
            self._url(application.id),
            {"new_status": "approved", "note": "force-approved via admin"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        application.refresh_from_db()
        assert application.mentor_note == "force-approved via admin"
