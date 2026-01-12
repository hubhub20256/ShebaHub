from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.permissions import AllowAny

from .views import signup_view, login_view


# Custom TokenRefreshView with AllowAny permission
class PublicTokenRefreshView(TokenRefreshView):
    """Token refresh endpoint - accessible without authentication (uses refresh token)."""
    permission_classes = [AllowAny]


urlpatterns = [
    path('signup/', signup_view, name='signup'),
    path('login/', login_view, name='login'),
    path('token/refresh/', PublicTokenRefreshView.as_view(), name='token_refresh'),
]
