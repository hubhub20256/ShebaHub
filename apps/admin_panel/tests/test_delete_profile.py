"""
Tests for admin delete user profile endpoints (Task 3).
DELETE /api/admin-panel/profiles/student/<uuid:user_id>/
DELETE /api/admin-panel/profiles/mentor/<uuid:user_id>/
"""

import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.admin_panel.models import AdminActionLog
from apps.profiles.models import (
    Institution,
    MentorProfile,
    ProfileDocument,
    ProfessionalRecommendation,
    StudentProfile,
)

User = get_user_model()

STUDENT_URL = '/api/admin-panel/profiles/student/'
MENTOR_URL = '/api/admin-panel/profiles/mentor/'


def _student_url(user_id):
    return f'{STUDENT_URL}{user_id}/'


def _mentor_url(user_id):
    return f'{MENTOR_URL}{user_id}/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email='admin_profile@example.com',
        password='TestPass123!',
        firstName='Admin',
        lastName='Profile',
        email_verified=True,
        is_staff=True,
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email='regular_profile@example.com',
        password='TestPass123!',
        firstName='Regular',
        lastName='Profile',
        email_verified=True,
    )


@pytest.fixture
def target_with_student(db):
    user = User.objects.create_user(
        email='student_target@example.com',
        password='TestPass123!',
        firstName='Student',
        lastName='Target',
        email_verified=True,
    )
    inst, _ = Institution.objects.get_or_create(
        name='Test Uni DP', defaults={'name_he': 'בדיקה', 'is_active': True}
    )
    profile = StudentProfile.objects.create(user=user, institution=inst, isAvailableForResearch=True)
    ProfessionalRecommendation.objects.create(
        student_profile=profile,
        recommender_name='Dr. Rec',
        recommender_email='rec@example.com',
    )
    return user


@pytest.fixture
def target_with_mentor(db):
    user = User.objects.create_user(
        email='mentor_target@example.com',
        password='TestPass123!',
        firstName='Mentor',
        lastName='Target',
        email_verified=True,
    )
    profile = MentorProfile.objects.create(user=user, workplace='Sheba Hospital')
    ProfessionalRecommendation.objects.create(
        mentor_profile=profile,
        recommender_name='Dr. Rec2',
        recommender_email='rec2@example.com',
    )
    return user


@pytest.fixture
def auth_admin(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def auth_regular(api_client, regular_user):
    api_client.force_authenticate(user=regular_user)
    return api_client


@pytest.mark.django_db
class TestAdminDeleteStudentProfile:

    def test_unauthenticated_returns_401(self, api_client, target_with_student):
        response = api_client.delete(_student_url(target_with_student.pk))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_admin_returns_403(self, auth_regular, target_with_student):
        response = auth_regular.delete(_student_url(target_with_student.pk))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_deletes_student_profile(self, auth_admin, target_with_student):
        response = auth_admin.delete(_student_url(target_with_student.pk))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not StudentProfile.objects.filter(user=target_with_student).exists()
        # User account should still exist
        assert User.objects.filter(pk=target_with_student.pk).exists()

    def test_recommendations_deleted(self, auth_admin, target_with_student):
        profile = target_with_student.student_profile
        assert profile.recommendations.count() == 1
        auth_admin.delete(_student_url(target_with_student.pk))
        assert ProfessionalRecommendation.objects.filter(student_profile=profile).count() == 0

    def test_audit_log_created(self, auth_admin, target_with_student):
        auth_admin.delete(_student_url(target_with_student.pk))
        log = AdminActionLog.objects.filter(action_type='profile_delete').first()
        assert log is not None
        assert log.details['profile_type'] == 'student'

    def test_user_without_profile_returns_404(self, auth_admin, regular_user):
        response = auth_admin.delete(_student_url(regular_user.pk))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_nonexistent_user_returns_404(self, auth_admin):
        fake_id = uuid.uuid4()
        response = auth_admin.delete(_student_url(fake_id))
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestAdminDeleteMentorProfile:

    def test_unauthenticated_returns_401(self, api_client, target_with_mentor):
        response = api_client.delete(_mentor_url(target_with_mentor.pk))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_admin_returns_403(self, auth_regular, target_with_mentor):
        response = auth_regular.delete(_mentor_url(target_with_mentor.pk))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_deletes_mentor_profile(self, auth_admin, target_with_mentor):
        response = auth_admin.delete(_mentor_url(target_with_mentor.pk))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not MentorProfile.objects.filter(user=target_with_mentor).exists()
        assert User.objects.filter(pk=target_with_mentor.pk).exists()

    def test_recommendations_deleted(self, auth_admin, target_with_mentor):
        profile = target_with_mentor.mentor_profile
        assert profile.recommendations.count() == 1
        auth_admin.delete(_mentor_url(target_with_mentor.pk))
        assert ProfessionalRecommendation.objects.filter(mentor_profile=profile).count() == 0

    def test_audit_log_created(self, auth_admin, target_with_mentor):
        auth_admin.delete(_mentor_url(target_with_mentor.pk))
        log = AdminActionLog.objects.filter(
            action_type='profile_delete',
            details__profile_type='mentor',
        ).first()
        assert log is not None

    def test_user_without_profile_returns_404(self, auth_admin, regular_user):
        response = auth_admin.delete(_mentor_url(regular_user.pk))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_nonexistent_user_returns_404(self, auth_admin):
        fake_id = uuid.uuid4()
        response = auth_admin.delete(_mentor_url(fake_id))
        assert response.status_code == status.HTTP_404_NOT_FOUND
