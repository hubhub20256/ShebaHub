import logging

audit_logger = logging.getLogger('audit')


class SecurityHeadersMiddleware:
    """Add security headers that Django doesn't natively support."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        response['X-Permitted-Cross-Domain-Policies'] = 'none'
        return response


class RequestIPLoggingMiddleware:
    """Log client IP and authenticated user for every request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        ip = self._get_client_ip(request)
        user_id = str(request.user.pk) if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous'
        method = request.method
        path = request.path
        status_code = response.status_code

        audit_logger.info(
            "%s %s %s [user=%s ip=%s]",
            method, path, status_code, user_id, ip,
        )
        return response

    @staticmethod
    def _get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')
