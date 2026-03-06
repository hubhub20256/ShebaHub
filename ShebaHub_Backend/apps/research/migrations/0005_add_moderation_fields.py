from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("research", "0004_researchapplication_mentor_note_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="research",
            name="moderation_status",
            field=models.CharField(
                choices=[
                    ("approved", "Approved"),
                    ("pending", "Pending Review"),
                    ("flagged", "Flagged"),
                    ("rejected", "Rejected"),
                ],
                default="approved",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="research",
            name="moderation_note",
            field=models.TextField(blank=True, default=""),
            preserve_default=False,
        ),
    ]
