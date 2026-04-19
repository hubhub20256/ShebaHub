# Migration to rename User fields and update gender choices
# This migration handles the transition from snake_case to camelCase field names

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_remove_terms_fields'),
    ]

    operations = [
        # Rename first_name to firstName
        migrations.RenameField(
            model_name='user',
            old_name='first_name',
            new_name='firstName',
        ),
        # Rename last_name to lastName
        migrations.RenameField(
            model_name='user',
            old_name='last_name',
            new_name='lastName',
        ),
        # Update gender choices from MALE/FEMALE/OTHER to man/woman/other
        migrations.AlterField(
            model_name='user',
            name='gender',
            field=models.CharField(
                blank=True,
                choices=[('man', 'Man'), ('woman', 'Woman'), ('other', 'Other')],
                max_length=10,
                null=True,
            ),
        ),
    ]
