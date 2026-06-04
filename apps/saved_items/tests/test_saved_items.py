"""
Tests for the Saved Items API (Task 6).

GET  /api/saved-items/
POST /api/saved-items/
DELETE /api/saved-items/<id>/
"""

import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import Institution, MentorProfile, StudentProfile
from apps.research.models import Research
from apps.saved_items.models import SavedItem

User = get_user_model()

LIST_URL = '/api/saved-items/'


def _detail_url(pk):
    return f'{LIST_URL}{pk}/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_a(db):
    return User.objects.create_user(
        email='usera@example.com',
        password='TestPass123!',
        firstName='UserA',
        lastName='Test',
        email_verified=True,
    )


@pytest.fixture
def user_b(db):
    return User.objects.create_user(
        email='userb@example.com',
        password='TestPass123!',
        firstName='UserB',
        lastName='Test',
        email_verified=True,
    )


@pytest.fixture
def auth_a(api_client, user_a):
    api_client.force_authenticate(user=user_a)
    return api_client


@pytest.fixture
def auth_b(api_client, user_b):
    client = APIClient()
    client.force_authenticate(user=user_b)
    return client


@pytest.fixture
def mentor_user(db):
    user = User.objects.create_user(
        email='mentor_saved@example.com',
        password='TestPass123!',
        firstName='Mentor',
        lastName='Saved',
        email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace='Sheba Hospital')
    return user


@pytest.fixture
def student_user(db):
    user = User.objects.create_user(
        email='student_saved@example.com',
        password='TestPass123!',
        firstName='Student',
        lastName='Saved',
        email_verified=True,
    )
    inst, _ = Institution.objects.get_or_create(
        name='Test Uni SI', defaults={'name_he': 'בדיקה', 'is_active': True}
    )
    StudentProfile.objects.create(user=user, institution=inst, isAvailableForResearch=True)
    return user


@pytest.fixture
def research(db, mentor_user):
    return Research.objects.create(
        owner=mentor_user,
        researchName='Saved Test Research',
        description='A research for saved item tests.',
        status='open',
        moderation_status='approved',
        accepting_applications=True,
    )


# ======================== Authentication ========================


@pytest.mark.django_db
class TestSavedItemsAuth:

    def test_unauthenticated_get_returns_401(self, api_client):
        response = api_client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_post_returns_401(self, api_client):
        response = api_client.post(LIST_URL, {})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_delete_returns_401(self, api_client):
        response = api_client.delete(_detail_url(1))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ======================== Save Items ========================


@pytest.mark.django_db
class TestSaveItem:

    def test_save_research(self, auth_a, research):
        response = auth_a.post(LIST_URL, {
            'contentType': 'research',
            'objectId': str(research.pk),
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['contentType'] == 'research'
        assert response.data['objectId'] == str(research.pk)
        assert 'id' in response.data

    def test_save_mentor_profile(self, auth_a, mentor_user):
        profile = mentor_user.mentor_profile
        response = auth_a.post(LIST_URL, {
            'contentType': 'mentor_profile',
            'objectId': str(profile.pk),
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['contentType'] == 'mentor_profile'

    def test_save_student_profile(self, auth_a, student_user):
        profile = student_user.student_profile
        response = auth_a.post(LIST_URL, {
            'contentType': 'student_profile',
            'objectId': str(profile.pk),
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['contentType'] == 'student_profile'

    def test_duplicate_save_returns_409(self, auth_a, research):
        auth_a.post(LIST_URL, {
            'contentType': 'research',
            'objectId': str(research.pk),
        }, format='json')
        response = auth_a.post(LIST_URL, {
            'contentType': 'research',
            'objectId': str(research.pk),
        }, format='json')
        assert response.status_code == status.HTTP_409_CONFLICT

    def test_save_nonexistent_target_returns_404(self, auth_a):
        response = auth_a.post(LIST_URL, {
            'contentType': 'research',
            'objectId': '999999',
        }, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_save_nonexistent_profile_returns_404(self, auth_a):
        fake_uuid = str(uuid.uuid4())
        response = auth_a.post(LIST_URL, {
            'contentType': 'mentor_profile',
            'objectId': fake_uuid,
        }, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_invalid_content_type_returns_400(self, auth_a):
        response = auth_a.post(LIST_URL, {
            'contentType': 'invalid_type',
            'objectId': '1',
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_fields_returns_400(self, auth_a):
        response = auth_a.post(LIST_URL, {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ======================== List Items ========================


@pytest.mark.django_db
class TestListSavedItems:

    def test_list_returns_own_items_only(self, auth_a, auth_b, research, user_a, user_b):
        SavedItem.objects.create(user=user_a, content_type='research', object_id=str(research.pk))
        SavedItem.objects.create(user=user_b, content_type='research', object_id=str(research.pk))

        response = auth_a.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_list_empty_when_no_items(self, auth_a):
        response = auth_a.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_filter_by_type(self, auth_a, user_a, research, mentor_user):
        SavedItem.objects.create(user=user_a, content_type='research', object_id=str(research.pk))
        SavedItem.objects.create(
            user=user_a, content_type='mentor_profile',
            object_id=str(mentor_user.mentor_profile.pk),
        )

        response = auth_a.get(f'{LIST_URL}?type=research')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['contentType'] == 'research'

    def test_list_ordered_by_newest_first(self, auth_a, user_a, research, mentor_user):
        item1 = SavedItem.objects.create(user=user_a, content_type='research', object_id=str(research.pk))
        item2 = SavedItem.objects.create(
            user=user_a, content_type='mentor_profile',
            object_id=str(mentor_user.mentor_profile.pk),
        )

        response = auth_a.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data[0]['id'] == item2.pk
        assert response.data[1]['id'] == item1.pk


# ======================== Delete Items ========================


@pytest.mark.django_db
class TestDeleteSavedItem:

    def test_delete_own_item(self, auth_a, user_a, research):
        item = SavedItem.objects.create(user=user_a, content_type='research', object_id=str(research.pk))
        response = auth_a.delete(_detail_url(item.pk))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not SavedItem.objects.filter(pk=item.pk).exists()

    def test_delete_other_users_item_returns_404(self, auth_a, user_b, research):
        item = SavedItem.objects.create(user=user_b, content_type='research', object_id=str(research.pk))
        response = auth_a.delete(_detail_url(item.pk))
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert SavedItem.objects.filter(pk=item.pk).exists()

    def test_delete_nonexistent_item_returns_404(self, auth_a):
        response = auth_a.delete(_detail_url(999999))
        assert response.status_code == status.HTTP_404_NOT_FOUND
