"""
Tests for research listing and detail visibility.

Covers:
- GET /api/research/ lists only approved researches, ordered by status priority
- GET /api/research/<id>/ returns detail for approved research
- GET /api/research/<id>/ hides flagged/rejected from non-owner (404)
- GET /api/research/<id>/ hides drafts from non-owner (404)
- GET /api/research/<id>/ owner CAN see own flagged/rejected/draft
- GET /api/research/<id>/ staff CAN see flagged/rejected
- Unauthenticated access returns 401
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import MentorProfile
from apps.research.models import Research

User = get_user_model()

RESEARCH_LIST_URL = '/api/research/'


def _detail_url(research_id):
    return f'/api/research/{research_id}/'


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def mentor_owner(db):
    """Mentor who owns a research."""
    user = User.objects.create_user(
        email='vis_owner@example.com', password='TestPass123!',
        firstName='Vis', lastName='Owner', email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace='Sheba')
    return user


@pytest.fixture
def regular_user(db):
    """An authenticated user who is not the owner or staff."""
    return User.objects.create_user(
        email='vis_regular@example.com', password='TestPass123!',
        firstName='Vis', lastName='Regular', email_verified=True,
    )


@pytest.fixture
def staff_user(db):
    """A staff user."""
    return User.objects.create_user(
        email='vis_staff@example.com', password='TestPass123!',
        firstName='Vis', lastName='Staff', email_verified=True,
        is_staff=True,
    )


@pytest.fixture
def approved_open_research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner, researchName='Open Research',
        description='Open and approved.', status='open',
        moderation_status='approved',
    )


@pytest.fixture
def approved_in_progress_research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner, researchName='In Progress Research',
        description='In progress and approved.', status='in_progress',
        moderation_status='approved',
    )


@pytest.fixture
def approved_completed_research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner, researchName='Completed Research',
        description='Completed and approved.', status='completed',
        moderation_status='approved',
    )


@pytest.fixture
def flagged_research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner, researchName='Flagged Research',
        description='Flagged by admin.', status='open',
        moderation_status='flagged',
    )


@pytest.fixture
def rejected_research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner, researchName='Rejected Research',
        description='Rejected by admin.', status='open',
        moderation_status='rejected',
    )


@pytest.fixture
def draft_research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner, researchName='Draft Research',
        description='A draft research.', status='draft',
        moderation_status='approved',
    )


@pytest.fixture
def pending_moderation_research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner, researchName='Pending Research',
        description='Pending moderation.', status='open',
        moderation_status='pending',
    )


# ---------------------------------------------------------------------------
# Listing tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestResearchListing:

    def test_list_returns_only_approved_researches(
        self, api_client, regular_user,
        approved_open_research, flagged_research, rejected_research,
        pending_moderation_research, draft_research,
    ):
        """GET /api/research/ returns only moderation_status='approved' researches."""
        api_client.force_authenticate(user=regular_user)
        response = api_client.get(RESEARCH_LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        returned_ids = {r['id'] for r in response.data}
        # Only approved ones should be returned (open + draft both have moderation_status=approved)
        assert approved_open_research.id in returned_ids
        assert draft_research.id in returned_ids  # draft but moderation_status=approved
        assert flagged_research.id not in returned_ids
        assert rejected_research.id not in returned_ids
        assert pending_moderation_research.id not in returned_ids

    def test_list_ordered_by_status_priority(
        self, api_client, regular_user,
        approved_open_research, approved_in_progress_research, approved_completed_research,
    ):
        """Listing is ordered: open first, then in_progress, then completed."""
        api_client.force_authenticate(user=regular_user)
        response = api_client.get(RESEARCH_LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [r['id'] for r in response.data]
        # Open should come before in_progress, which should come before completed
        assert ids.index(approved_open_research.id) < ids.index(approved_in_progress_research.id)
        assert ids.index(approved_in_progress_research.id) < ids.index(approved_completed_research.id)

    def test_list_unauthenticated_returns_401(self, api_client):
        """Unauthenticated request returns 401."""
        response = api_client.get(RESEARCH_LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Detail visibility tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestResearchDetailVisibility:

    def test_approved_research_visible_to_any_user(self, api_client, regular_user, approved_open_research):
        """Any authenticated user can see an approved research."""
        api_client.force_authenticate(user=regular_user)
        response = api_client.get(_detail_url(approved_open_research.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == approved_open_research.id

    def test_flagged_research_hidden_from_non_owner(self, api_client, regular_user, flagged_research):
        """Flagged research returns 404 for non-owner."""
        api_client.force_authenticate(user=regular_user)
        response = api_client.get(_detail_url(flagged_research.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_rejected_research_hidden_from_non_owner(self, api_client, regular_user, rejected_research):
        """Rejected research returns 404 for non-owner."""
        api_client.force_authenticate(user=regular_user)
        response = api_client.get(_detail_url(rejected_research.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_draft_research_hidden_from_non_owner(self, api_client, regular_user, draft_research):
        """Draft research returns 404 for non-owner."""
        api_client.force_authenticate(user=regular_user)
        response = api_client.get(_detail_url(draft_research.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_owner_can_see_flagged_research(self, api_client, mentor_owner, flagged_research):
        """Owner can see their own flagged research."""
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(_detail_url(flagged_research.id))
        assert response.status_code == status.HTTP_200_OK

    def test_owner_can_see_rejected_research(self, api_client, mentor_owner, rejected_research):
        """Owner can see their own rejected research."""
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(_detail_url(rejected_research.id))
        assert response.status_code == status.HTTP_200_OK

    def test_owner_can_see_draft_research(self, api_client, mentor_owner, draft_research):
        """Owner can see their own draft research."""
        api_client.force_authenticate(user=mentor_owner)
        response = api_client.get(_detail_url(draft_research.id))
        assert response.status_code == status.HTTP_200_OK

    def test_staff_can_see_flagged_research(self, api_client, staff_user, flagged_research):
        """Staff can see flagged research."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.get(_detail_url(flagged_research.id))
        assert response.status_code == status.HTTP_200_OK

    def test_staff_can_see_rejected_research(self, api_client, staff_user, rejected_research):
        """Staff can see rejected research."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.get(_detail_url(rejected_research.id))
        assert response.status_code == status.HTTP_200_OK

    def test_staff_can_see_draft_research(self, api_client, staff_user, draft_research):
        """Staff can see draft research (treated as owner/staff)."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.get(_detail_url(draft_research.id))
        assert response.status_code == status.HTTP_200_OK

    def test_nonexistent_research_returns_404(self, api_client, regular_user):
        """Non-existent research returns 404."""
        api_client.force_authenticate(user=regular_user)
        response = api_client.get(_detail_url(99999))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_detail_unauthenticated_returns_401(self, api_client, approved_open_research):
        """Unauthenticated request to detail returns 401."""
        response = api_client.get(_detail_url(approved_open_research.id))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_detail_returns_correct_fields(self, api_client, regular_user, approved_open_research):
        """Detail response includes expected fields."""
        api_client.force_authenticate(user=regular_user)
        response = api_client.get(_detail_url(approved_open_research.id))
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert 'id' in data
        assert 'researchName' in data
        assert 'description' in data
        assert 'status' in data
        assert 'moderation_status' in data
        assert 'ownerId' in data
        assert 'ownerName' in data
