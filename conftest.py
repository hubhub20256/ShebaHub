"""Shared test fixtures for the ShebaHub project."""

import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    from apps.accounts.models import User
    return User.objects.create_user(
        email='testuser@example.com',
        password='TestPass123!',
        firstName='Test',
        lastName='User',
        email_verified=True,
    )


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def mentor_user(db):
    from apps.accounts.models import User
    return User.objects.create_user(
        email='mentor@example.com',
        password='TestPass123!',
        firstName='Mentor',
        lastName='User',
        email_verified=True,
    )


@pytest.fixture
def authenticated_mentor_client(api_client, mentor_user):
    api_client.force_authenticate(user=mentor_user)
    return api_client


@pytest.fixture
def specialty_fixtures(db):
    from apps.profiles.models import SpecialtyGroup, Specialty
    group = SpecialtyGroup.objects.create(name='Base', name_he='בסיס', is_active=True)
    s1 = Specialty.objects.create(name='Cardiology', name_he='קרדיולוגיה', group=group, is_active=True)
    s2 = Specialty.objects.create(name='Neurology', name_he='נוירולוגיה', group=group, is_active=True)
    s3 = Specialty.objects.create(name='Dermatology', name_he='דרמטולוגיה', group=group, is_active=True)
    return {'group': group, 'specialties': [s1, s2, s3]}


@pytest.fixture
def institution(db):
    from apps.profiles.models import Institution
    return Institution.objects.create(name='Tel Aviv University', name_he='אוניברסיטת תל אביב', is_active=True)


@pytest.fixture
def training_stages(db):
    from apps.profiles.models import MedicalTrainingStage
    stages = []
    for name, name_he, order in [('Intern', 'סטאז\'ר', 1), ('Resident', 'מתמחה', 2), ('Specialist', 'מומחה', 3)]:
        s, _ = MedicalTrainingStage.objects.get_or_create(
            name=name, defaults={'name_he': name_he, 'is_active': True, 'sort_order': order}
        )
        stages.append(s)
    return stages


@pytest.fixture
def academic_ranks(db):
    from apps.profiles.models import AcademicRank
    ranks = []
    for name, name_he, order in [
        ('None', 'ללא', 1), ('Instructor', 'מדריך', 2),
        ('Lecturer', 'מרצה', 3), ('Senior Lecturer', 'מרצה בכיר', 4),
        ('Professor', 'פרופסור', 5),
    ]:
        r, _ = AcademicRank.objects.get_or_create(
            name=name, defaults={'name_he': name_he, 'is_active': True, 'sort_order': order}
        )
        ranks.append(r)
    return ranks
