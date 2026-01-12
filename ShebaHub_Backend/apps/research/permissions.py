from rest_framework import status
from rest_framework.response import Response

from apps.profiles.models import MentorProfile


def require_mentor(request):
    """Return a Response if the user is not a mentor; otherwise None."""
    try:
        if MentorProfile.objects.filter(user=request.user).exists():
            return None
    except Exception:
        pass
    return Response(
        {"detail": "Only mentors can create or manage researches."},
        status=status.HTTP_403_FORBIDDEN,
    )
