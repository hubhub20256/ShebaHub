from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('research', '0020_remove_research_durationweeks_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='researchapplication',
            name='invited_role',
            field=models.CharField(
                blank=True,
                choices=[('', ''), ('student', 'Student'), ('mentor', 'Mentor')],
                default='',
                help_text='Role the user was invited as (only for INVITED status)',
                max_length=10,
            ),
        ),
    ]
