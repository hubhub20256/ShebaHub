from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('admin_panel', '0002_sitesetting_alter_adminactionlog_action_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='SystemAnnouncement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('body', models.TextField(max_length=2000)),
                ('audience', models.CharField(choices=[('all', 'All Users'), ('mentors', 'Mentors Only'), ('students', 'Students Only')], default='all', max_length=10)),
                ('priority', models.CharField(choices=[('info', 'Info'), ('warning', 'Warning'), ('critical', 'Critical')], default='info', max_length=10)),
                ('is_active', models.BooleanField(default=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_announcements', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'system_announcements',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AnnouncementDismissal',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('dismissed_at', models.DateTimeField(auto_now_add=True)),
                ('announcement', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dismissals', to='admin_panel.systemannouncement')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dismissed_announcements', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'announcement_dismissals',
            },
        ),
        migrations.AddConstraint(
            model_name='announcementdismissal',
            constraint=models.UniqueConstraint(fields=('announcement', 'user'), name='unique_dismissal'),
        ),
        migrations.AlterField(
            model_name='adminactionlog',
            name='action_type',
            field=models.CharField(choices=[('research_approve', 'Research Approved'), ('research_reject', 'Research Rejected'), ('research_flag', 'Research Flagged'), ('research_soft_delete', 'Research Soft-Deleted'), ('research_restore', 'Research Restored'), ('user_deactivate', 'User Deactivated'), ('user_reactivate', 'User Reactivated'), ('user_force_verify', 'User Force-Verified'), ('research_edit', 'Research Edited'), ('settings_updated', 'Settings Updated'), ('announcement_create', 'Announcement Created'), ('announcement_update', 'Announcement Updated'), ('announcement_deactivate', 'Announcement Deactivated'), ('user_edit', 'User Edited'), ('application_override', 'Application Status Overridden')], max_length=40),
        ),
    ]
