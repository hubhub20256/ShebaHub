from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .views import signup_view, login_view, password_reset_request, password_reset_confirm, logout_view, me_view, verify_email, resend_verification


# Custom TokenRefreshView with AllowAny permission
@extend_schema(
    summary="Refresh access token",
    description=(
        "Submit a valid refresh token to receive a new access token. "
        "Returns 401 if the refresh token is expired or invalid."
    ),
    responses={
        200: OpenApiResponse(description="New access token returned"),
        401: OpenApiResponse(description="Refresh token is invalid or expired"),
    },
)
class PublicTokenRefreshView(TokenRefreshView):
    """Token refresh endpoint - accessible without authentication (uses refresh token)."""
    permission_classes = [AllowAny]


urlpatterns = [
    path('signup/', signup_view, name='signup'),
    path('login/', login_view, name='login'),
    path('token/refresh/', PublicTokenRefreshView.as_view(), name='token_refresh'),
    path('password-reset/', password_reset_request, name='password_reset_request'),
    path('password-reset/confirm/', password_reset_confirm, name='password_reset_confirm'),
    path('logout/', logout_view, name='logout'),
    path('me/', me_view, name='me'),
    path('verify-email/', verify_email, name='verify_email'),
    path('resend-verification/', resend_verification, name='resend_verification'),
]
