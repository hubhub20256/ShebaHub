"""
Data migration: copy existing specialty FK values into the new M2M specialties field.
"""

from django.db import migrations


def copy_specialty_to_m2m(apps, schema_editor):
    StudentProfile = apps.get_model('profiles', 'StudentProfile')
    MentorProfile = apps.get_model('profiles', 'MentorProfile')

    for profile in StudentProfile.objects.filter(specialty__isnull=False):
        profile.specialties.add(profile.specialty)

    for profile in MentorProfile.objects.filter(specialty__isnull=False):
        profile.specialties.add(profile.specialty)


def reverse_copy(apps, schema_editor):
    # No-op: the FK field still exists, data is still there
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0011_add_specialties_m2m'),
    ]

    operations = [
        migrations.RunPython(copy_specialty_to_m2m, reverse_copy),
    ]
