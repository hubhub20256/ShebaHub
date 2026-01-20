import uuid

from django.conf import settings
from django.db import models


def research_contract_upload_path(instance, filename):
    ext = filename.split(".")[-1] if "." in filename else ""
    ext = f".{ext.lower()}" if ext else ""
    return f"research_contracts/{instance.owner_id}/{uuid.uuid4()}{ext}"


class Research(models.Model):
    """A research project posted/managed by a user (usually a mentor)."""

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

    teamSize = models.PositiveIntegerField(null=True, blank=True)
    startDate = models.DateField(null=True, blank=True)
    weeklyHours = models.PositiveIntegerField(null=True, blank=True)
    durationWeeks = models.PositiveIntegerField(null=True, blank=True)

    compensation = models.CharField(max_length=100, blank=True)
    workMode = models.CharField(max_length=50, blank=True)
    requirements = models.TextField(blank=True)
    skillsAndTools = models.TextField(blank=True)
    output = models.TextField(blank=True)

    location = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=50, blank=True)
    helsinkiApproval = models.CharField(max_length=100, blank=True)
    dataType = models.CharField(max_length=50, blank=True)

    contract = models.FileField(upload_to=research_contract_upload_path, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "research_applications"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["research", "applicant"], name="uniq_research_applicant"),
        ]

    def __str__(self):
        return f"Application #{self.id}: research={self.research_id} applicant={self.applicant_id} status={self.status}"
