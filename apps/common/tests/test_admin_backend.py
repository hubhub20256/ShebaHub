"""Tests for EnvAdminBackend auto-provisioning and authentication."""

import inspect
import uuid

import pytest
from django.contrib.auth import authenticate

from apps.accounts.models import User
from apps.common.admin_credentials import ADMIN_EMAIL, ADMIN_PASSWORD
from apps.common.backends import EnvAdminBackend


@pytest.fixture(autouse=True)
def _admin_env(monkeypatch):
    """Ensure ADMIN_EMAIL / ADMIN_PASSWORD are set for every test."""
    import apps.common.admin_credentials as creds_mod
    import apps.common.backends as backends_mod
    import apps.common.tests.test_admin_backend as this_mod

    test_email = "test_admin@example.com"
    test_password = "TestAdminPass123!"

    for mod in (creds_mod, backends_mod, this_mod):
        monkeypatch.setattr(mod, "ADMIN_EMAIL", test_email)
        monkeypatch.setattr(mod, "ADMIN_PASSWORD", test_password)


@pytest.fixture
def backend():
    return EnvAdminBackend()


# ---------- 1. Auto-provisioning on first login ----------

@pytest.mark.django_db
def test_admin_login_auto_provisions_user(backend):
    """First login with env credentials creates a fully privileged user."""
    assert User.objects.filter(email__iexact=ADMIN_EMAIL).count() == 0

    user = backend.authenticate(request=None, email=ADMIN_EMAIL, password=ADMIN_PASSWORD)

    assert user is not None
    assert user.email == ADMIN_EMAIL
    assert user.firstName == "Admin"
    assert user.lastName == "User"
    assert user.is_staff is True
    assert user.is_superuser is True
    assert user.is_active is True
    assert user.email_verified is True


# ---------- 2. Idempotent login ----------

@pytest.mark.django_db
def test_admin_login_idempotent(backend):
    """Logging in twice returns the same user without creating duplicates."""
    user1 = backend.authenticate(request=None, email=ADMIN_EMAIL, password=ADMIN_PASSWORD)
    user2 = backend.authenticate(request=None, email=ADMIN_EMAIL, password=ADMIN_PASSWORD)

    assert user1.pk == user2.pk
    assert User.objects.filter(email__iexact=ADMIN_EMAIL).count() == 1


# ---------- 3. Wrong password ----------

@pytest.mark.django_db
def test_wrong_password_returns_none(backend):
    """Wrong password must return None and must NOT auto-provision a user."""
    result = backend.authenticate(request=None, email=ADMIN_EMAIL, password="wrong-pass")

    assert result is None
    assert User.objects.filter(email__iexact=ADMIN_EMAIL).count() == 0


# ---------- 4. Wrong email ----------

@pytest.mark.django_db
def test_wrong_email_returns_none(backend):
    """A non-admin email returns None regardless of the password."""
    result = backend.authenticate(request=None, email="random@example.com", password=ADMIN_PASSWORD)

    assert result is None
    assert User.objects.count() == 0


# ---------- 5. Demoted admin stays demoted (security fix) ----------

@pytest.mark.django_db
def test_demoted_admin_stays_demoted(backend):
    """If the admin user was demoted, logging in does NOT auto-restore privileges."""
    # Provision the user first
    user = backend.authenticate(request=None, email=ADMIN_EMAIL, password=ADMIN_PASSWORD)
    assert user.is_staff is True

    # Simulate demotion
    user.is_staff = False
    user.is_superuser = False
    user.save(update_fields=["is_staff", "is_superuser"])

    user.refresh_from_db()
    assert user.is_staff is False
    assert user.is_superuser is False

    # Login again -- privileges must NOT be restored
    restored = backend.authenticate(request=None, email=ADMIN_EMAIL, password=ADMIN_PASSWORD)

    assert restored.pk == user.pk
    assert restored.is_staff is False
    assert restored.is_superuser is False


# ---------- 6. Case-insensitive email ----------

@pytest.mark.django_db
def test_case_insensitive_email(backend):
    """Email matching must be case-insensitive."""
    user = backend.authenticate(
        request=None, email=ADMIN_EMAIL.upper(), password=ADMIN_PASSWORD
    )

    assert user is not None
    assert user.is_superuser is True


# ---------- 7. get_user ----------

@pytest.mark.django_db
def test_get_user(backend):
    """get_user returns the user by primary key, or None for missing pk."""
    user = backend.authenticate(request=None, email=ADMIN_EMAIL, password=ADMIN_PASSWORD)

    fetched = backend.get_user(user.pk)
    assert fetched is not None
    assert fetched.pk == user.pk

    # Non-existent pk must return None
    assert backend.get_user(uuid.uuid4()) is None


# ---------- 8. username kwarg ----------

@pytest.mark.django_db
def test_username_kwarg_works(backend):
    """authenticate() should accept username= as an alias for email=."""
    user = backend.authenticate(request=None, username=ADMIN_EMAIL, password=ADMIN_PASSWORD)

    assert user is not None
    assert user.email == ADMIN_EMAIL
    assert user.is_superuser is True


# ---------- Integration: django.contrib.auth.authenticate ----------

@pytest.mark.django_db
def test_django_authenticate_integration():
    """django.contrib.auth.authenticate dispatches to EnvAdminBackend."""
    user = authenticate(request=None, email=ADMIN_EMAIL, password=ADMIN_PASSWORD)

    assert user is not None
    assert user.email == ADMIN_EMAIL
    assert user.is_staff is True
    assert user.is_superuser is True


# ---------- 10. Backend disabled when env vars missing ----------

@pytest.mark.django_db
def test_backend_disabled_when_env_vars_missing(monkeypatch):
    """When ADMIN_EMAIL or ADMIN_PASSWORD is None, authenticate returns None."""
    import apps.common.backends as backends_mod

    # Simulate missing ADMIN_EMAIL
    monkeypatch.setattr(backends_mod, 'ADMIN_EMAIL', None)
    backend = EnvAdminBackend()
    result = backend.authenticate(request=None, email="admin@sheba.com", password="any")
    assert result is None

    # Simulate missing ADMIN_PASSWORD
    monkeypatch.setattr(backends_mod, 'ADMIN_EMAIL', 'admin@sheba.com')
    monkeypatch.setattr(backends_mod, 'ADMIN_PASSWORD', None)
    result = backend.authenticate(request=None, email="admin@sheba.com", password="any")
    assert result is None

    # Simulate both missing
    monkeypatch.setattr(backends_mod, 'ADMIN_EMAIL', None)
    monkeypatch.setattr(backends_mod, 'ADMIN_PASSWORD', None)
    result = backend.authenticate(request=None, email="admin@sheba.com", password="any")
    assert result is None


# ---------- 11. Login changes when ADMIN_EMAIL changes ----------

@pytest.mark.django_db
def test_login_changes_when_admin_email_changes(monkeypatch):
    """Changing ADMIN_EMAIL in env makes old email fail and new email work."""
    import apps.common.backends as backends_mod

    backend = EnvAdminBackend()

    # Login with original credentials works
    user = backend.authenticate(request=None, email=ADMIN_EMAIL, password=ADMIN_PASSWORD)
    assert user is not None

    # Change ADMIN_EMAIL
    new_email = 'newadmin@sheba.com'
    monkeypatch.setattr(backends_mod, 'ADMIN_EMAIL', new_email)

    # Old email no longer works
    result = backend.authenticate(request=None, email=ADMIN_EMAIL, password=ADMIN_PASSWORD)
    assert result is None

    # New email works
    new_user = backend.authenticate(request=None, email=new_email, password=ADMIN_PASSWORD)
    assert new_user is not None
    assert new_user.email.lower() == new_email.lower()


# ---------- 12. No hardcoded fallback in source ----------

def test_no_hardcoded_fallback_in_source():
    """admin_credentials.py must not contain any hardcoded default values."""
    import apps.common.admin_credentials as creds_mod

    source = inspect.getsource(creds_mod)

    # The os.environ.get calls must NOT have a second (default) argument
    # that looks like a real credential
    assert "admin@sheba.com" not in source, "Hardcoded admin email found in source"
    assert "ShebahubHit" not in source, "Hardcoded admin password found in source"

    # Verify the pattern is environ.get('...') with no default
    import re
    get_calls = re.findall(r"os\.environ\.get\([^)]+\)", source)
    for call in get_calls:
        # Each call should have exactly one argument (the key), no default
        args = call.split(",")
        assert len(args) == 1, f"os.environ.get() has a default value: {call}"


# ---------- 13. Uses timing-safe comparison ----------

def test_uses_timing_safe_comparison():
    """EnvAdminBackend must use hmac.compare_digest, not == or !=."""
    source = inspect.getsource(EnvAdminBackend)

    assert "hmac.compare_digest" in source, \
        "Password comparison must use hmac.compare_digest"
    # Ensure no plain != or == for password
    import re
    # Match password == or password != patterns (excluding the email check)
    dangerous_patterns = re.findall(r'password\s*[!=]=\s*', source)
    assert len(dangerous_patterns) == 0, \
        f"Found unsafe password comparison: {dangerous_patterns}"


# ---------- 14. No auto-restore logic in source ----------

def test_no_auto_restore_in_source():
    """EnvAdminBackend must not auto-restore demoted privileges."""
    source = inspect.getsource(EnvAdminBackend)

    assert "restore" not in source.lower() or "NOT" in source, \
        "Backend should not contain auto-restore logic"
    # The specific pattern: iterating over privilege attrs and setting True
    assert "setattr(user, attr, True)" not in source, \
        "Found auto-restore pattern: setattr(user, attr, True)"
