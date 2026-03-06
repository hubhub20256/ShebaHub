"""
Common utilities and helper functions for the ShebaHub backend.
This module can be extended with shared utilities as the application grows.
"""

import html
import re
import uuid
from typing import Any, Dict


def generate_uuid() -> str:
    """
    Generate a UUID4 string.
    
    Returns:
        str: UUID4 string
    """
    return str(uuid.uuid4())


def sanitize_text(value: str) -> str:
    """Strip HTML tags, decode entities, collapse whitespace."""
    if not isinstance(value, str):
        return value
    # Strip HTML tags
    value = re.sub(r"<[^>]+>", "", value)
    # Decode HTML entities, then re-strip in case entities produced tags
    value = html.unescape(value)
    value = re.sub(r"<[^>]+>", "", value)
    # Collapse horizontal whitespace (tabs/spaces) into single space per line
    value = re.sub(r"[^\S\n]+", " ", value)
    # Cap consecutive newlines at 2
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def clean_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove None values from a dictionary.
    
    Args:
        data: Dictionary to clean
    
    Returns:
        Dictionary with None values removed
    """
    return {k: v for k, v in data.items() if v is not None}
