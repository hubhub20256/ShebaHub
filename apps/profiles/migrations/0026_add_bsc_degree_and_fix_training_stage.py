"""
Data migration: add BSc degree to ref_degrees and fix MedicalTrainingStage
'doctor_mitmahe' name_he from 'רופא מתמחה' to 'רופא מומחה' to match frontend.
"""

from django.db import migrations


def add_bsc_and_fix_stage(apps, schema_editor):
    Degree = apps.get_model('profiles', 'Degree')
    MedicalTrainingStage = apps.get_model('profiles', 'MedicalTrainingStage')

    # Add BSc degree if not present
    Degree.objects.update_or_create(
        name='BSc',
        defaults={'name_he': 'BSc', 'is_active': True, 'sort_order': 6},
    )

    # Fix MedicalTrainingStage: rename Hebrew label from רופא מתמחה to רופא מומחה
    MedicalTrainingStage.objects.filter(name='doctor_mitmahe').update(
        name_he='רופא מומחה',
    )


def reverse_migration(apps, schema_editor):
    Degree = apps.get_model('profiles', 'Degree')
    MedicalTrainingStage = apps.get_model('profiles', 'MedicalTrainingStage')

    Degree.objects.filter(name='BSc').delete()
    MedicalTrainingStage.objects.filter(name='doctor_mitmahe').update(
        name_he='רופא מתמחה',
    )


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0025_protect_fks_and_ordering'),
    ]

    operations = [
        migrations.RunPython(add_bsc_and_fix_stage, reverse_migration),
    ]
