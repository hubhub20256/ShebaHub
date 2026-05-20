"""
Tests for backend-side query-param filtering on the research list endpoint.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.research.models import Research

User = get_user_model()

RESEARCH_URL = '/api/research/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user(db):
    return User.objects.create_user(
        email='rfilter_viewer@example.com', password='TestPass123!',
        firstName='Viewer', lastName='Test', email_verified=True,
    )


@pytest.fixture
def research_data(db):
    owner = User.objects.create_user(
        email='rfilter_owner@example.com', password='TestPass123!',
        firstName='Owner', lastName='Test', email_verified=True,
    )

    r1 = Research.objects.create(
        owner=owner, researchName='Cardiac Study Alpha',
        description='A study about hearts', researchArea='Cardiology',
        status='open', moderation_status='approved',
    )
    r2 = Research.objects.create(
        owner=owner, researchName='Neuro Imaging Beta',
        description='Brain imaging research', researchArea='Neurology',
        status='in_progress', moderation_status='approved',
    )
    r3 = Research.objects.create(
        owner=owner, researchName='Pending Research',
        description='Should not appear', researchArea='Cardiology',
        status='open', moderation_status='pending',
    )
    return {'r1': r1, 'r2': r2, 'r3_pending': r3}


@pytest.mark.django_db
class TestResearchListFilters:

    def test_no_filter_returns_approved_only(self, api_client, auth_user, research_data):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(RESEARCH_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2

    def test_filter_by_q_name(self, api_client, auth_user, research_data):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(RESEARCH_URL, {'q': 'Cardiac'})
        assert len(resp.data) == 1
        assert resp.data[0]['researchName'] == 'Cardiac Study Alpha'

    def test_filter_by_q_description(self, api_client, auth_user, research_data):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(RESEARCH_URL, {'q': 'Brain'})
        assert len(resp.data) == 1

    def test_filter_by_q_case_insensitive(self, api_client, auth_user, research_data):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(RESEARCH_URL, {'q': 'cardiac'})
        assert len(resp.data) == 1

    def test_filter_by_area(self, api_client, auth_user, research_data):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(RESEARCH_URL, {'area': 'Cardiology'})
        assert len(resp.data) == 1

    def test_filter_by_area_partial(self, api_client, auth_user, research_data):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(RESEARCH_URL, {'area': 'Neuro'})
        assert len(resp.data) == 1

    def test_filter_by_status(self, api_client, auth_user, research_data):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(RESEARCH_URL, {'status': 'open'})
        assert len(resp.data) == 1
        assert resp.data[0]['researchName'] == 'Cardiac Study Alpha'

    def test_filter_by_status_in_progress(self, api_client, auth_user, research_data):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(RESEARCH_URL, {'status': 'in_progress'})
        assert len(resp.data) == 1

    def test_filter_no_match(self, api_client, auth_user, research_data):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(RESEARCH_URL, {'q': 'nonexistent'})
        assert len(resp.data) == 0

    def test_combined_filters(self, api_client, auth_user, research_data):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(RESEARCH_URL, {'area': 'Cardiology', 'status': 'open'})
        assert len(resp.data) == 1

    def test_pending_research_never_appears(self, api_client, auth_user, research_data):
        """Even with matching filters, pending research should not appear."""
        api_client.force_authenticate(auth_user)
        resp = api_client.get(RESEARCH_URL, {'q': 'Pending'})
        assert len(resp.data) == 0
