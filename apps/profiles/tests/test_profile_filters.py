"""
Tests for backend-side query-param filtering on public mentor/student list endpoints.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import (
    Degree,
    Institution,
    MedicalTrainingStage,
    MentorProfile,
    Specialty,
    SpecialtyGroup,
    StudentProfile,
)

User = get_user_model()

MENTORS_URL = '/api/profiles/mentors/'
STUDENTS_URL = '/api/profiles/students/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user(db):
    user = User.objects.create_user(
        email='viewer@example.com', password='TestPass123!',
        firstName='Viewer', lastName='User', email_verified=True,
    )
    return user


# ── reference data ──

@pytest.fixture
def inst_a(db):
    obj, _ = Institution.objects.get_or_create(
        name='Hospital Alpha', defaults={'name_he': 'בית חולים אלפא', 'is_active': True},
    )
    return obj


@pytest.fixture
def inst_b(db):
    obj, _ = Institution.objects.get_or_create(
        name='Hospital Beta', defaults={'name_he': 'בית חולים בטא', 'is_active': True},
    )
    return obj


@pytest.fixture
def spec_cardio(db):
    grp, _ = SpecialtyGroup.objects.get_or_create(
        name='Internal', defaults={'name_he': 'פנימית', 'is_active': True},
    )
    obj, _ = Specialty.objects.get_or_create(
        name='Cardiology', defaults={'name_he': 'קרדיולוגיה', 'group': grp, 'is_active': True},
    )
    return obj


@pytest.fixture
def spec_neuro(db):
    grp, _ = SpecialtyGroup.objects.get_or_create(
        name='Neuro', defaults={'name_he': 'נוירו', 'is_active': True},
    )
    obj, _ = Specialty.objects.get_or_create(
        name='Neurology', defaults={'name_he': 'נוירולוגיה', 'group': grp, 'is_active': True},
    )
    return obj


@pytest.fixture
def degree_md(db):
    obj, _ = Degree.objects.get_or_create(name='MD', defaults={'is_active': True})
    return obj


@pytest.fixture
def degree_phd(db):
    obj, _ = Degree.objects.get_or_create(name='PhD', defaults={'is_active': True})
    return obj


@pytest.fixture
def stage_intern(db):
    obj, _ = MedicalTrainingStage.objects.get_or_create(
        name='Intern', defaults={'name_he': 'סטאז׳ר', 'is_active': True},
    )
    return obj


@pytest.fixture
def stage_resident(db):
    obj, _ = MedicalTrainingStage.objects.get_or_create(
        name='Resident', defaults={'name_he': 'מתמחה', 'is_active': True},
    )
    return obj


# ── mentor fixtures ──

@pytest.fixture
def mentor_alice(db, inst_a, spec_cardio, degree_md):
    u = User.objects.create_user(
        email='alice_m@example.com', password='TestPass123!',
        firstName='Alice', lastName='Cohen', gender='female', email_verified=True,
    )
    p = MentorProfile.objects.create(user=u, institution=inst_a)
    p.specialties.add(spec_cardio)
    p.degrees.add(degree_md)
    return p


@pytest.fixture
def mentor_bob(db, inst_b, spec_neuro, degree_phd):
    u = User.objects.create_user(
        email='bob_m@example.com', password='TestPass123!',
        firstName='Bob', lastName='Levy', gender='male', email_verified=True,
    )
    p = MentorProfile.objects.create(user=u, institution=inst_b)
    p.specialties.add(spec_neuro)
    p.degrees.add(degree_phd)
    return p


# ── student fixtures ──

@pytest.fixture
def student_carol(db, inst_a, stage_intern):
    u = User.objects.create_user(
        email='carol_s@example.com', password='TestPass123!',
        firstName='Carol', lastName='David', gender='female', email_verified=True,
    )
    return StudentProfile.objects.create(
        user=u, institution=inst_a, apprenticeStage=stage_intern,
        isAvailableForResearch=True,
    )


@pytest.fixture
def student_dan(db, inst_b, stage_resident):
    u = User.objects.create_user(
        email='dan_s@example.com', password='TestPass123!',
        firstName='Dan', lastName='Elia', gender='male', email_verified=True,
    )
    return StudentProfile.objects.create(
        user=u, institution=inst_b, apprenticeStage=stage_resident,
        isAvailableForResearch=False,
    )


# =============================================================================
# MENTOR FILTER TESTS
# =============================================================================


@pytest.mark.django_db
class TestMentorListFilters:

    def test_no_filter_returns_all(self, api_client, auth_user, mentor_alice, mentor_bob):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(MENTORS_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2

    def test_filter_by_q_first_name(self, api_client, auth_user, mentor_alice, mentor_bob):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(MENTORS_URL, {'q': 'Alice'})
        assert len(resp.data) == 1

    def test_filter_by_q_last_name(self, api_client, auth_user, mentor_alice, mentor_bob):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(MENTORS_URL, {'q': 'Levy'})
        assert len(resp.data) == 1

    def test_filter_by_q_case_insensitive(self, api_client, auth_user, mentor_alice, mentor_bob):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(MENTORS_URL, {'q': 'alice'})
        assert len(resp.data) == 1

    def test_filter_by_specialty(self, api_client, auth_user, mentor_alice, mentor_bob):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(MENTORS_URL, {'specialty': 'קרדיולוגיה'})
        assert len(resp.data) == 1

    def test_filter_by_institution(self, api_client, auth_user, mentor_alice, mentor_bob):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(MENTORS_URL, {'institution': 'בית חולים אלפא'})
        assert len(resp.data) == 1

    def test_filter_by_degree(self, api_client, auth_user, mentor_alice, mentor_bob):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(MENTORS_URL, {'degree': 'PhD'})
        assert len(resp.data) == 1

    def test_filter_by_gender(self, api_client, auth_user, mentor_alice, mentor_bob):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(MENTORS_URL, {'gender': 'female'})
        assert len(resp.data) == 1

    def test_filter_no_match_returns_empty(self, api_client, auth_user, mentor_alice, mentor_bob):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(MENTORS_URL, {'q': 'nonexistent'})
        assert len(resp.data) == 0

    def test_multiple_filters_combined(self, api_client, auth_user, mentor_alice, mentor_bob):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(MENTORS_URL, {'gender': 'female', 'specialty': 'קרדיולוגיה'})
        assert len(resp.data) == 1


# =============================================================================
# STUDENT FILTER TESTS
# =============================================================================


@pytest.mark.django_db
class TestStudentListFilters:

    def test_no_filter_returns_all(self, api_client, auth_user, student_carol, student_dan):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(STUDENTS_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2

    def test_filter_by_q(self, api_client, auth_user, student_carol, student_dan):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(STUDENTS_URL, {'q': 'Carol'})
        assert len(resp.data) == 1

    def test_filter_by_institution(self, api_client, auth_user, student_carol, student_dan):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(STUDENTS_URL, {'institution': 'בית חולים בטא'})
        assert len(resp.data) == 1

    def test_filter_by_stage(self, api_client, auth_user, student_carol, student_dan):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(STUDENTS_URL, {'stage': 'סטאז׳ר'})
        assert len(resp.data) == 1

    def test_filter_by_gender(self, api_client, auth_user, student_carol, student_dan):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(STUDENTS_URL, {'gender': 'male'})
        assert len(resp.data) == 1

    def test_filter_by_available_true(self, api_client, auth_user, student_carol, student_dan):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(STUDENTS_URL, {'available': 'true'})
        assert len(resp.data) == 1

    def test_filter_by_available_false(self, api_client, auth_user, student_carol, student_dan):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(STUDENTS_URL, {'available': 'false'})
        assert len(resp.data) == 1

    def test_filter_no_match(self, api_client, auth_user, student_carol, student_dan):
        api_client.force_authenticate(auth_user)
        resp = api_client.get(STUDENTS_URL, {'q': 'nobody'})
        assert len(resp.data) == 0
