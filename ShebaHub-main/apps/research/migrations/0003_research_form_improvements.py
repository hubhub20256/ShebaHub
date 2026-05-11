"""
Add team size clarification fields, estimated completion date, and compensation types.
Section 3 — Research Project Form Improvements.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('research', '0002_researchapplication'),
    ]

    operations = [
        migrations.AddField(
            model_name='research',
            name='teamResearchersCount',
            field=models.PositiveIntegerField(
                blank=True, null=True,
                db_column='team_researchers_count',
                help_text='Number of researchers in the team',
            ),
        ),
        migrations.AddField(
            model_name='research',
            name='teamInternsCount',
            field=models.PositiveIntegerField(
                blank=True, null=True,
                db_column='team_interns_count',
                help_text='Number of interns/students in the team',
            ),
        ),
        migrations.AddField(
            model_name='research',
            name='estimatedCompletionDate',
            field=models.DateField(
                blank=True, null=True,
                db_column='estimated_completion_date',
                help_text='Estimated project completion date',
            ),
        ),
        migrations.AddField(
            model_name='research',
            name='compensationTypes',
            field=models.JSONField(
                blank=True, default=list,
                db_column='compensation_types',
                help_text='List of compensation types, e.g. ["מלגה", "קרדיט אקדמי", "גמיש"]',
            ),
        ),
    ]
