"""
Custom exception handling for unified API error responses.

This module provides a custom exception handler that wraps all API errors
in a consistent format for frontend consumption.

Error Response Format:
{
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {...}  // Optional additional details
}
"""

import logging
from typing import Any, Dict, Optional

from rest_framework import status
from rest_framework.views import exception_handler
from rest_framework.exceptions import (
    APIException,
    ValidationError,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    NotFound,
    MethodNotAllowed,
    Throttled,
)

logger = logging.getLogger('audit')


# Error code mappings
ERROR_CODES = {
    'ValidationError': 'VALIDATION_ERROR',
    'AuthenticationFailed': 'AUTHENTICATION_FAILED',
    'NotAuthenticated': 'NOT_AUTHENTICATED',
    'PermissionDenied': 'PERMISSION_DENIED',
    'NotFound': 'NOT_FOUND',
    'MethodNotAllowed': 'METHOD_NOT_ALLOWED',
    'Throttled': 'RATE_LIMIT_EXCEEDED',
}


def get_error_code(exception: Exception) -> str:
    """
    Get the error code for a given exception.
    """
    exception_class = exception.__class__.__name__
    return ERROR_CODES.get(exception_class, 'SERVER_ERROR')


def format_validation_errors(detail: Any) -> Dict[str, Any]:
    """
    Format validation errors into a consistent structure.
    """
    if isinstance(detail, dict):
        return detail
    if isinstance(detail, list):
        return {'non_field_errors': detail}
    return {'error': str(detail)}


def custom_exception_handler(exc: Exception, context: Any) -> Optional[Any]:
    """
    Custom exception handler that returns errors in a unified format.
    
    All errors are returned with the structure:
    {
        "code": "ERROR_CODE",
        "message": "Human readable message",
        "details": {...}  // For validation errors, field-level details
    }
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is None:
        # Unhandled exception - log it and return generic error
        logger.error(
            f"Unhandled exception: {exc.__class__.__name__}: {str(exc)}",
            exc_info=True
        )
        return None
    
    error_code = get_error_code(exc)
    
    # Build the error response
    if isinstance(exc, ValidationError):
        error_response = {
            'code': error_code,
            'message': 'Validation failed',
            'details': format_validation_errors(response.data),
        }
    elif isinstance(exc, AuthenticationFailed):
        error_response = {
            'code': error_code,
            'message': str(exc.detail) if hasattr(exc, 'detail') else 'Authentication failed',
            'details': None,
        }
    elif isinstance(exc, NotAuthenticated):
        error_response = {
            'code': error_code,
            'message': 'Authentication credentials were not provided',
            'details': None,
        }
    elif isinstance(exc, PermissionDenied):
        error_response = {
            'code': error_code,
            'message': str(exc.detail) if hasattr(exc, 'detail') else 'Permission denied',
            'details': None,
        }
    elif isinstance(exc, NotFound):
        error_response = {
            'code': error_code,
            'message': 'Resource not found',
            'details': None,
        }
    elif isinstance(exc, Throttled):
        error_response = {
            'code': error_code,
            'message': f'Request was throttled. Try again in {exc.wait} seconds.',
            'details': {'retry_after': exc.wait},
        }
    else:
        # Generic API exception
        message = str(exc.detail) if hasattr(exc, 'detail') else str(exc)
        error_response = {
            'code': error_code,
            'message': message,
            'details': None,
        }
    
    response.data = error_response
    return response


class BusinessLogicError(APIException):
    """
    Custom exception for business logic errors.
    Use this for domain-specific errors that aren't covered by DRF's built-in exceptions.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'A business logic error occurred.'
    default_code = 'BUSINESS_LOGIC_ERROR'
    
    def __init__(self, detail: str = None, code: str = None):
        self.detail = detail or self.default_detail
        self.code = code or self.default_code
        super().__init__(detail=self.detail)
