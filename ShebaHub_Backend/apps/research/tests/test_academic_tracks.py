"""
Tests for the academic_tracks field on Research.

Covers:
- Create research with academic_tracks
- Update research with different academic_tracks
- Retrieve research returns correct array
- Invalid payload (non-list) is rejected
- List with invalid items (non-string) is rejected
- Empty list is accepted
- Duplicates are deduplicated
"""

import json
import pytest
from datetime import date
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import MentorProfile
from apps.research.models import Research

User = get_user_model()

MY_RESEARCHES_URL = '/api/research/me/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def mentor_user(db):
    user = User.objects.create_user(
        email='mentor-tracks@example.com', password='TestPass123!',
        firstName='Mentor', lastName='Tracks', email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace='Sheba Hospital')
    return user


@pytest.fixture
def auth_mentor(api_client, mentor_user):
    api_client.force_authenticate(user=mentor_user)
    return api_client


@pytest.fixture
def valid_research_data():
    return {
        'researchName': 'Academic Tracks Test Research',
        'description': 'A research project to test academic tracks field.',
        'researchArea': 'Neurology',
        'mentors': 'Dr. Test',
        'teamSize': '5',
        'startDate': str(date.today()),
        'weeklyHours': '8',
        'durationMonths': '12',
        'compensation': '["מלגה"]',
        'workMode': 'היברידי',
        'location': 'שיבא',
        'status': 'open',
    }


@pytest.mark.django_db
class TestAcademicTracksCreate:

    def test_create_with_academic_tracks(self, auth_mentor, valid_research_data):
        """Creating research with academic_tracks should persist the array."""
        valid_research_data['academic_tracks'] = json.dumps(["עבודת גמר", "תזה"])
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['academic_tracks'] == ["עבודת גמר", "תזה"]

    def test_create_without_academic_tracks(self, auth_mentor, valid_research_data):
        """Creating research without academic_tracks should default to empty list."""
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['academic_tracks'] == []

    def test_create_with_empty_list(self, auth_mentor, valid_research_data):
        """Empty list is a valid value for academic_tracks."""
        valid_research_data['academic_tracks'] = json.dumps([])
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['academic_tracks'] == []

    def test_create_with_all_options(self, auth_mentor, valid_research_data):
        """All four frontend options should be accepted."""
        tracks = ["עבודת גמר", "תזה", "PhD", "מדעי יסוד"]
        valid_research_data['academic_tracks'] = json.dumps(tracks)
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['academic_tracks'] == tracks


@pytest.mark.django_db
class TestAcademicTracksUpdate:

    def test_update_academic_tracks(self, auth_mentor, valid_research_data):
        """PATCH should update academic_tracks."""
        valid_research_data['academic_tracks'] = json.dumps(["תזה"])
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert resp.status_code == status.HTTP_201_CREATED
        research_id = resp.data['id']

        url = f'{MY_RESEARCHES_URL}{research_id}/'
        resp = auth_mentor.patch(url, {'academic_tracks': json.dumps(["PhD", "מדעי יסוד"])})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['academic_tracks'] == ["PhD", "מדעי יסוד"]

    def test_update_to_empty_list(self, auth_mentor, valid_research_data):
        """Clearing academic_tracks via PATCH should work."""
        valid_research_data['academic_tracks'] = json.dumps(["תזה"])
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        research_id = resp.data['id']

        url = f'{MY_RESEARCHES_URL}{research_id}/'
        resp = auth_mentor.patch(url, {'academic_tracks': json.dumps([])})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['academic_tracks'] == []

    def test_update_preserves_academic_tracks(self, auth_mentor, valid_research_data):
        """PATCH on another field should not clear academic_tracks."""
        valid_research_data['academic_tracks'] = json.dumps(["עבודת גמר", "PhD"])
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        research_id = resp.data['id']

        url = f'{MY_RESEARCHES_URL}{research_id}/'
        resp = auth_mentor.patch(url, {'researchName': 'Updated Name'})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['academic_tracks'] == ["עבודת גמר", "PhD"]


@pytest.mark.django_db
class TestAcademicTracksRetrieval:

    def test_retrieve_returns_academic_tracks(self, auth_mentor, valid_research_data):
        """GET research detail should include academic_tracks."""
        valid_research_data['academic_tracks'] = json.dumps(["תזה", "PhD"])
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        research_id = resp.data['id']

        url = f'{MY_RESEARCHES_URL}{research_id}/'
        resp = auth_mentor.get(url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['academic_tracks'] == ["תזה", "PhD"]


@pytest.mark.django_db
class TestAcademicTracksValidation:

    def test_reject_non_list_value(self, auth_mentor, valid_research_data):
        """A plain string (not JSON list) should be rejected."""
        valid_research_data['academic_tracks'] = 'just a string'
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_reject_list_with_non_string_items(self, auth_mentor, valid_research_data):
        """List containing non-string items should be rejected."""
        valid_research_data['academic_tracks'] = json.dumps([123, True])
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_deduplicate_values(self, auth_mentor, valid_research_data):
        """Duplicate values should be deduplicated."""
        valid_research_data['academic_tracks'] = json.dumps(["תזה", "תזה", "PhD"])
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['academic_tracks'] == ["תזה", "PhD"]
