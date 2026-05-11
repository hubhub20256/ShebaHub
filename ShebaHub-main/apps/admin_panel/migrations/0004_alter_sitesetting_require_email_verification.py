from django.db import migrations, models


def set_existing_rows_to_true(apps, schema_editor):
    SiteSetting = apps.get_model("admin_panel", "SiteSetting")
    SiteSetting.objects.update(require_email_verification_to_apply=True)


class Migration(migrations.Migration):

    dependencies = [
        ("admin_panel", "0003_systemannouncement_announcementdismissal_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sitesetting",
            name="require_email_verification_to_apply",
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(set_existing_rows_to_true, migrations.RunPython.noop),
    ]
