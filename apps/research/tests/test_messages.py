"""
Tests for contact messages and inbox functionality.

Covers:
- GET /api/research/messages/inbox/ returns user's received messages
- GET /api/research/messages/unread-count/ returns correct count
- PATCH /api/research/messages/<id>/read/ marks message as read
- PATCH /api/research/messages/mark-all-read/ marks all as read
- POST /api/research/<id>/contact/ sends contact message to research owner
- Unauthenticated access returns 401
- Permission and validation checks
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import MentorProfile
from apps.research.models import Research, ContactMessage

User = get_user_model()

INBOX_URL = '/api/research/messages/inbox/'
UNREAD_COUNT_URL = '/api/research/messages/unread-count/'
MARK_ALL_READ_URL = '/api/research/messages/mark-all-read/'


def _mark_read_url(message_id):
    return f'/api/research/messages/{message_id}/read/'


def _contact_url(research_id):
    return f'/api/research/{research_id}/contact/'


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def mentor_owner(db):
    """Mentor who owns the research."""
    user = User.objects.create_user(
        email='msg_owner@example.com', password='TestPass123!',
        firstName='Msg', lastName='Owner', email_verified=True,
    )
    MentorProfile.objects.create(user=user, workplace='Sheba')
    return user


@pytest.fixture
def sender_user(db):
    """User who sends messages."""
    return User.objects.create_user(
        email='msg_sender@example.com', password='TestPass123!',
        firstName='Msg', lastName='Sender', email_verified=True,
    )


@pytest.fixture
def recipient_user(db):
    """User who receives messages."""
    return User.objects.create_user(
        email='msg_recipient@example.com', password='TestPass123!',
        firstName='Msg', lastName='Recipient', email_verified=True,
    )


@pytest.fixture
def research(db, mentor_owner):
    return Research.objects.create(
        owner=mentor_owner, researchName='Message Test Research',
        description='A research for message tests.', status='open',
        moderation_status='approved',
    )


@pytest.fixture
def sample_messages(db, sender_user, recipient_user, research):
    """Create a few messages for the recipient_user."""
    msgs = []
    for i in range(3):
        msg = ContactMessage.objects.create(
            sender=sender_user,
            recipient=recipient_user,
            research=research,
            subject=f'Test Subject {i}',
            body=f'Test Body {i}',
            is_read=(i == 0),  # First message is read, rest are unread
        )
        msgs.append(msg)
    return msgs


# ---------------------------------------------------------------------------
# Inbox tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestInbox:

    def test_inbox_returns_received_messages(self, api_client, recipient_user, sample_messages):
        """GET /api/research/messages/inbox/ returns messages for the current user."""
        api_client.force_authenticate(user=recipient_user)
        response = api_client.get(INBOX_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

    def test_inbox_does_not_return_sent_messages(self, api_client, sender_user, sample_messages):
        """Inbox should not include messages the user sent (only received)."""
        api_client.force_authenticate(user=sender_user)
        response = api_client.get(INBOX_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_inbox_ordered_by_newest_first(self, api_client, recipient_user, sample_messages):
        """Messages should be ordered newest first."""
        api_client.force_authenticate(user=recipient_user)
        response = api_client.get(INBOX_URL)
        assert response.status_code == status.HTTP_200_OK
        dates = [m['created_at'] for m in response.data]
        assert dates == sorted(dates, reverse=True)

    def test_inbox_includes_correct_fields(self, api_client, recipient_user, sample_messages):
        """Inbox messages should include expected fields."""
        api_client.force_authenticate(user=recipient_user)
        response = api_client.get(INBOX_URL)
        assert response.status_code == status.HTTP_200_OK
        msg = response.data[0]
        assert 'id' in msg
        assert 'senderName' in msg
        assert 'subject' in msg
        assert 'body' in msg
        assert 'is_read' in msg
        assert 'created_at' in msg
        assert 'notification_type' in msg

    def test_inbox_unauthenticated_returns_401(self, api_client):
        """Unauthenticated access to inbox returns 401."""
        response = api_client.get(INBOX_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Unread count tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestUnreadCount:

    def test_unread_count_returns_correct_number(self, api_client, recipient_user, sample_messages):
        """GET /api/research/messages/unread-count/ returns the correct unread count."""
        api_client.force_authenticate(user=recipient_user)
        response = api_client.get(UNREAD_COUNT_URL)
        assert response.status_code == status.HTTP_200_OK
        # sample_messages: index 0 is read, 1 and 2 are unread
        assert response.data['count'] == 2

    def test_unread_count_zero_when_all_read(self, api_client, recipient_user, sample_messages):
        """Count is 0 when all messages are read."""
        ContactMessage.objects.filter(recipient=recipient_user).update(is_read=True)
        api_client.force_authenticate(user=recipient_user)
        response = api_client.get(UNREAD_COUNT_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0

    def test_unread_count_zero_when_no_messages(self, api_client, sender_user):
        """Count is 0 when user has no received messages."""
        api_client.force_authenticate(user=sender_user)
        response = api_client.get(UNREAD_COUNT_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0

    def test_unread_count_unauthenticated_returns_401(self, api_client):
        """Unauthenticated access returns 401."""
        response = api_client.get(UNREAD_COUNT_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Mark read tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestMarkRead:

    def test_mark_message_as_read(self, api_client, recipient_user, sample_messages):
        """PATCH /api/research/messages/<id>/read/ marks message as read."""
        unread_msg = sample_messages[1]  # index 1 is unread
        assert unread_msg.is_read is False
        api_client.force_authenticate(user=recipient_user)
        response = api_client.patch(_mark_read_url(unread_msg.id))
        assert response.status_code == status.HTTP_200_OK
        unread_msg.refresh_from_db()
        assert unread_msg.is_read is True

    def test_cannot_mark_other_users_message(self, api_client, sender_user, sample_messages):
        """User cannot mark another user's message as read."""
        msg = sample_messages[1]
        api_client.force_authenticate(user=sender_user)
        response = api_client.patch(_mark_read_url(msg.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_mark_nonexistent_message_returns_404(self, api_client, recipient_user):
        """Marking a non-existent message returns 404."""
        api_client.force_authenticate(user=recipient_user)
        response = api_client.patch(_mark_read_url(99999))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_mark_read_unauthenticated_returns_401(self, api_client, sample_messages):
        """Unauthenticated access returns 401."""
        response = api_client.patch(_mark_read_url(sample_messages[0].id))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Mark all read tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestMarkAllRead:

    def test_mark_all_read(self, api_client, recipient_user, sample_messages):
        """PATCH /api/research/messages/mark-all-read/ marks all messages as read."""
        api_client.force_authenticate(user=recipient_user)
        response = api_client.patch(MARK_ALL_READ_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2  # 2 were unread
        # Verify all messages are now read
        assert ContactMessage.objects.filter(recipient=recipient_user, is_read=False).count() == 0

    def test_mark_all_read_when_none_unread(self, api_client, recipient_user, sample_messages):
        """Mark all read when none are unread returns count=0."""
        ContactMessage.objects.filter(recipient=recipient_user).update(is_read=True)
        api_client.force_authenticate(user=recipient_user)
        response = api_client.patch(MARK_ALL_READ_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0

    def test_mark_all_read_does_not_affect_other_users(self, api_client, recipient_user, sender_user, sample_messages):
        """Mark all read only affects the current user's messages."""
        # Create a message for sender_user
        ContactMessage.objects.create(
            sender=recipient_user, recipient=sender_user,
            subject='Other msg', body='Body', is_read=False,
        )
        api_client.force_authenticate(user=recipient_user)
        api_client.patch(MARK_ALL_READ_URL)
        # The sender_user's message should still be unread
        assert ContactMessage.objects.filter(recipient=sender_user, is_read=False).count() == 1

    def test_mark_all_read_unauthenticated_returns_401(self, api_client):
        """Unauthenticated access returns 401."""
        response = api_client.patch(MARK_ALL_READ_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Contact research owner tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestContactResearchOwner:

    def test_send_contact_message(self, api_client, sender_user, research, mentor_owner):
        """POST /api/research/<id>/contact/ sends a message to the research owner."""
        api_client.force_authenticate(user=sender_user)
        response = api_client.post(
            _contact_url(research.id),
            {'message': 'Hello, I am interested in your research.'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        msg = ContactMessage.objects.filter(
            sender=sender_user, recipient=mentor_owner,
        ).first()
        assert msg is not None
        assert msg.research == research

    def test_contact_requires_message(self, api_client, sender_user, research):
        """Sending without a message body returns 400."""
        api_client.force_authenticate(user=sender_user)
        response = api_client.post(
            _contact_url(research.id),
            {'message': ''},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_contact_nonexistent_research_returns_404(self, api_client, sender_user):
        """Sending to non-existent research returns 404."""
        api_client.force_authenticate(user=sender_user)
        response = api_client.post(
            _contact_url(99999),
            {'message': 'Hello'},
            format='json',
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_contact_unauthenticated_returns_401(self, api_client, research):
        """Unauthenticated user cannot contact."""
        response = api_client.post(
            _contact_url(research.id),
            {'message': 'Hello'},
            format='json',
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_contact_message_too_long(self, api_client, sender_user, research):
        """Message exceeding max length returns 400."""
        from apps.admin_panel.models import SiteSetting
        site = SiteSetting.load()
        max_len = site.contact_message_max_length
        api_client.force_authenticate(user=sender_user)
        response = api_client.post(
            _contact_url(research.id),
            {'message': 'x' * (max_len + 1)},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
