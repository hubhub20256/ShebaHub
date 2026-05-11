"""Change gender values from man/woman to male/female to match frontend."""

from django.db import migrations, models


def to_male_female(apps, schema_editor):
    """Convert 'man' -> 'male' and 'woman' -> 'female'."""
    User = apps.get_model('accounts', 'User')
    User.objects.filter(gender='man').update(gender='male')
    User.objects.filter(gender='woman').update(gender='female')


def to_man_woman(apps, schema_editor):
    """Convert 'male' -> 'man' and 'female' -> 'woman' (reverse)."""
    User = apps.get_model('accounts', 'User')
    User.objects.filter(gender='male').update(gender='man')
    User.objects.filter(gender='female').update(gender='woman')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_add_indexes_email_verified_is_active'),
    ]

    operations = [
        migrations.RunPython(to_male_female, to_man_woman),
        migrations.AlterField(
            model_name='user',
            name='gender',
            field=models.CharField(
                blank=True,
                choices=[('male', 'זכר'), ('female', 'נקבה'), ('other', 'אחר')],
                max_length=10,
                null=True,
            ),
        ),
    ]
