# Generated manually during merge reconciliation

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0020_remove_mentorprofile_recommendationrequest_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='mentorprofile',
            name='universityRank',
            field=models.CharField(
                blank=True,
                db_column='university_rank',
                help_text='Academic university rank',
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name='mentorprofile',
            name='universityAffiliation',
            field=models.CharField(
                blank=True,
                db_column='university_affiliation',
                help_text='University affiliation',
                max_length=255,
            ),
        ),
    ]
