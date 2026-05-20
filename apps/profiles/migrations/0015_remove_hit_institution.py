"""
Data migration to deactivate the HIT (המכון הטכנולוגי חולון) institution.
Sets is_active=False to hide it from dropdowns while preserving FK references.
"""

from django.db import migrations


def deactivate_hit(apps, schema_editor):
    Institution = apps.get_model('profiles', 'Institution')
    Institution.objects.filter(name='hit_holon').update(is_active=False)


def reactivate_hit(apps, schema_editor):
    Institution = apps.get_model('profiles', 'Institution')
    Institution.objects.filter(name='hit_holon').update(is_active=True)


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0014_add_missing_institutions'),
    ]

    operations = [
        migrations.RunPython(deactivate_hit, reactivate_hit),
    ]
