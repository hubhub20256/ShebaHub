from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("research", "0021_researchapplication_invited_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="research",
            name="academic_tracks",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Relevant academic study tracks, e.g. ["עבודת גמר", "תזה", "PhD"]',
            ),
        ),
    ]
