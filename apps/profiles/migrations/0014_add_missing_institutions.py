"""
Data migration to add missing institutions that exist in the frontend dropdown
but were not in the original seed data.
"""

from django.db import migrations


def add_missing_institutions(apps, schema_editor):
    Institution = apps.get_model('profiles', 'Institution')

    missing = [
        ("haifa_university", "אוניברסיטת חיפה"),
        ("weizmann_institute", "מכון ויצמן למדע"),
        ("reichman_university", "אוניברסיטת רייכמן"),
        ("hit_holon", "המכון הטכנולוגי חולון"),
    ]
    # Start sort_order after existing entries
    last_order = Institution.objects.order_by('-sort_order').values_list('sort_order', flat=True).first() or 0
    for i, (name, name_he) in enumerate(missing, 1):
        Institution.objects.update_or_create(
            name=name,
            defaults={'name_he': name_he, 'is_active': True, 'sort_order': last_order + i}
        )


def reverse_migration(apps, schema_editor):
    Institution = apps.get_model('profiles', 'Institution')
    Institution.objects.filter(
        name__in=["haifa_university", "weizmann_institute", "reichman_university", "hit_holon"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0013_mentorprofile_linkedinurl_studentprofile_linkedinurl'),
    ]

    operations = [
        migrations.RunPython(add_missing_institutions, reverse_migration),
    ]
