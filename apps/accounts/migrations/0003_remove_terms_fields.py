# Generated migration to remove unused terms_accepted fields

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_add_terms_acceptance_fields'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='terms_accepted',
        ),
        migrations.RemoveField(
            model_name='user',
            name='terms_accepted_at',
        ),
    ]
