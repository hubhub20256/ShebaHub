"""Revert gender values back to man/woman (was changed to male/female in 0007)."""

from django.db import migrations, models


def revert_gender_values(apps, schema_editor):
    """Convert 'male' -> 'man' and 'female' -> 'woman'."""
    User = apps.get_model('accounts', 'User')
    User.objects.filter(gender='male').update(gender='man')
    User.objects.filter(gender='female').update(gender='woman')


def forward_gender_values(apps, schema_editor):
    """Convert 'man' -> 'male' and 'woman' -> 'female' (reverse)."""
    User = apps.get_model('accounts', 'User')
    User.objects.filter(gender='man').update(gender='male')
    User.objects.filter(gender='woman').update(gender='female')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_user_email_verified_user_failed_login_attempts_and_more'),
    ]

    operations = [
        # 1. Data migration: revert values
        migrations.RunPython(revert_gender_values, forward_gender_values),
        # 2. Schema: update choices
        migrations.AlterField(
            model_name='user',
            name='gender',
            field=models.CharField(
                blank=True,
                choices=[('man', 'זכר'), ('woman', 'נקבה'), ('other', 'אחר')],
                max_length=10,
                null=True,
            ),
        ),
    ]
