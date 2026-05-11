"""
Add M2M specialties field to both StudentProfile and MentorProfile.
This supports multi-specialization selection (Section 1 — Critical Bug Fix #3).
The legacy FK 'specialty' is kept for backward compatibility and will be
populated automatically by the serializer.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0010_add_avatar_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentprofile',
            name='specialties',
            field=models.ManyToManyField(
                blank=True,
                help_text='Multiple specialties (replaces single specialty FK)',
                related_name='student_profiles_multi',
                to='profiles.specialty',
            ),
        ),
        migrations.AddField(
            model_name='mentorprofile',
            name='specialties',
            field=models.ManyToManyField(
                blank=True,
                help_text='Multiple specialties (replaces single specialty FK)',
                related_name='mentor_profiles_multi',
                to='profiles.specialty',
            ),
        ),
    ]
