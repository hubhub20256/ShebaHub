"""
Tests for research creation and editing (Task 3).

Covers:
- Research creation with the updated frontend payload (past dates allowed)
- Research editing works correctly
- Past startDate is now accepted
- Past estimatedCompletionDate is now accepted
- End date must still be after start date
"""

import pytest
from datetime import date, timedelta
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
        email='mentor@example.com', password='TestPass123!',
        firstName='Mentor', lastName='User', email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace='Sheba Hospital')
    return user


@pytest.fixture
def auth_mentor(api_client, mentor_user):
    api_client.force_authenticate(user=mentor_user)
    return api_client


@pytest.fixture
def valid_research_data():
    """Minimal valid research payload matching the frontend form."""
    return {
        'researchName': 'Test Research Project',
        'description': 'This is a test research project with a detailed description.',
        'researchArea': 'Cardiology',
        'mentors': 'Dr. Smith',
        'teamSize': '3',
        'startDate': str(date.today()),
        'weeklyHours': '10',
        'durationMonths': '6',
        'compensation': '["מלגה"]',
        'workMode': 'היברידי',
        'location': 'שיבא',
        'status': 'open',
    }


@pytest.mark.django_db
class TestResearchCreation:

    def test_create_research_with_valid_data(self, auth_mentor, valid_research_data):
        """Research creation with standard frontend payload should succeed."""
        response = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['researchName'] == 'Test Research Project'

    def test_create_research_with_past_start_date(self, auth_mentor, valid_research_data):
        """Frontend allows past start dates (for ongoing research). Backend must accept."""
        valid_research_data['startDate'] = str(date.today() - timedelta(days=90))
        response = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_research_with_past_completion_date(self, auth_mentor, valid_research_data):
        """Past completion dates should be accepted (for completed research)."""
        past_start = date.today() - timedelta(days=180)
        past_end = date.today() - timedelta(days=30)
        valid_research_data['startDate'] = str(past_start)
        valid_research_data['estimatedCompletionDate'] = str(past_end)
        response = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert response.status_code == status.HTTP_201_CREATED

    def test_end_date_must_be_after_start_date(self, auth_mentor, valid_research_data):
        """Cross-validation: end date before start date should still fail."""
        valid_research_data['startDate'] = str(date.today())
        valid_research_data['estimatedCompletionDate'] = str(date.today() - timedelta(days=1))
        response = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_without_name_fails(self, auth_mentor, valid_research_data):
        """researchName is required."""
        del valid_research_data['researchName']
        response = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_without_description_fails(self, auth_mentor, valid_research_data):
        """description is required."""
        del valid_research_data['description']
        response = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestResearchEdit:

    def test_edit_research_name(self, auth_mentor, mentor_user, valid_research_data):
        """PATCH should update research fields."""
        # Create first
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert resp.status_code == status.HTTP_201_CREATED
        research_id = resp.data['id']

        # Edit
        url = f'{MY_RESEARCHES_URL}{research_id}/'
        resp = auth_mentor.patch(url, {'researchName': 'Updated Name'})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['researchName'] == 'Updated Name'

    def test_edit_start_date_to_past(self, auth_mentor, valid_research_data):
        """Editing startDate to a past date should now be allowed."""
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert resp.status_code == status.HTTP_201_CREATED
        research_id = resp.data['id']

        url = f'{MY_RESEARCHES_URL}{research_id}/'
        past_date = str(date.today() - timedelta(days=60))
        resp = auth_mentor.patch(url, {'startDate': past_date})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['startDate'] == past_date

    def test_edit_preserves_other_fields(self, auth_mentor, valid_research_data):
        """PATCH should preserve fields not included in the request."""
        resp = auth_mentor.post(MY_RESEARCHES_URL, valid_research_data)
        assert resp.status_code == status.HTTP_201_CREATED
        research_id = resp.data['id']
        original_desc = resp.data['description']

        url = f'{MY_RESEARCHES_URL}{research_id}/'
        resp = auth_mentor.patch(url, {'researchName': 'New Name'})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['description'] == original_desc
