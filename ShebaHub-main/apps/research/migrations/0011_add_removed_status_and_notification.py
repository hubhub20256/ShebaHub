"""
Add 'removed' status to ResearchApplication and 'application_removed'
notification type to ContactMessage for the kick-student feature.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('research', '0010_research_is_deleted'),
    ]

    operations = [
        migrations.AlterField(
            model_name='researchapplication',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('cancelled', 'Cancelled'),
                    ('invited', 'Invited'),
                    ('removed', 'Removed'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='contactmessage',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('contact', 'Contact Message'),
                    ('application_new', 'New Application'),
                    ('application_approved', 'Application Approved'),
                    ('application_rejected', 'Application Rejected'),
                    ('application_invited', 'Research Invitation'),
                    ('application_removed', 'Removed from Research'),
                ],
                default='contact',
                max_length=30,
            ),
        ),
    ]
