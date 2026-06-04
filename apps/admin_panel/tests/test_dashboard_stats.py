"""
Tests for admin dashboard stats endpoint.

Tests cover:
- Stats endpoint returns registered_students and registered_mentors
- Values match actual profile counts
- Non-admin gets 403
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import StudentProfile, MentorProfile

User = get_user_model()

STATS_URL = '/api/admin-panel/stats/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email='admin-stats@example.com',
        password='AdminPass123!',
        firstName='Admin',
        lastName='Stats',
        is_staff=True,
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email='regular-stats@example.com',
        password='RegularPass123!',
        firstName='Regular',
        lastName='User',
    )


@pytest.fixture
def admin_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def regular_client(api_client, regular_user):
    api_client.force_authenticate(user=regular_user)
    return api_client


@pytest.mark.django_db
class TestDashboardStats:
    """Tests for the dashboard_stats endpoint."""

    def test_stats_returns_200_with_new_fields(self, admin_client):
        """Admin can access stats and both new fields are present."""
        response = admin_client.get(STATS_URL)
        assert response.status_code == status.HTTP_200_OK
        assert 'registered_students' in response.data
        assert 'registered_mentors' in response.data

    def test_stats_values_match_profile_counts(self, admin_client, db):
        """registered_students and registered_mentors match actual counts."""
        # Create some profiles
        for i in range(3):
            u = User.objects.create_user(
                email=f'student-count-{i}@example.com',
                password='TestPass123!',
                firstName=f'S{i}',
                lastName='Test',
            )
            StudentProfile.objects.create(user=u)

        for i in range(2):
            u = User.objects.create_user(
                email=f'mentor-count-{i}@example.com',
                password='TestPass123!',
                firstName=f'M{i}',
                lastName='Test',
            )
            MentorProfile.objects.create(user=u)

        response = admin_client.get(STATS_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['registered_students'] == StudentProfile.objects.count()
        assert response.data['registered_mentors'] == MentorProfile.objects.count()

    def test_non_admin_gets_403(self, regular_client):
        """Non-admin user gets 403 Forbidden."""
        response = regular_client.get(STATS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN
