"""
Tests for the public reference-data endpoints under /api/reference-data/.

Covers:
- Per-table endpoints (10 endpoints): institutions, degrees, academic-ranks,
  medical-training-stages, specialties, research-interests, work-types,
  participation-modes, professional-experience, compensation-preferences.
- Aggregate endpoint (/api/reference-data/) with admin/DEBUG gate.

Tests are contract-focused: shape, ordering, active-only filtering, and
permission boundaries. They never rely on seeded production data — every
test populates its own rows.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import (
    AcademicRank,
    CompensationPreference,
    Degree,
    Institution,
    MedicalTrainingStage,
    ParticipationMode,
    ProfessionalExperience,
    ResearchInterest,
    Specialty,
    SpecialtyGroup,
    WorkType,
)

User = get_user_model()

AGGREGATE_URL = "/api/reference-data/"

# (label-for-test-id, model class, endpoint URL)
TABLES = [
    ("institutions",            Institution,            "/api/reference-data/institutions/"),
    ("degrees",                 Degree,                 "/api/reference-data/degrees/"),
    ("academic_ranks",          AcademicRank,           "/api/reference-data/academic-ranks/"),
    ("medical_training_stages", MedicalTrainingStage,   "/api/reference-data/medical-training-stages/"),
    ("specialties",             Specialty,              "/api/reference-data/specialties/"),
    ("research_interests",      ResearchInterest,       "/api/reference-data/research-interests/"),
    ("work_types",              WorkType,               "/api/reference-data/work-types/"),
    ("participation_modes",     ParticipationMode,      "/api/reference-data/participation-modes/"),
    ("professional_experience", ProfessionalExperience, "/api/reference-data/professional-experience/"),
    ("compensation_preferences", CompensationPreference, "/api/reference-data/compensation-preferences/"),
]

TABLE_PARAMS = [pytest.param(model, url, id=label) for label, model, url in TABLES]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="ref_user@example.com",
        password="TestPass123!",
        firstName="Ref",
        lastName="User",
        email_verified=True,
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="ref_staff@example.com",
        password="TestPass123!",
        firstName="Ref",
        lastName="Staff",
        is_staff=True,
        email_verified=True,
    )


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def staff_client(api_client, staff_user):
    api_client.force_authenticate(user=staff_user)
    return api_client


# ---------------------------------------------------------------------------
# Per-table endpoints
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPerTableEndpoints:
    @pytest.mark.parametrize("model,url", TABLE_PARAMS)
    def test_unauthenticated_returns_401(self, api_client, model, url):
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.parametrize("model,url", TABLE_PARAMS)
    def test_authenticated_returns_200_and_list_shape(
        self, auth_client, model, url
    ):
        model.objects.create(name=f"{model.__name__} A", name_he="א", is_active=True)
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) >= 1
        item = response.data[0]
        assert set(["id", "name", "name_he"]).issubset(set(item.keys()))

    @pytest.mark.parametrize("model,url", TABLE_PARAMS)
    def test_returns_empty_list_when_no_active_rows(
        self, auth_client, model, url
    ):
        # Wipe any seed data for this model so the table is empty.
        model.objects.all().delete()
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    @pytest.mark.parametrize("model,url", TABLE_PARAMS)
    def test_excludes_inactive_rows(self, auth_client, model, url):
        model.objects.all().delete()
        model.objects.create(name=f"{model.__name__} ACTIVE", name_he="פעיל", is_active=True)
        model.objects.create(name=f"{model.__name__} INACTIVE", name_he="לא", is_active=False)
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        names = [item["name"] for item in response.data]
        assert f"{model.__name__} ACTIVE" in names
        assert f"{model.__name__} INACTIVE" not in names

    @pytest.mark.parametrize("model,url", TABLE_PARAMS)
    def test_returned_in_sort_order(self, auth_client, model, url):
        model.objects.all().delete()
        # Insertion order intentionally != sort order.
        model.objects.create(name="Zeta",  name_he="ז", sort_order=10, is_active=True)
        model.objects.create(name="Alpha", name_he="א", sort_order=1, is_active=True)
        model.objects.create(name="Mu",    name_he="מ", sort_order=5, is_active=True)
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        names = [item["name"] for item in response.data]
        assert names == ["Alpha", "Mu", "Zeta"]

    @pytest.mark.parametrize("model,url", TABLE_PARAMS)
    def test_name_he_can_be_empty_string(self, auth_client, model, url):
        model.objects.all().delete()
        model.objects.create(name="No Hebrew Row", name_he="", is_active=True)
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        target = next((i for i in response.data if i["name"] == "No Hebrew Row"), None)
        assert target is not None
        assert target["name_he"] == ""


# ---------------------------------------------------------------------------
# Specialty response shape — group FK is NOT exposed
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestSpecialtiesGroupingNotExposed:
    URL = "/api/reference-data/specialties/"

    def test_response_does_not_include_group_fk(self, auth_client):
        Specialty.objects.all().delete()
        group = SpecialtyGroup.objects.create(name="Base", name_he="בסיס", is_active=True)
        Specialty.objects.create(
            name="Cardiology", name_he="קרדיולוגיה", group=group, is_active=True,
        )
        response = auth_client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        item = next((i for i in response.data if i["name"] == "Cardiology"), None)
        assert item is not None
        # Wire format should be flat: only id/name/name_he.
        assert "group" not in item
        assert "group_id" not in item


# ---------------------------------------------------------------------------
# Aggregate endpoint
# ---------------------------------------------------------------------------

EXPECTED_AGGREGATE_KEYS = {
    "institutions",
    "degrees",
    "academic_ranks",
    "medical_training_stages",
    "specialties",
    "research_interests",
    "work_types",
    "participation_modes",
    # Note: production uses the plural "_levels" key here, not "professional_experience".
    "professional_experience_levels",
    "compensation_preferences",
}


@pytest.mark.django_db
class TestReferenceDataAll:
    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get(AGGREGATE_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_non_staff_403_when_not_debug(
        self, auth_client, settings
    ):
        settings.DEBUG = False
        response = auth_client.get(AGGREGATE_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        # Body uses the consistent error envelope shape with a code.
        assert response.data.get("code") == "PERMISSION_DENIED"

    def test_authenticated_non_staff_200_when_debug(
        self, auth_client, settings
    ):
        settings.DEBUG = True
        response = auth_client.get(AGGREGATE_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_staff_returns_200_when_not_debug(self, staff_client, settings):
        settings.DEBUG = False
        response = staff_client.get(AGGREGATE_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_response_contains_all_expected_keys(self, staff_client, settings):
        settings.DEBUG = False
        response = staff_client.get(AGGREGATE_URL)
        assert response.status_code == status.HTTP_200_OK
        assert EXPECTED_AGGREGATE_KEYS.issubset(set(response.data.keys()))

    def test_each_key_maps_to_a_list(self, staff_client, settings):
        settings.DEBUG = False
        response = staff_client.get(AGGREGATE_URL)
        assert response.status_code == status.HTTP_200_OK
        for key in EXPECTED_AGGREGATE_KEYS:
            assert isinstance(response.data[key], list), (
                f"Aggregate key {key!r} is not a list"
            )

    def test_inactive_rows_excluded_from_aggregate(self, staff_client, settings):
        settings.DEBUG = False
        Institution.objects.all().delete()
        Institution.objects.create(name="Active U", name_he="פעיל", is_active=True)
        Institution.objects.create(name="Inactive U", name_he="לא", is_active=False)
        response = staff_client.get(AGGREGATE_URL)
        assert response.status_code == status.HTTP_200_OK
        names = [i["name"] for i in response.data["institutions"]]
        assert "Active U" in names
        assert "Inactive U" not in names
