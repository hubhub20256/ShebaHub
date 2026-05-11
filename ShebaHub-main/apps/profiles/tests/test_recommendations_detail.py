"""
Tests for the per-recommendation DELETE endpoints.

Covers:
- DELETE /api/profiles/student/me/recommendations/<uuid>/
- DELETE /api/profiles/mentor/me/recommendations/<uuid>/

Security focus:
- Only the recommendation's owner (the profile holder) can delete it.
- A different user's recommendation must NOT be deletable.
- A user without the matching profile type returns 404.
- Unauthenticated requests are rejected with 401.
"""

import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import (
    Institution,
    MentorProfile,
    ProfessionalRecommendation,
    StudentProfile,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name="Recs Institution", name_he="מוסד להמלצות", is_active=True,
    )


@pytest.fixture
def student_user(db, institution):
    u = User.objects.create_user(
        email="recs_student@example.com", password="TestPass123!",
        firstName="Recs", lastName="Student", email_verified=True,
    )
    StudentProfile.objects.create(
        user=u, institution=institution, isAvailableForResearch=True,
    )
    return u


@pytest.fixture
def other_student_user(db, institution):
    u = User.objects.create_user(
        email="recs_other_student@example.com", password="TestPass123!",
        firstName="Other", lastName="Student", email_verified=True,
    )
    StudentProfile.objects.create(
        user=u, institution=institution, isAvailableForResearch=True,
    )
    return u


@pytest.fixture
def mentor_user(db):
    u = User.objects.create_user(
        email="recs_mentor@example.com", password="TestPass123!",
        firstName="Recs", lastName="Mentor", email_verified=True,
    )
    MentorProfile.objects.create(user=u, workplace="Sheba Hospital")
    return u


@pytest.fixture
def other_mentor_user(db):
    u = User.objects.create_user(
        email="recs_other_mentor@example.com", password="TestPass123!",
        firstName="Other", lastName="Mentor", email_verified=True,
    )
    MentorProfile.objects.create(user=u, workplace="Other Hospital")
    return u


def _student_url(rec_id):
    return f"/api/profiles/student/me/recommendations/{rec_id}/"


def _mentor_url(rec_id):
    return f"/api/profiles/mentor/me/recommendations/{rec_id}/"


def _make_student_rec(student_user, **overrides):
    profile = StudentProfile.objects.get(user=student_user)
    defaults = {
        "recommender_name": "Dr. Smith",
        "recommender_email": "smith@example.com",
        "recommender_title": "Supervisor",
        "recommender_institution": "Sheba",
        "relationship": "Research mentor",
    }
    defaults.update(overrides)
    return ProfessionalRecommendation.objects.create(
        student_profile=profile, **defaults,
    )


def _make_mentor_rec(mentor_user, **overrides):
    profile = MentorProfile.objects.get(user=mentor_user)
    defaults = {
        "recommender_name": "Prof. Jones",
        "recommender_email": "jones@example.com",
        "recommender_title": "Department Head",
        "recommender_institution": "Hadassah",
        "relationship": "Colleague",
    }
    defaults.update(overrides)
    return ProfessionalRecommendation.objects.create(
        mentor_profile=profile, **defaults,
    )


# ===========================================================================
# Student recommendations DELETE
# ===========================================================================

@pytest.mark.django_db
class TestStudentRecommendationDetail:
    def test_unauthenticated_returns_401(self, api_client, student_user):
        rec = _make_student_rec(student_user)
        response = api_client.delete(_student_url(rec.id))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert ProfessionalRecommendation.objects.filter(id=rec.id).exists()

    def test_owner_can_delete_own_returns_204(self, api_client, student_user):
        rec = _make_student_rec(student_user)
        api_client.force_authenticate(user=student_user)
        response = api_client.delete(_student_url(rec.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ProfessionalRecommendation.objects.filter(id=rec.id).exists()

    def test_nonexistent_recommendation_returns_404(
        self, api_client, student_user
    ):
        api_client.force_authenticate(user=student_user)
        response = api_client.delete(_student_url(uuid.uuid4()))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_user_without_student_profile_returns_404(
        self, api_client, mentor_user, student_user
    ):
        """
        A mentor (no StudentProfile) hitting the student endpoint must NOT be
        able to reach another user's recommendation row. The view returns 404
        on the profile lookup before the recommendation lookup.
        """
        rec = _make_student_rec(student_user)
        api_client.force_authenticate(user=mentor_user)
        response = api_client.delete(_student_url(rec.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND
        # Data was NOT deleted.
        assert ProfessionalRecommendation.objects.filter(id=rec.id).exists()

    def test_other_student_cannot_delete_someone_elses_returns_404(
        self, api_client, student_user, other_student_user
    ):
        """
        Critical PII guarantee: another student must NOT be able to delete a
        recommendation belonging to a different student, even though both have
        StudentProfiles. The recommendation lookup is profile-scoped, so the
        other student's request misses the row and gets 404.
        """
        rec = _make_student_rec(student_user)
        api_client.force_authenticate(user=other_student_user)
        response = api_client.delete(_student_url(rec.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert ProfessionalRecommendation.objects.filter(id=rec.id).exists()

    def test_mentor_recommendation_not_deletable_via_student_url(
        self, api_client, mentor_user
    ):
        """
        A recommendation that belongs to a MentorProfile should NOT be
        reachable via the student endpoint, even if the caller has both
        profiles or the UUID happens to be valid.
        """
        rec = _make_mentor_rec(mentor_user)
        # Give the mentor user a student profile too — they have access to
        # the student endpoint but the recommendation is mentor-scoped.
        StudentProfile.objects.create(user=mentor_user, isAvailableForResearch=True)
        api_client.force_authenticate(user=mentor_user)
        response = api_client.delete(_student_url(rec.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert ProfessionalRecommendation.objects.filter(id=rec.id).exists()

    def test_delete_does_not_affect_other_recommendations(
        self, api_client, student_user
    ):
        rec_a = _make_student_rec(student_user, recommender_email="a@example.com")
        rec_b = _make_student_rec(student_user, recommender_email="b@example.com")
        api_client.force_authenticate(user=student_user)
        response = api_client.delete(_student_url(rec_a.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ProfessionalRecommendation.objects.filter(id=rec_a.id).exists()
        assert ProfessionalRecommendation.objects.filter(id=rec_b.id).exists()


# ===========================================================================
# Mentor recommendations DELETE
# ===========================================================================

@pytest.mark.django_db
class TestMentorRecommendationDetail:
    def test_unauthenticated_returns_401(self, api_client, mentor_user):
        rec = _make_mentor_rec(mentor_user)
        response = api_client.delete(_mentor_url(rec.id))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert ProfessionalRecommendation.objects.filter(id=rec.id).exists()

    def test_owner_can_delete_own_returns_204(self, api_client, mentor_user):
        rec = _make_mentor_rec(mentor_user)
        api_client.force_authenticate(user=mentor_user)
        response = api_client.delete(_mentor_url(rec.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ProfessionalRecommendation.objects.filter(id=rec.id).exists()

    def test_nonexistent_recommendation_returns_404(
        self, api_client, mentor_user
    ):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.delete(_mentor_url(uuid.uuid4()))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_user_without_mentor_profile_returns_404(
        self, api_client, student_user, mentor_user
    ):
        """
        A student (no MentorProfile) hitting the mentor endpoint must NOT
        delete another user's recommendation.
        """
        rec = _make_mentor_rec(mentor_user)
        api_client.force_authenticate(user=student_user)
        response = api_client.delete(_mentor_url(rec.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert ProfessionalRecommendation.objects.filter(id=rec.id).exists()

    def test_other_mentor_cannot_delete_someone_elses_returns_404(
        self, api_client, mentor_user, other_mentor_user
    ):
        """Two mentors with their own MentorProfiles — they must not see each
        other's recommendations."""
        rec = _make_mentor_rec(mentor_user)
        api_client.force_authenticate(user=other_mentor_user)
        response = api_client.delete(_mentor_url(rec.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert ProfessionalRecommendation.objects.filter(id=rec.id).exists()

    def test_student_recommendation_not_deletable_via_mentor_url(
        self, api_client, student_user
    ):
        """A student-profile recommendation must not be reachable from the
        mentor endpoint, even if the caller has both profiles."""
        rec = _make_student_rec(student_user)
        # Give the student a MentorProfile too — endpoint becomes accessible
        # but the recommendation is student-scoped, so still 404.
        MentorProfile.objects.create(user=student_user, workplace="Somewhere")
        api_client.force_authenticate(user=student_user)
        response = api_client.delete(_mentor_url(rec.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert ProfessionalRecommendation.objects.filter(id=rec.id).exists()

    def test_delete_does_not_affect_other_recommendations(
        self, api_client, mentor_user
    ):
        rec_a = _make_mentor_rec(mentor_user, recommender_email="x@example.com")
        rec_b = _make_mentor_rec(mentor_user, recommender_email="y@example.com")
        api_client.force_authenticate(user=mentor_user)
        response = api_client.delete(_mentor_url(rec_a.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ProfessionalRecommendation.objects.filter(id=rec_a.id).exists()
        assert ProfessionalRecommendation.objects.filter(id=rec_b.id).exists()
