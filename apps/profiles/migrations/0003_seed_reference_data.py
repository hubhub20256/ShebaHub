"""
Data migration to seed reference tables with placeholder values.

This migration populates all dropdown/reference tables with placeholder data.
Replace with real values once received from the product/Sheba team.
"""

from django.db import migrations


def seed_reference_data(apps, schema_editor):
    """Seed all reference tables with placeholder values."""
    
    # Get all reference models
    Institution = apps.get_model('profiles', 'Institution')
    Degree = apps.get_model('profiles', 'Degree')
    AcademicRank = apps.get_model('profiles', 'AcademicRank')
    MedicalTrainingStage = apps.get_model('profiles', 'MedicalTrainingStage')
    Specialty = apps.get_model('profiles', 'Specialty')
    ResearchInterest = apps.get_model('profiles', 'ResearchInterest')
    WorkType = apps.get_model('profiles', 'WorkType')
    ParticipationMode = apps.get_model('profiles', 'ParticipationMode')
    ProfessionalExperience = apps.get_model('profiles', 'ProfessionalExperience')
    CompensationPreference = apps.get_model('profiles', 'CompensationPreference')
    
    # Helper function to create placeholder records
    def create_placeholders(model, count=3):
        for i in range(1, count + 1):
            model.objects.get_or_create(
                name=f'PLACEHOLDER_{i}',
                defaults={
                    'name_he': f'מציין מקום {i}',
                    'is_active': True,
                    'sort_order': i,
                }
            )
    
    # Seed all reference tables
    create_placeholders(Institution)
    create_placeholders(Degree)
    create_placeholders(AcademicRank)
    create_placeholders(MedicalTrainingStage)
    create_placeholders(Specialty)
    create_placeholders(ResearchInterest)
    create_placeholders(WorkType)
    
    # Participation modes with more meaningful placeholders
    participation_modes = [
        ('REMOTE', 'מרחוק', 1),
        ('ON_SITE', 'באתר', 2),
        ('HYBRID', 'היברידי', 3),
    ]
    for name, name_he, order in participation_modes:
        ParticipationMode.objects.get_or_create(
            name=name,
            defaults={
                'name_he': name_he,
                'is_active': True,
                'sort_order': order,
            }
        )
    
    create_placeholders(ProfessionalExperience)
    create_placeholders(CompensationPreference)


def reverse_seed(apps, schema_editor):
    """Remove seeded data (for rollback)."""
    models_to_clear = [
        'Institution',
        'Degree',
        'AcademicRank',
        'MedicalTrainingStage',
        'Specialty',
        'ResearchInterest',
        'WorkType',
        'ParticipationMode',
        'ProfessionalExperience',
        'CompensationPreference',
    ]
    
    for model_name in models_to_clear:
        model = apps.get_model('profiles', model_name)
        model.objects.filter(name__startswith='PLACEHOLDER_').delete()
        if model_name == 'ParticipationMode':
            model.objects.filter(name__in=['REMOTE', 'ON_SITE', 'HYBRID']).delete()


class Migration(migrations.Migration):
    
    dependencies = [
        ('profiles', '0002_student_profile_and_reference_tables'),
    ]
    
    operations = [
        migrations.RunPython(seed_reference_data, reverse_seed),
    ]
