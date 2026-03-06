import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()

DEFAULT_EMAIL = "admin@sheba.com"
DEFAULT_PASSWORD = "ShebahubHit@@!#42"


class Command(BaseCommand):
    help = "Create the default staff admin user (not a superuser)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            default=os.environ.get("ADMIN_EMAIL", DEFAULT_EMAIL),
            help="Admin email (default: admin@sheba.com or ADMIN_EMAIL env var)",
        )
        parser.add_argument(
            "--password",
            default=os.environ.get("ADMIN_PASSWORD", DEFAULT_PASSWORD),
            help="Admin password (default: built-in or ADMIN_PASSWORD env var)",
        )

    def handle(self, *args, **options):
        email = options["email"]
        password = options["password"]

        if User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
            if not user.is_staff:
                user.is_staff = True
                user.save(update_fields=["is_staff"])
                self.stdout.write(self.style.SUCCESS(
                    f"Existing user '{email}' promoted to staff admin."
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f"Admin user '{email}' already exists. No changes made."
                ))
            return

        user = User.objects.create_user(
            email=email,
            password=password,
            firstName="Admin",
            lastName="ShebaHub",
        )
        user.is_staff = True
        user.is_superuser = False
        user.email_verified = True
        user.save(update_fields=["is_staff", "is_superuser", "email_verified"])

        self.stdout.write(self.style.SUCCESS(
            f"Staff admin created: {email}"
        ))
