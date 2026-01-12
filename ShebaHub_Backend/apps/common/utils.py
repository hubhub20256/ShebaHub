"""
Common utilities and helper functions for the ShebaHub backend.
This module can be extended with shared utilities as the application grows.
"""

import uuid
from typing import Any, Dict


def generate_uuid() -> str:
    """
    Generate a UUID4 string.
    
    Returns:
        str: UUID4 string
    """
    return str(uuid.uuid4())


def clean_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove None values from a dictionary.
    
    Args:
        data: Dictionary to clean
    
    Returns:
        Dictionary with None values removed
    """
    return {k: v for k, v in data.items() if v is not None}
