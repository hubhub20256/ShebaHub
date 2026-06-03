"""
Tests for the public stats endpoint (Task 10).
GET /api/public/stats/
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import Institution, MentorProfile, StudentProfile
from apps.research.models import Research

User = get_user_model()

STATS_URL = '/api/public/stats/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def populated_data(db):
    """Create some mentors, students, and researches."""
    mentor1 = User.objects.create_user(
        email='stat_mentor1@example.com', password='TestPass123!',
        firstName='M1', lastName='Test', email_verified=True,
    )
    MentorProfile.objects.create(user=mentor1, workplace='Hospital A')

    mentor2 = User.objects.create_user(
        email='stat_mentor2@example.com', password='TestPass123!',
        firstName='M2', lastName='Test', email_verified=True,
    )
    MentorProfile.objects.create(user=mentor2, workplace='Hospital B')

    student1 = User.objects.create_user(
        email='stat_student1@example.com', password='TestPass123!',
        firstName='S1', lastName='Test', email_verified=True,
    )
    inst, _ = Institution.objects.get_or_create(
        name='Stat Uni', defaults={'name_he': 'סטט', 'is_active': True}
    )
    StudentProfile.objects.create(user=student1, institution=inst, isAvailableForResearch=True)

    # Approved research
    Research.objects.create(
        owner=mentor1, researchName='Approved Research',
        description='test', status='open', moderation_status='approved',
    )
    # Pending research (should not count)
    Research.objects.create(
        owner=mentor2, researchName='Pending Research',
        description='test', status='open', moderation_status='pending',
    )
    return {
        'mentors': 2,
        'students': 1,
        'researches': 1,  # only approved
    }


@pytest.mark.django_db
class TestPublicStats:

    def test_public_stats_no_auth_required(self, api_client, populated_data):
        response = api_client.get(STATS_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_public_stats_returns_correct_counts(self, api_client, populated_data):
        response = api_client.get(STATS_URL)
        assert response.data['registered_mentors'] == populated_data['mentors']
        assert response.data['registered_students'] == populated_data['students']
        assert response.data['total_researches'] == populated_data['researches']

    def test_public_stats_empty_database(self, api_client, db):
        response = api_client.get(STATS_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['registered_mentors'] == 0
        assert response.data['registered_students'] == 0
        assert response.data['total_researches'] == 0

    def test_public_stats_no_private_data(self, api_client, populated_data):
        response = api_client.get(STATS_URL)
        data = response.data
        # Should only contain aggregate counts, no personal data
        assert 'email' not in str(data)
        allowed_keys = {'registered_mentors', 'registered_students', 'total_researches'}
        assert set(data.keys()) == allowed_keys
