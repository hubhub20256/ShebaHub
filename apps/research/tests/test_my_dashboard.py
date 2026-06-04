"""
Tests for the applicant-side research dashboard endpoints:

- GET /api/research/<id>/my-application/
- GET /api/research/joined/
- GET /api/research/my-applications/

Focus: scoping, permission boundaries, status filtering, response shape,
and ordering. The current production behavior around soft-deleted researches
is intentionally inconsistent across these endpoints; tests document each
side as-is and DO NOT lock in any judgment about which one is "right".
"""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import Institution, MentorProfile, StudentProfile
from apps.research.models import Research, ResearchApplication

User = get_user_model()

JOINED_URL = "/api/research/joined/"
DASHBOARD_URL = "/api/research/my-applications/"


def _my_app_url(research_id):
    return f"/api/research/{research_id}/my-application/"


# ---------------------------------------------------------------------------
# Fixtures (mirrors test_tasks.py / test_chat.py)
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name="Dashboard Institution", name_he="מוסד לדאשבורד", is_active=True,
    )


@pytest.fixture
def mentor_owner(db):
    user = User.objects.create_user(
        email="dash_owner@example.com", password="TestPass123!",
        firstName="Owner", lastName="Mentor", email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace="Sheba Hospital")
    return user


@pytest.fixture
def student_user(db, institution):
    user = User.objects.create_user(
        email="dash_student@example.com", password="TestPass123!",
        firstName="Dash", lastName="Student", email_verified=True,
    )
    StudentProfile.objects.create(
        user=user, institution=institution, isAvailableForResearch=True,
    )
    return user


@pytest.fixture
def outsider(db, institution):
    """Another authenticated user with a profile but unrelated to research."""
    user = User.objects.create_user(
        email="dash_outsider@example.com", password="TestPass123!",
        firstName="Out", lastName="Sider", email_verified=True,
    )
    StudentProfile.objects.create(
        user=user, institution=institution, isAvailableForResearch=True,
    )
    return user


@pytest.fixture
def profileless_user(db):
    """Authenticated but no Student/Mentor profile — RequireProfile blocks."""
    return User.objects.create_user(
        email="dash_profileless@example.com", password="TestPass123!",
        firstName="No", lastName="Profile", email_verified=True,
    )


@pytest.fixture
def research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner,
        researchName="Dashboard Research",
        description="A research used by dashboard tests.",
        researchArea="Cardiology",
        status="open",
        moderation_status="approved",
        accepting_applications=True,
    )


@pytest.fixture
def second_research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner,
        researchName="Second Research",
        description="Second research for ordering checks.",
        researchArea="Neurology",
        status="open",
        moderation_status="approved",
    )


def _app(research, user, status_value, **extra):
    """Build an application in any state."""
    return ResearchApplication.objects.create(
        research=research, applicant=user, status=status_value, **extra,
    )


# ===========================================================================
# my_application_status
# ===========================================================================

@pytest.mark.django_db
class TestMyApplicationStatus:
    def test_unauthenticated_returns_401(self, api_client, research):
        response = api_client.get(_my_app_url(research.id))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_research_not_found_returns_404(self, api_client, student_user):
        api_client.force_authenticate(user=student_user)
        response = api_client.get(_my_app_url(999999))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_no_application_returns_404(
        self, api_client, student_user, research
    ):
        api_client.force_authenticate(user=student_user)
        response = api_client.get(_my_app_url(research.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_returns_application_for_pending_state(
        self, api_client, student_user, research
    ):
        app = _app(research, student_user, ResearchApplication.Status.PENDING)
        api_client.force_authenticate(user=student_user)
        response = api_client.get(_my_app_url(research.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == app.id
        assert response.data["status"] == "pending"

    def test_returns_application_for_approved_state(
        self, api_client, student_user, research
    ):
        _app(research, student_user, ResearchApplication.Status.APPROVED)
        api_client.force_authenticate(user=student_user)
        response = api_client.get(_my_app_url(research.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "approved"

    @pytest.mark.parametrize(
        "state",
        [
            ResearchApplication.Status.REJECTED,
            ResearchApplication.Status.CANCELLED,
            ResearchApplication.Status.INVITED,
            ResearchApplication.Status.REMOVED,
        ],
    )
    def test_returns_application_for_other_states(
        self, api_client, student_user, research, state
    ):
        """
        my_application_status returns the row regardless of its state.
        Frontend is responsible for interpreting cancelled/rejected/etc.
        """
        _app(research, student_user, state)
        api_client.force_authenticate(user=student_user)
        response = api_client.get(_my_app_url(research.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == state

    def test_soft_deleted_research_returns_404(
        self, api_client, student_user, research
    ):
        """
        Documents current behavior: my_application_status uses Research.objects
        (default manager), which excludes is_deleted=True. So a user with an
        active application against a soft-deleted research gets 404 here,
        even though the same application still surfaces in
        my_applications_dashboard. Inconsistent across endpoints — not fixed.
        """
        _app(research, student_user, ResearchApplication.Status.APPROVED)
        research.is_deleted = True
        research.save(update_fields=["is_deleted"])
        api_client.force_authenticate(user=student_user)
        response = api_client.get(_my_app_url(research.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ===========================================================================
# my_joined_researches
# ===========================================================================

@pytest.mark.django_db
class TestMyJoinedResearches:
    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get(JOINED_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_user_without_profile_can_access_empty_list(
        self, api_client, profileless_user
    ):
        """
        Documents current behavior. The view declares
        @permission_classes([IsAuthenticated]) which REPLACES (not appends to)
        the global DEFAULT_PERMISSION_CLASSES, so RequireProfile is dropped
        for this view. A profileless authenticated user can reach the
        endpoint and gets a 200 with their (empty) joined list. No data leak
        because the query is scoped to request.user.
        """
        api_client.force_authenticate(user=profileless_user)
        response = api_client.get(JOINED_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_returns_empty_when_no_approved_applications(
        self, api_client, student_user
    ):
        api_client.force_authenticate(user=student_user)
        response = api_client.get(JOINED_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_includes_research_for_approved_application(
        self, api_client, student_user, research
    ):
        _app(research, student_user, ResearchApplication.Status.APPROVED)
        api_client.force_authenticate(user=student_user)
        response = api_client.get(JOINED_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [r["id"] for r in response.data]
        assert research.id in ids

    @pytest.mark.parametrize(
        "state",
        [
            ResearchApplication.Status.PENDING,
            ResearchApplication.Status.REJECTED,
            ResearchApplication.Status.CANCELLED,
            ResearchApplication.Status.INVITED,
            ResearchApplication.Status.REMOVED,
        ],
    )
    def test_excludes_non_approved_states(
        self, api_client, student_user, research, state
    ):
        _app(research, student_user, state)
        api_client.force_authenticate(user=student_user)
        response = api_client.get(JOINED_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [r["id"] for r in response.data]
        assert research.id not in ids

    def test_owner_without_approved_application_does_not_see_own_research(
        self, api_client, mentor_owner, research
    ):
        """
        my_joined_researches is an applicant view: owners don't appear unless
        they happen to also have an APPROVED application (which the system
        blocks elsewhere — owners cannot apply to their own research).
        """
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(JOINED_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [r["id"] for r in response.data]
        assert research.id not in ids

    def test_descending_created_at_ordering(
        self, api_client, student_user, mentor_owner
    ):
        # Create the older one first, then the newer one.
        older = Research.objects.create(
            owner=mentor_owner, researchName="Older",
            description="x", status="open", moderation_status="approved",
        )
        newer = Research.objects.create(
            owner=mentor_owner, researchName="Newer",
            description="y", status="open", moderation_status="approved",
        )
        # Push `older` further into the past so the ordering is unambiguous.
        Research.objects.filter(pk=older.pk).update(
            created_at=timezone.now() - timedelta(days=2)
        )
        Research.objects.filter(pk=newer.pk).update(
            created_at=timezone.now() - timedelta(hours=1)
        )
        _app(older, student_user, ResearchApplication.Status.APPROVED)
        _app(newer, student_user, ResearchApplication.Status.APPROVED)

        api_client.force_authenticate(user=student_user)
        response = api_client.get(JOINED_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [r["id"] for r in response.data]
        assert ids == [newer.id, older.id]

    def test_soft_deleted_research_excluded_even_with_approved_app(
        self, api_client, student_user, research
    ):
        """
        Documents current behavior: Research.objects excludes soft-deleted,
        so a soft-deleted research is silently dropped from joined even when
        the user still has an APPROVED application. (Compare to dashboard,
        which still surfaces the application.)
        """
        _app(research, student_user, ResearchApplication.Status.APPROVED)
        research.is_deleted = True
        research.save(update_fields=["is_deleted"])

        api_client.force_authenticate(user=student_user)
        response = api_client.get(JOINED_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [r["id"] for r in response.data]
        assert research.id not in ids


# ===========================================================================
# my_applications_dashboard
# ===========================================================================

@pytest.mark.django_db
class TestMyApplicationsDashboard:
    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get(DASHBOARD_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_user_without_profile_can_access_empty_list(
        self, api_client, profileless_user
    ):
        """
        Same RequireProfile-replaced-by-decorator note as in
        TestMyJoinedResearches.test_user_without_profile_can_access_empty_list.
        Profileless authenticated user gets 200 with an empty list.
        """
        api_client.force_authenticate(user=profileless_user)
        response = api_client.get(DASHBOARD_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_returns_empty_when_no_applications(self, api_client, student_user):
        api_client.force_authenticate(user=student_user)
        response = api_client.get(DASHBOARD_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_returns_all_states_by_default(
        self, api_client, student_user, mentor_owner
    ):
        """
        With no `status` query param (or status=all), every application of
        the current user is returned regardless of state.
        """
        states = [
            ResearchApplication.Status.PENDING,
            ResearchApplication.Status.APPROVED,
            ResearchApplication.Status.REJECTED,
            ResearchApplication.Status.CANCELLED,
            ResearchApplication.Status.INVITED,
            ResearchApplication.Status.REMOVED,
        ]
        for s in states:
            r = Research.objects.create(
                owner=mentor_owner,
                researchName=f"R-{s}",
                description="x",
                status="open",
                moderation_status="approved",
            )
            _app(r, student_user, s)

        api_client.force_authenticate(user=student_user)
        response = api_client.get(DASHBOARD_URL)
        assert response.status_code == status.HTTP_200_OK
        returned_states = sorted(item["status"] for item in response.data)
        assert returned_states == sorted(states)

    def test_response_shape_matches_contract(
        self, api_client, student_user, research
    ):
        app = _app(
            research, student_user, ResearchApplication.Status.PENDING,
            mentor_note="note from mentor",
        )
        api_client.force_authenticate(user=student_user)
        response = api_client.get(DASHBOARD_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        item = response.data[0]
        # Top-level fields
        assert set(["id", "status", "created_at", "updated_at",
                    "mentor_note", "research"]).issubset(set(item.keys()))
        assert item["id"] == app.id
        assert item["status"] == "pending"
        assert item["mentor_note"] == "note from mentor"
        # Nested research fields
        nested = item["research"]
        assert set(["id", "researchName", "researchArea", "status"]).issubset(
            set(nested.keys())
        )
        assert nested["id"] == research.id
        assert nested["researchName"] == research.researchName
        assert nested["researchArea"] == research.researchArea
        assert nested["status"] == research.status

    def test_mentor_note_present_when_set(
        self, api_client, student_user, research
    ):
        _app(
            research, student_user, ResearchApplication.Status.REJECTED,
            mentor_note="needs more clinical hours",
        )
        api_client.force_authenticate(user=student_user)
        response = api_client.get(DASHBOARD_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data[0]["mentor_note"] == "needs more clinical hours"

    @pytest.mark.parametrize(
        "state",
        [
            ResearchApplication.Status.PENDING,
            ResearchApplication.Status.APPROVED,
            ResearchApplication.Status.REJECTED,
            ResearchApplication.Status.CANCELLED,
            ResearchApplication.Status.INVITED,
            ResearchApplication.Status.REMOVED,
        ],
    )
    def test_filter_by_status_each_state(
        self, api_client, student_user, mentor_owner, research, state
    ):
        # Application in the target state.
        _app(research, student_user, state)
        # Plus a second application in a DIFFERENT state, on a separate
        # research, so the filter has something to exclude.
        other_state = (
            ResearchApplication.Status.APPROVED
            if state != ResearchApplication.Status.APPROVED
            else ResearchApplication.Status.PENDING
        )
        other_research = Research.objects.create(
            owner=mentor_owner, researchName="Other R",
            description="x", status="open", moderation_status="approved",
        )
        _app(other_research, student_user, other_state)

        api_client.force_authenticate(user=student_user)
        response = api_client.get(DASHBOARD_URL, {"status": state})
        assert response.status_code == status.HTTP_200_OK
        statuses = {item["status"] for item in response.data}
        assert statuses == {state}

    def test_status_all_returns_everything(
        self, api_client, student_user, research, second_research
    ):
        _app(research, student_user, ResearchApplication.Status.PENDING)
        _app(second_research, student_user, ResearchApplication.Status.APPROVED)
        api_client.force_authenticate(user=student_user)
        response = api_client.get(DASHBOARD_URL, {"status": "all"})
        assert response.status_code == status.HTTP_200_OK
        statuses = sorted(item["status"] for item in response.data)
        assert statuses == ["approved", "pending"]

    def test_invalid_status_returns_400(self, api_client, student_user):
        api_client.force_authenticate(user=student_user)
        response = api_client.get(DASHBOARD_URL, {"status": "not-a-state"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_only_returns_current_users_applications(
        self, api_client, student_user, outsider, research
    ):
        _app(research, student_user, ResearchApplication.Status.PENDING)
        _app(research, outsider, ResearchApplication.Status.PENDING)
        api_client.force_authenticate(user=student_user)
        response = api_client.get(DASHBOARD_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        # Only the current user's application id; the other user's is excluded.
        my_app_id = ResearchApplication.objects.get(
            research=research, applicant=student_user
        ).id
        assert response.data[0]["id"] == my_app_id

    def test_descending_created_at_ordering(
        self, api_client, student_user, research, second_research
    ):
        older_app = _app(
            research, student_user, ResearchApplication.Status.PENDING,
        )
        newer_app = _app(
            second_research, student_user, ResearchApplication.Status.PENDING,
        )
        ResearchApplication.objects.filter(pk=older_app.pk).update(
            created_at=timezone.now() - timedelta(days=2)
        )
        ResearchApplication.objects.filter(pk=newer_app.pk).update(
            created_at=timezone.now() - timedelta(hours=1)
        )

        api_client.force_authenticate(user=student_user)
        response = api_client.get(DASHBOARD_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data]
        assert ids == [newer_app.id, older_app.id]

    def test_soft_deleted_research_application_still_appears(
        self, api_client, student_user, research
    ):
        """
        Documents current behavior: my_applications_dashboard does NOT filter
        out applications whose research has been soft-deleted. The application
        row stays visible (with its embedded research dict). Compare to
        my_joined_researches and my_application_status, which do hide it.
        Inconsistent across endpoints — not fixed.
        """
        _app(research, student_user, ResearchApplication.Status.APPROVED)
        research.is_deleted = True
        research.save(update_fields=["is_deleted"])

        api_client.force_authenticate(user=student_user)
        response = api_client.get(DASHBOARD_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["research"]["id"] == research.id
