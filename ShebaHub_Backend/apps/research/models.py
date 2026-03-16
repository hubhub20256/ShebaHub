import uuid

from django.conf import settings
from django.db import models


def research_contract_upload_path(instance, filename):
    ext = filename.split(".")[-1] if "." in filename else ""
    ext = f".{ext.lower()}" if ext else ""
    return f"research_contracts/{instance.owner_id}/{uuid.uuid4()}{ext}"


class ResearchManager(models.Manager):
    """Default manager that excludes soft-deleted researches."""

    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class ResearchAllManager(models.Manager):
    """Manager that includes soft-deleted researches (for admin use)."""
    pass


class Research(models.Model):
    """A research project posted/managed by a user (usually a mentor)."""

    class StatusChoices(models.TextChoices):
        DRAFT = "draft", "Draft"
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        CLOSED = "closed", "Closed"
        COMPLETED = "completed", "Completed"

    class ModerationStatus(models.TextChoices):
        APPROVED = "approved", "Approved"
        PENDING = "pending", "Pending Review"
        FLAGGED = "flagged", "Flagged"
        REJECTED = "rejected", "Rejected"

    id = models.AutoField(primary_key=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="researches",
    )

    researchName = models.CharField(max_length=255)
    description = models.TextField()

    researchArea = models.CharField(max_length=255, blank=True)
    mentors = models.CharField(max_length=255, blank=True)

    teamSize = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Total team size"
    )

    startDate = models.DateField(null=True, blank=True)
    estimatedCompletionDate = models.DateField(
        null=True, blank=True,
        db_column='estimated_completion_date',
        help_text="Estimated project completion date"
    )
    weeklyHours = models.PositiveIntegerField(null=True, blank=True)
    durationMonths = models.PositiveIntegerField(null=True, blank=True, db_column='duration_months')

    compensation = models.JSONField(
        default=list, blank=True,
        help_text='Primary compensation types, e.g. ["מלגה", "שכר"]'
    )
    workMode = models.CharField(max_length=50, blank=True)
    requirements = models.TextField(blank=True)
    skillsAndTools = models.TextField(blank=True)
    output = models.TextField(blank=True)

    location = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=50, choices=StatusChoices.choices, default=StatusChoices.DRAFT, blank=True)
    helsinkiApproval = models.CharField(max_length=100, blank=True)
    dataType = models.CharField(max_length=50, blank=True)

    contract = models.FileField(upload_to=research_contract_upload_path, null=True, blank=True)
    accepting_applications = models.BooleanField(default=True, help_text="Whether this research is currently accepting new applications")

    moderation_status = models.CharField(
        max_length=20,
        choices=ModerationStatus.choices,
        default=ModerationStatus.APPROVED,
    )
    moderation_note = models.TextField(blank=True)

    is_deleted = models.BooleanField(default=False, db_index=True)

    owner_last_seen_chat_message_id = models.BigIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ResearchManager()
    all_objects = ResearchAllManager()

    class Meta:
        db_table = "researches"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Research #{self.id}: {self.researchName}"


class ResearchApplication(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"
        INVITED = "invited", "Invited"
        REMOVED = "removed", "Removed"

    id = models.AutoField(primary_key=True)
    research = models.ForeignKey(
        Research,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="research_applications",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    invited_role = models.CharField(
        max_length=10, blank=True, default='',
        choices=[('', ''), ('student', 'Student'), ('mentor', 'Mentor')],
        help_text='Role the user was invited as (only for INVITED status)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    mentor_note = models.TextField(blank=True, help_text="Optional note from mentor on application decision")

    # Per-mentor granular permissions (only meaningful for approved mentors)
    can_edit = models.BooleanField(default=False, help_text="Can edit research details")
    can_approve = models.BooleanField(default=False, help_text="Can approve/reject applicants")
    can_invite = models.BooleanField(default=False, help_text="Can invite users to the research")
    can_remove = models.BooleanField(default=False, help_text="Can remove approved members")
    can_manage_chat = models.BooleanField(default=False, help_text="Can manage chat settings and pin messages")

    last_seen_chat_message_id = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = "research_applications"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["research", "applicant"], name="uniq_research_applicant"),
        ]

    def __str__(self):
        return f"Application #{self.id}: research={self.research_id} applicant={self.applicant_id} status={self.status}"


class ContactMessage(models.Model):
    class NotificationType(models.TextChoices):
        CONTACT = "contact", "Contact Message"
        APPLICATION_NEW = "application_new", "New Application"
        APPLICATION_APPROVED = "application_approved", "Application Approved"
        APPLICATION_REJECTED = "application_rejected", "Application Rejected"
        APPLICATION_INVITED = "application_invited", "Research Invitation"
        APPLICATION_REMOVED = "application_removed", "Removed from Research"
        CHAT_MENTION = "chat_mention", "Chat Mention"

    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_messages')
    research = models.ForeignKey(Research, on_delete=models.CASCADE, related_name='messages', null=True, blank=True)
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.CONTACT,
    )
    subject = models.CharField(max_length=255)
    body = models.TextField(max_length=2000)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'contact_messages'
        ordering = ['-created_at']

    def __str__(self):
        return f"Message from {self.sender_id} to {self.recipient_id}: {self.subject[:50]}"


def research_chat_upload_path(instance, filename):
    ext = filename.split(".")[-1] if "." in filename else ""
    ext = f".{ext.lower()}" if ext else ""
    return f"research_chat/{instance.research_id}/{uuid.uuid4()}{ext}"


class ResearchChatSettings(models.Model):
    class SendPermission(models.TextChoices):
        ALL = "all", "All Members"
        MENTORS_ONLY = "mentors_only", "Mentors Only"

    research = models.OneToOneField(
        Research,
        on_delete=models.CASCADE,
        related_name="chat_settings",
    )
    send_permission = models.CharField(
        max_length=20,
        choices=SendPermission.choices,
        default=SendPermission.ALL,
    )
    files_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "research_chat_settings"

    def __str__(self):
        return f"ChatSettings for Research #{self.research_id}"


class ResearchChatMessage(models.Model):
    research = models.ForeignKey(
        Research,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    body = models.TextField(max_length=2000, blank=True)
    file = models.FileField(upload_to=research_chat_upload_path, null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    is_pinned = models.BooleanField(default=False)
    pinned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pinned_chat_messages",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "research_chat_messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"ChatMessage #{self.id} in Research #{self.research_id} by User #{self.sender_id}"
