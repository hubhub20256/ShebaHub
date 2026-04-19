"""Admin credentials for the platform's built-in admin account.

Reads from environment variables with NO hardcoded defaults.
If either ADMIN_EMAIL or ADMIN_PASSWORD is missing, the admin
backend will be disabled safely.
"""

import logging
import os

logger = logging.getLogger(__name__)

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')

if not ADMIN_EMAIL or not ADMIN_PASSWORD:
    logger.warning(
        "ADMIN_EMAIL and/or ADMIN_PASSWORD not set in environment. "
        "Env-based admin authentication is disabled."
    )
