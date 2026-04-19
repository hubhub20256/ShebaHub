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


def check_research_permission(request, research_id, permission_name=None):
    """
    Check if the user has access to manage a research.

    Returns (research, None) on success, or (None, Response) on failure.

    - Owner always passes.
    - If permission_name is None → owner-only (for delete, permission mgmt).
    - Otherwise checks if user is an approved mentor with the specific flag.
    """
    from .models import Research, ResearchApplication

    try:
        research = Research.objects.get(id=research_id)
    except Research.DoesNotExist:
        return None, Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    # Owner always has full access
    if research.owner_id == request.user.id:
        return research, None

    # If no specific permission requested → owner-only action
    if permission_name is None:
        return None, Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    # Check if user is an approved mentor with the required permission
    is_mentor = MentorProfile.objects.filter(user=request.user).exists()
    if not is_mentor:
        return None, Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        application = ResearchApplication.objects.get(
            research=research,
            applicant=request.user,
            status=ResearchApplication.Status.APPROVED,
        )
    except ResearchApplication.DoesNotExist:
        return None, Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if not getattr(application, permission_name, False):
        return None, Response(
            {"detail": "אין לך הרשאה לפעולה זו."},
            status=status.HTTP_403_FORBIDDEN,
        )

    return research, None


def check_research_any_permission(request, research_id):
    """
    Check if the user is the owner or an approved mentor with ANY permission.

    Returns (research, None) on success, or (None, Response) on failure.
    """
    from .models import Research, ResearchApplication
    from django.db.models import Q

    try:
        research = Research.objects.get(id=research_id)
    except Research.DoesNotExist:
        return None, Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if research.owner_id == request.user.id:
        return research, None

    is_mentor = MentorProfile.objects.filter(user=request.user).exists()
    if not is_mentor:
        return None, Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    has_any = ResearchApplication.objects.filter(
        research=research,
        applicant=request.user,
        status=ResearchApplication.Status.APPROVED,
    ).filter(
        Q(can_edit=True) | Q(can_approve=True) | Q(can_invite=True) | Q(can_remove=True) | Q(can_manage_chat=True)
    ).exists()

    if not has_any:
        return None, Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    return research, None
