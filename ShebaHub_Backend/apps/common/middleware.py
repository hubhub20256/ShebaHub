class SecurityHeadersMiddleware:
    """Add security headers that Django doesn't natively support."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        response['X-Permitted-Cross-Domain-Policies'] = 'none'
        return response
