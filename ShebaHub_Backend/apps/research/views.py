from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from apps.profiles.models import StudentProfile

from .models import Research, ResearchApplication
from .serializers import ResearchSerializer, ResearchCreateSerializer, ResearchApplicationSerializer
from .permissions import require_mentor


def _is_truthy(value) -> bool:
    if value is True:
        return True
    if value is False or value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


@api_view(["GET"])
@permission_classes([AllowAny])
def researches(request):
    """GET /api/v1/research/ -> list all researches (public read)"""
    qs = Research.objects.all().order_by("-created_at")
    return Response(ResearchSerializer(qs, many=True, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def research_detail(request, research_id: int):
    """GET /api/v1/research/<id>/ -> get one research (public read)"""
    try:
        obj = Research.objects.get(id=research_id)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response(ResearchSerializer(obj, context={"request": request}).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def my_researches(request):
    """
    GET  /api/v1/research/me/       -> list current user's researches
    POST /api/v1/research/me/       -> create research for current user (supports multipart for contract)
    """
    deny = require_mentor(request)
    if deny is not None:
        return deny

    if request.method == "GET":
        qs = Research.objects.filter(owner=request.user).order_by("-created_at")
        return Response(ResearchSerializer(qs, many=True, context={"request": request}).data)

    serializer = ResearchCreateSerializer(data=request.data, context={"request": request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    obj = serializer.save()
    return Response(ResearchSerializer(obj, context={"request": request}).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def my_research_detail(request, research_id: int):
    """GET/PATCH/DELETE /api/v1/research/me/<id>/ -> get/update/delete one research owned by current user"""
    deny = require_mentor(request)
    if deny is not None:
        return deny

    try:
        obj = Research.objects.get(id=research_id, owner=request.user)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(ResearchSerializer(obj, context={"request": request}).data)

    if request.method == "PATCH":
        remove_contract = _is_truthy(request.data.get("remove_contract"))
        has_new_contract = "contract" in getattr(request, "FILES", {})

        data = request.data.copy()
        try:
            data.pop("remove_contract", None)
        except Exception:
            pass

        serializer = ResearchCreateSerializer(
            obj,
            data=data,
            partial=True,
            context={"request": request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        obj = serializer.save()

        if remove_contract and not has_new_contract:
            try:
                if obj.contract:
                    obj.contract.delete(save=False)
                    obj.contract = None
                    obj.save(update_fields=["contract"])
            except Exception:
                pass

        return Response(ResearchSerializer(obj, context={"request": request}).data)

    # DELETE
    # Best-effort: delete contract file from storage as well.
    try:
        if obj.contract:
            obj.contract.delete(save=False)
    except Exception:
        pass

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def apply_to_research(request, research_id: int):
    """POST /api/v1/research/<id>/apply/ -> authenticated user applies to a research."""
    try:
        research = Research.objects.get(id=research_id)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if research.owner_id == request.user.id:
        return Response({"detail": "You cannot apply to your own research."}, status=status.HTTP_400_BAD_REQUEST)

    # Roles are determined by the existence of related profiles.
    # Allow both students and mentors/researchers (mentor profile) to apply.
    if not (getattr(request.user, "has_student_profile", False) or getattr(request.user, "has_mentor_profile", False)):
        return Response({"detail": "You must create a profile before applying to researches."}, status=status.HTTP_403_FORBIDDEN)

    try:
        obj = ResearchApplication.objects.get(research=research, applicant=request.user)
        if obj.status in {ResearchApplication.Status.PENDING, ResearchApplication.Status.APPROVED}:
            return Response({"detail": "Application already exists."}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = ResearchApplication.Status.PENDING
        obj.save(update_fields=["status", "updated_at"])
    except ResearchApplication.DoesNotExist:
        obj = ResearchApplication.objects.create(research=research, applicant=request.user)

    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_my_application(request, research_id: int):
    """POST /api/v1/research/<id>/cancel/ -> student cancels their own application."""
    try:
        research = Research.objects.get(id=research_id)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        obj = ResearchApplication.objects.get(research=research, applicant=request.user)
    except ResearchApplication.DoesNotExist:
        return Response({"detail": "No application found."}, status=status.HTTP_404_NOT_FOUND)

    obj.status = ResearchApplication.Status.CANCELLED
    obj.save(update_fields=["status", "updated_at"])
    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_research_applications(request, research_id: int):
    """GET /api/v1/research/me/<id>/applications/?status=pending|approved|rejected|cancelled|all"""
    deny = require_mentor(request)
    if deny is not None:
        return deny

    try:
        research = Research.objects.get(id=research_id, owner=request.user)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    status_param = (request.query_params.get("status") or "pending").strip().lower()
    qs = ResearchApplication.objects.filter(research=research).select_related("applicant")

    if status_param and status_param != "all":
        valid = {c for c, _ in ResearchApplication.Status.choices}
        if status_param not in valid:
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        qs = qs.filter(status=status_param)

    return Response(ResearchApplicationSerializer(qs, many=True, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def approve_application(request, research_id: int, application_id: int):
    """POST /api/v1/research/me/<id>/applications/<app_id>/approve/"""
    deny = require_mentor(request)
    if deny is not None:
        return deny

    try:
        research = Research.objects.get(id=research_id, owner=request.user)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        obj = ResearchApplication.objects.select_related("applicant").get(id=application_id, research=research)
    except ResearchApplication.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    obj.status = ResearchApplication.Status.APPROVED
    obj.save(update_fields=["status", "updated_at"])
    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reject_application(request, research_id: int, application_id: int):
    """POST /api/v1/research/me/<id>/applications/<app_id>/reject/"""
    deny = require_mentor(request)
    if deny is not None:
        return deny

    try:
        research = Research.objects.get(id=research_id, owner=request.user)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        obj = ResearchApplication.objects.select_related("applicant").get(id=application_id, research=research)
    except ResearchApplication.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    obj.status = ResearchApplication.Status.REJECTED
    obj.save(update_fields=["status", "updated_at"])
    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_application_status(request, research_id: int):
    """GET /api/v1/research/<id>/my-application/ -> get current user's application for this research (if exists)."""
    try:
        research = Research.objects.get(id=research_id)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        obj = ResearchApplication.objects.get(research=research, applicant=request.user)
    except ResearchApplication.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def research_approved_applicants(request, research_id: int):
    """GET /api/v1/research/<id>/approved-applicants/ -> list approved applicants (authenticated read)."""
    try:
        research = Research.objects.get(id=research_id)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    qs = (
        ResearchApplication.objects.filter(
            research=research,
            status=ResearchApplication.Status.APPROVED,
        )
        .select_related("applicant")
        .order_by("created_at")
    )
    return Response(ResearchApplicationSerializer(qs, many=True, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_joined_researches(request):
    """GET /api/v1/research/joined/ -> list researches current user has joined (approved)."""
    qs = (
        Research.objects.filter(
            applications__applicant=request.user,
            applications__status=ResearchApplication.Status.APPROVED,
        )
        .distinct()
        .order_by("-created_at")
    )
    return Response(ResearchSerializer(qs, many=True, context={"request": request}).data)
