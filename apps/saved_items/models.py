from django.conf import settings
from django.db import models


class SavedItem(models.Model):
    """
    User-private saved/bookmarked item.
    Supports saving mentor profiles, student profiles, and research items.
    """

    class ContentType(models.TextChoices):
        RESEARCH = "research", "Research"
        MENTOR_PROFILE = "mentor_profile", "Mentor Profile"
        STUDENT_PROFILE = "student_profile", "Student Profile"

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_items",
    )
    content_type = models.CharField(max_length=20, choices=ContentType.choices)
    object_id = models.CharField(
        max_length=255,
        help_text="UUID (profiles) or integer ID (research) of the saved target.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "saved_items"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "content_type", "object_id"],
                name="unique_saved_item_per_user",
            ),
        ]

    def __str__(self):
        return f"SavedItem({self.user_id}, {self.content_type}, {self.object_id})"
