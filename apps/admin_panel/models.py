from django.conf import settings
from django.core.cache import cache
from django.db import models


class SiteSetting(models.Model):
    """Singleton site-wide settings (pk=1 enforced)."""

    MODERATION_CHOICES = [
        ("approved", "Approved"),
        ("pending", "Pending"),
    ]

    CACHE_KEY = "site_settings_singleton"
    CACHE_TTL = 300  # 5 minutes

    max_applications_per_student = models.PositiveIntegerField(default=0, help_text="0 = unlimited")
    max_applications_per_research = models.PositiveIntegerField(default=0, help_text="0 = unlimited")
    default_moderation_status = models.CharField(max_length=10, choices=MODERATION_CHOICES, default="approved")
    contact_message_max_length = models.PositiveIntegerField(default=2000)
    mentor_note_max_length = models.PositiveIntegerField(default=1000)
    applications_globally_enabled = models.BooleanField(default=True)
    registration_enabled = models.BooleanField(default=True)
    student_registration_enabled = models.BooleanField(default=True)
    mentor_registration_enabled = models.BooleanField(default=True)
    require_email_verification_to_apply = models.BooleanField(default=False)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "site_settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        cache.delete(self.CACHE_KEY)

    @classmethod
    def load(cls):
        obj = cache.get(cls.CACHE_KEY)
        if obj is None:
            obj, _ = cls.objects.get_or_create(pk=1)
            cache.set(cls.CACHE_KEY, obj, cls.CACHE_TTL)
        return obj

    def __str__(self):
        return "Site Settings"


class AdminActionLog(models.Model):
    """Immutable audit trail for admin actions."""

    class ActionType(models.TextChoices):
        RESEARCH_APPROVE = "research_approve", "Research Approved"
        RESEARCH_REJECT = "research_reject", "Research Rejected"
        RESEARCH_FLAG = "research_flag", "Research Flagged"
        RESEARCH_SOFT_DELETE = "research_soft_delete", "Research Soft-Deleted"
        RESEARCH_RESTORE = "research_restore", "Research Restored"
        USER_DEACTIVATE = "user_deactivate", "User Deactivated"
        USER_REACTIVATE = "user_reactivate", "User Reactivated"
        USER_FORCE_VERIFY = "user_force_verify", "User Force-Verified"
        RESEARCH_EDIT = "research_edit", "Research Edited"
        SETTINGS_UPDATED = "settings_updated", "Settings Updated"
        ANNOUNCEMENT_CREATE = "announcement_create", "Announcement Created"
        ANNOUNCEMENT_UPDATE = "announcement_update", "Announcement Updated"
        ANNOUNCEMENT_DEACTIVATE = "announcement_deactivate", "Announcement Deactivated"
        USER_EDIT = "user_edit", "User Edited"
        APPLICATION_OVERRIDE = "application_override", "Application Status Overridden"
        USER_DELETE = "user_delete", "User Deleted"
        PROFILE_DELETE = "profile_delete", "Profile Deleted"

    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="admin_actions",
    )
    action_type = models.CharField(max_length=40, choices=ActionType.choices)
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admin_actions_received",
    )
    target_research_id = models.IntegerField(null=True, blank=True)
    note = models.TextField(blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "admin_action_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.action_type}] by admin={self.admin_id} at {self.created_at}"


class SystemAnnouncement(models.Model):
    """Admin-created site-wide announcements."""

    class Audience(models.TextChoices):
        ALL = "all", "All Users"
        MENTORS = "mentors", "Mentors Only"
        STUDENTS = "students", "Students Only"

    class Priority(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    title = models.CharField(max_length=200)
    body = models.TextField(max_length=2000)
    audience = models.CharField(max_length=10, choices=Audience.choices, default=Audience.ALL)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.INFO)
    is_active = models.BooleanField(default=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_announcements",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "system_announcements"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class AnnouncementDismissal(models.Model):
    """Tracks which users dismissed which announcements."""

    announcement = models.ForeignKey(
        SystemAnnouncement,
        on_delete=models.CASCADE,
        related_name="dismissals",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dismissed_announcements",
    )
    dismissed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "announcement_dismissals"
        constraints = [
            models.UniqueConstraint(fields=["announcement", "user"], name="unique_dismissal"),
        ]

    def __str__(self):
        return f"User {self.user_id} dismissed announcement {self.announcement_id}"
