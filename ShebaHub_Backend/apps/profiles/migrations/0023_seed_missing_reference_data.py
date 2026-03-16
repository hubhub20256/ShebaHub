# Generated manually — seeds missing institutions used by the frontend

from django.db import migrations


def seed_missing_institutions(apps, schema_editor):
    Institution = apps.get_model('profiles', 'Institution')
    missing = [
        ('אוניברסיטת חיפה', 'University of Haifa'),
        ('מכון ויצמן למדע', 'Weizmann Institute of Science'),
        ('אוניברסיטת רייכמן (הבינתחומי)', 'Reichman University (IDC)'),
    ]
    for name_he, name_en in missing:
        Institution.objects.get_or_create(
            name_he=name_he,
            defaults={
                'name': name_en,
                'is_active': True,
                'sort_order': 0,
            },
        )


def reverse_seed(apps, schema_editor):
    Institution = apps.get_model('profiles', 'Institution')
    Institution.objects.filter(name_he__in=[
        'אוניברסיטת חיפה',
        'מכון ויצמן למדע',
        'אוניברסיטת רייכמן (הבינתחומי)',
    ]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0022_add_specialty_groups_m2m'),
    ]

    operations = [
        migrations.RunPython(seed_missing_institutions, reverse_seed),
    ]
