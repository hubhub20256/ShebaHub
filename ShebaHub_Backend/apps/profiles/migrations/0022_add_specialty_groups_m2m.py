# Generated manually — adds specialtyGroups M2M to StudentProfile and MentorProfile

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0021_add_university_rank_and_affiliation'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentprofile',
            name='specialtyGroups',
            field=models.ManyToManyField(
                blank=True,
                help_text='Multiple specialty groups (e.g. מקצועות הבסיס, מקצועות העל)',
                related_name='student_profiles_multi',
                to='profiles.specialtygroup',
            ),
        ),
        migrations.AddField(
            model_name='mentorprofile',
            name='specialtyGroups',
            field=models.ManyToManyField(
                blank=True,
                help_text='Multiple specialty groups (e.g. מקצועות הבסיס, מקצועות העל)',
                related_name='mentor_profiles_multi',
                to='profiles.specialtygroup',
            ),
        ),
    ]
