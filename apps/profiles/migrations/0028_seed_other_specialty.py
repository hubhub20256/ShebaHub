"""
Data migration: add "Other" (אחר) specialty entry to ref_specialties.
"""

from django.db import migrations


def add_other_specialty(apps, schema_editor):
    Specialty = apps.get_model('profiles', 'Specialty')
    Specialty.objects.update_or_create(
        name='Other',
        defaults={
            'name_he': 'אחר',
            'is_active': True,
            'sort_order': 9999,
            'group': None,
        },
    )


def reverse_migration(apps, schema_editor):
    Specialty = apps.get_model('profiles', 'Specialty')
    Specialty.objects.filter(name='Other').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0027_add_mentor_specialty_other'),
    ]

    operations = [
        migrations.RunPython(add_other_specialty, reverse_migration),
    ]
