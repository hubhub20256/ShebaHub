"""
File upload security utilities.

Provides:
- Magic-byte validation (file signature verification)
- ClamAV virus scanning integration (optional, graceful degradation)
- UUID-based secure filename generation
- Centralized file validation pipeline
"""

import logging
import os
import uuid

from django.conf import settings

logger = logging.getLogger(__name__)
audit_logger = logging.getLogger('audit')

# ---------------------------------------------------------------------------
# Magic byte signatures for allowed file types
# ---------------------------------------------------------------------------
# Map of extension → list of valid magic byte prefixes (as bytes objects).
# A file is valid if its content starts with ANY of the listed prefixes.
MAGIC_BYTES = {
    '.pdf':  [b'%PDF'],
    '.doc':  [b'\xd0\xcf\x11\xe0'],          # OLE2 compound document
    '.docx': [b'PK\x03\x04', b'PK\x05\x06'],  # ZIP-based OOXML
    '.jpg':  [b'\xff\xd8\xff'],
    '.jpeg': [b'\xff\xd8\xff'],
    '.png':  [b'\x89PNG\r\n\x1a\n'],
    '.webp': [b'RIFF'],
    '.gif':  [b'GIF87a', b'GIF89a'],
}

# Minimum bytes to read for magic validation
MAGIC_READ_SIZE = 16


def validate_magic_bytes(uploaded_file):
    """
    Verify that the file content matches expected magic bytes for its extension.

    Returns:
        (is_valid: bool, error_message: str | None)
    """
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    expected_signatures = MAGIC_BYTES.get(ext)

    if expected_signatures is None:
        # No magic bytes defined for this extension — skip check
        return True, None

    # Read the first few bytes (seek back after)
    uploaded_file.seek(0)
    header = uploaded_file.read(MAGIC_READ_SIZE)
    uploaded_file.seek(0)

    if not header:
        return False, f"File is empty or unreadable."

    for sig in expected_signatures:
        if header[:len(sig)] == sig:
            return True, None

    return False, (
        f"File content does not match expected format for '{ext}'. "
        f"The file may be corrupted or have an incorrect extension."
    )


# ---------------------------------------------------------------------------
# ClamAV virus scanning (optional)
# ---------------------------------------------------------------------------
# Requires: pip install pyclamd
# ClamAV daemon must be running. Configure via settings:
#   CLAMAV_ENABLED = True
#   CLAMAV_SOCKET = '/var/run/clamav/clamd.ctl'   (Unix socket)
#   — or —
#   CLAMAV_HOST = '127.0.0.1'
#   CLAMAV_PORT = 3310

def _get_clamd():
    """Get a pyclamd connection, or None if ClamAV is not available."""
    if not getattr(settings, 'CLAMAV_ENABLED', False):
        return None

    try:
        import pyclamd
    except ImportError:
        logger.warning("CLAMAV_ENABLED=True but pyclamd is not installed. Skipping virus scan.")
        return None

    try:
        socket_path = getattr(settings, 'CLAMAV_SOCKET', None)
        if socket_path:
            cd = pyclamd.ClamdUnixSocket(filename=socket_path)
        else:
            host = getattr(settings, 'CLAMAV_HOST', '127.0.0.1')
            port = getattr(settings, 'CLAMAV_PORT', 3310)
            cd = pyclamd.ClamdNetworkSocket(host=host, port=port)

        if cd.ping():
            return cd
        else:
            logger.warning("ClamAV daemon not responding to ping.")
            return None
    except Exception as exc:
        logger.warning(f"Could not connect to ClamAV: {exc}")
        return None


def scan_file_for_viruses(uploaded_file):
    """
    Scan an uploaded file with ClamAV.

    Returns:
        (is_clean: bool, threat_name: str | None)

    If ClamAV is disabled or unavailable, returns (True, None) — i.e. assumes clean.
    """
    cd = _get_clamd()
    if cd is None:
        return True, None

    try:
        uploaded_file.seek(0)
        result = cd.scan_stream(uploaded_file.read())
        uploaded_file.seek(0)

        if result is None:
            # No threat found
            return True, None

        # result format: {'stream': ('FOUND', 'Eicar-Test-Signature')}
        status_info = result.get('stream', ('OK',))
        if status_info[0] == 'FOUND':
            threat = status_info[1] if len(status_info) > 1 else 'unknown'
            audit_logger.critical(
                f"VIRUS DETECTED in uploaded file: {uploaded_file.name}",
                extra={'threat': threat, 'filename': uploaded_file.name},
            )
            return False, threat

        return True, None
    except Exception as exc:
        logger.error(f"ClamAV scan error: {exc}")
        # Fail-open: if scanning breaks, allow the upload but log it
        audit_logger.warning(
            f"ClamAV scan failed for {uploaded_file.name}: {exc}. Upload allowed (fail-open)."
        )
        return True, None


# ---------------------------------------------------------------------------
# UUID-based secure filename generation
# ---------------------------------------------------------------------------

def generate_secure_filename(original_filename):
    """
    Generate a UUID-based filename preserving only the extension.
    This prevents path traversal, name collisions, and information leakage.
    """
    ext = os.path.splitext(original_filename)[1].lower()
    return f"{uuid.uuid4()}{ext}"


# ---------------------------------------------------------------------------
# Full validation pipeline
# ---------------------------------------------------------------------------

def validate_upload(uploaded_file, allowed_extensions=None, max_size_mb=None):
    """
    Run full validation pipeline on an uploaded file:
    1. Extension check
    2. Size check
    3. Magic bytes verification
    4. Virus scan (if ClamAV enabled)

    Returns:
        (is_valid: bool, error_message: str | None)
    """
    if allowed_extensions is None:
        allowed_extensions = getattr(
            settings, 'ALLOWED_DOCUMENT_EXTENSIONS',
            ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
        )
    if max_size_mb is None:
        max_size_mb = getattr(settings, 'MAX_DOCUMENT_SIZE_MB', 10)

    max_size_bytes = max_size_mb * 1024 * 1024

    # 1. Extension
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    if ext not in allowed_extensions:
        return False, (
            f"File type '{ext}' is not allowed. "
            f"Allowed types: {', '.join(allowed_extensions)}"
        )

    # 2. Size
    if uploaded_file.size > max_size_bytes:
        return False, (
            f"File size ({uploaded_file.size / (1024*1024):.2f} MB) exceeds "
            f"maximum allowed size ({max_size_mb} MB)."
        )

    # 3. Magic bytes
    is_valid, error = validate_magic_bytes(uploaded_file)
    if not is_valid:
        audit_logger.warning(
            f"Magic bytes mismatch for {uploaded_file.name}: {error}",
            extra={'filename': uploaded_file.name, 'extension': ext},
        )
        return False, error

    # 4. Virus scan
    is_clean, threat = scan_file_for_viruses(uploaded_file)
    if not is_clean:
        return False, f"File rejected: malware detected ({threat})."

    return True, None
