"""
Convert FK fields to free-text CharFields:
- MentorProfile.researchInterests: FK(ResearchInterest) -> CharField
- StudentProfile.workType: FK(WorkType) -> CharField

Data migration copies the referenced name into the new text column before
dropping the FK.
"""

from django.db import migrations, models


def copy_research_interests_fk_to_text(apps, schema_editor):
    """Copy ResearchInterest.name into MentorProfile.researchInterests_text."""
    MentorProfile = apps.get_model('profiles', 'MentorProfile')
    for profile in MentorProfile.objects.select_related('researchInterests').iterator(chunk_size=500):
        if profile.researchInterests:
            profile.researchInterests_text = profile.researchInterests.name or ''
        else:
            profile.researchInterests_text = ''
        profile.save(update_fields=['researchInterests_text'])


def copy_work_type_fk_to_text(apps, schema_editor):
    """Copy WorkType.name into StudentProfile.workType_text."""
    StudentProfile = apps.get_model('profiles', 'StudentProfile')
    for profile in StudentProfile.objects.select_related('workType').iterator(chunk_size=500):
        if profile.workType:
            profile.workType_text = profile.workType.name or ''
        else:
            profile.workType_text = ''
        profile.save(update_fields=['workType_text'])


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0023_seed_missing_reference_data'),
    ]

    operations = [
        # 1. Add temporary text columns
        migrations.AddField(
            model_name='mentorprofile',
            name='researchInterests_text',
            field=models.CharField(blank=True, default='', max_length=500),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='workType_text',
            field=models.CharField(blank=True, default='', max_length=255),
            preserve_default=False,
        ),

        # 2. Copy FK names into text columns
        migrations.RunPython(
            copy_research_interests_fk_to_text,
            migrations.RunPython.noop,
        ),
        migrations.RunPython(
            copy_work_type_fk_to_text,
            migrations.RunPython.noop,
        ),

        # 3. Remove the FK columns
        migrations.RemoveField(
            model_name='mentorprofile',
            name='researchInterests',
        ),
        migrations.RemoveField(
            model_name='studentprofile',
            name='workType',
        ),

        # 4. Rename text columns to the original field names
        migrations.RenameField(
            model_name='mentorprofile',
            old_name='researchInterests_text',
            new_name='researchInterests',
        ),
        migrations.RenameField(
            model_name='studentprofile',
            old_name='workType_text',
            new_name='workType',
        ),

        # 5. Set final db_column and help_text
        migrations.AlterField(
            model_name='mentorprofile',
            name='researchInterests',
            field=models.CharField(
                blank=True,
                db_column='research_interests_text',
                help_text='Research interest area (free text)',
                max_length=500,
            ),
        ),
        migrations.AlterField(
            model_name='studentprofile',
            name='workType',
            field=models.CharField(
                blank=True,
                db_column='work_type_text',
                help_text='Type of work sought (free text)',
                max_length=255,
            ),
        ),
    ]
