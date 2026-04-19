import re

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from drf_spectacular.utils import OpenApiResponse, extend_schema

from django.contrib.auth import get_user_model
from django.db import transaction
from apps.profiles.models import StudentProfile, MentorProfile
from apps.common.email_service import EmailService
from apps.common.permissions import IsEmailVerified
from apps.common.throttles import ContactRateThrottle, ResearchApplicationRateThrottle, ChatMessageRateThrottle
from apps.common.utils import sanitize_text

User = get_user_model()

from apps.admin_panel.models import SiteSetting


def _approved_non_mentor_count(research):
    """Count approved applicants excluding mentors (they don't count towards teamSize)."""
    return ResearchApplication.objects.filter(
        research=research, status=ResearchApplication.Status.APPROVED
    ).exclude(
        applicant__in=MentorProfile.objects.values_list("user_id", flat=True)
    ).count()
from .models import (
    Research,
    ResearchApplication,
    ContactMessage,
    ResearchChatSettings,
    ResearchChatMessage,
    ResearchTask,
    ResearchTaskAssignee,
    ResearchTaskAttachment,
    ResearchTaskComment,
)
from .serializers import (
    ResearchSerializer,
    ResearchCreateSerializer,
    ResearchApplicationSerializer,
    ContactMessageSerializer,
    ResearchChatSettingsSerializer,
    ResearchChatMessageSerializer,
    ResearchTaskSerializer,
    ResearchTaskCommentSerializer,
    ResearchTaskAttachmentSerializer,
    ResearchTaskAssigneeSerializer,
)
from .permissions import require_mentor, check_research_permission, check_research_any_permission


def _create_notification(*, sender, recipient, research, notification_type, subject, body):
    """Create an in-app notification (ContactMessage)."""
    ContactMessage.objects.create(
        sender=sender,
        recipient=recipient,
        research=research,
        notification_type=notification_type,
        subject=subject,
        body=body,
    )


def _is_truthy(value) -> bool:
    if value is True:
        return True
    if value is False or value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


@extend_schema(
    methods=["GET"],
    summary="List researches (public)",
    description="Public list of all researches.",
    responses={200: ResearchSerializer(many=True)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def researches(request):
    """GET /api/research/ -> list all approved researches (authenticated read)"""
    from django.db.models import Case, When, IntegerField

    status_order = Case(
        When(status="open", then=0),
        When(status="in_progress", then=1),
        When(status="completed", then=2),
        When(status="closed", then=3),
        When(status="draft", then=4),
        default=5,
        output_field=IntegerField(),
    )
    qs = Research.objects.filter(
        moderation_status="approved",
    ).select_related("owner").annotate(status_priority=status_order).order_by("status_priority", "-created_at")
    return Response(ResearchSerializer(qs, many=True, context={"request": request}).data)


@extend_schema(
    methods=["GET"],
    summary="Get research details (public)",
    description="Public details for a single research.",
    responses={
        200: ResearchSerializer,
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def research_detail(request, research_id: int):
    """GET /api/research/<id>/ -> get one research (authenticated read)"""
    try:
        obj = Research.objects.select_related("owner").get(id=research_id)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    is_owner_or_staff = obj.owner_id == request.user.id or request.user.is_staff
    # Hide flagged/rejected content from non-owners
    if obj.moderation_status in ("flagged", "rejected") and not is_owner_or_staff:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    # Hide drafts from non-owners
    if obj.status == "draft" and not is_owner_or_staff:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response(ResearchSerializer(obj, context={"request": request}).data)


@extend_schema(
    methods=["GET"],
    summary="List my researches",
    description="List researches owned by the current user (mentor only).",
    responses={
        200: ResearchSerializer(many=True),
        403: OpenApiResponse(description="Permission denied"),
    },
)
@extend_schema(
    methods=["POST"],
    summary="Create a research",
    description=(
        "Create a research owned by the current user (mentor only). "
        "Supports multipart/form-data for uploading an optional contract file."
    ),
    request=ResearchCreateSerializer,
    responses={
        201: ResearchSerializer,
        400: OpenApiResponse(description="Validation error"),
        403: OpenApiResponse(description="Permission denied"),
    },
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
@parser_classes([MultiPartParser, FormParser])
def my_researches(request):
    """
    GET  /api/research/me/       -> list current user's researches
    POST /api/research/me/       -> create research for current user (supports multipart for contract)
    """
    deny = require_mentor(request)
    if deny is not None:
        return deny

    if request.method == "GET":
        # Owned researches
        owned_qs = Research.objects.filter(owner=request.user).select_related("owner").order_by("-created_at")
        owned_data = ResearchSerializer(owned_qs, many=True, context={"request": request}).data
        for item in owned_data:
            item["is_owner"] = True
            item["my_permissions"] = {
                "can_edit": True,
                "can_approve": True,
                "can_invite": True,
                "can_remove": True,
                "can_manage_chat": True,
            }

        # Researches where this mentor is an approved member
        permitted_apps = ResearchApplication.objects.filter(
            applicant=request.user,
            status=ResearchApplication.Status.APPROVED,
        ).select_related("research")

        owned_ids = set(owned_qs.values_list("id", flat=True))
        permitted_researches = []
        for app in permitted_apps:
            if app.research_id in owned_ids:
                continue
            r_data = ResearchSerializer(app.research, context={"request": request}).data
            r_data["is_owner"] = False
            r_data["my_permissions"] = {
                "can_edit": app.can_edit,
                "can_approve": app.can_approve,
                "can_invite": app.can_invite,
                "can_remove": app.can_remove,
                "can_manage_chat": app.can_manage_chat,
            }
            permitted_researches.append(r_data)

        return Response(owned_data + permitted_researches)

    serializer = ResearchCreateSerializer(data=request.data, context={"request": request})
    if not serializer.is_valid():
        return Response({
            'code': 'VALIDATION_ERROR',
            'message': 'Validation failed.',
            'details': serializer.errors,
        }, status=status.HTTP_400_BAD_REQUEST)

    obj = serializer.save()
    return Response(ResearchSerializer(obj, context={"request": request}).data, status=status.HTTP_201_CREATED)


@extend_schema(
    methods=["GET"],
    summary="Get my research",
    description="Get a single research owned by the current user (mentor only).",
    responses={
        200: ResearchSerializer,
        404: OpenApiResponse(description="Not found"),
        403: OpenApiResponse(description="Permission denied"),
    },
)
@extend_schema(
    methods=["PATCH"],
    summary="Update my research",
    description=(
        "Partially update a research owned by the current user (mentor only). "
        "Supports multipart/form-data for uploading a new contract file. "
        "Send `remove_contract=true` to remove the existing contract."
    ),
    request=ResearchCreateSerializer,
    responses={
        200: ResearchSerializer,
        400: OpenApiResponse(description="Validation error"),
        404: OpenApiResponse(description="Not found"),
        403: OpenApiResponse(description="Permission denied"),
    },
)
@extend_schema(
    methods=["DELETE"],
    summary="Delete my research",
    description=(
        "Permanently delete (hard delete) a research owned by the current user (mentor only). "
        "This also deletes all associated applications and the contract file. "
        "This action is irreversible."
    ),
    responses={
        204: OpenApiResponse(description="Research permanently deleted"),
        404: OpenApiResponse(description="Not found"),
        403: OpenApiResponse(description="Permission denied"),
    },
)
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated, IsEmailVerified])
@parser_classes([MultiPartParser, FormParser])
def my_research_detail(request, research_id: int):
    """GET/PATCH/DELETE /api/research/me/<id>/ -> get/update/delete one research owned by current user"""
    deny = require_mentor(request)
    if deny is not None:
        return deny

    if request.method == "GET":
        obj, err = check_research_permission(request, research_id, "can_edit")
        if err:
            return err
        return Response(ResearchSerializer(obj, context={"request": request}).data)

    if request.method == "PATCH":
        obj, err = check_research_permission(request, research_id, "can_edit")
        if err:
            return err

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
            return Response({
                'code': 'VALIDATION_ERROR',
                'message': 'Validation failed.',
                'details': serializer.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

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

    # DELETE — owner only
    obj, err = check_research_permission(request, research_id, None)
    if err:
        return err

    # Best-effort: delete contract file from storage as well.
    try:
        if obj.contract:
            obj.contract.delete(save=False)
    except Exception:
        pass

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    methods=["POST"],
    summary="Invite a student to a research",
    description="Mentor invites a student to one of their researches.",
    request=None,
    responses={
        201: ResearchApplicationSerializer,
        400: OpenApiResponse(description="Bad request"),
        403: OpenApiResponse(description="Permission denied"),
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def invite_to_research(request, research_id: int):
    """POST /api/research/me/<id>/invite/ — mentor invites a student to their research."""
    deny = require_mentor(request)
    if deny is not None:
        return deny

    research, err = check_research_permission(request, research_id, "can_invite")
    if err:
        return err

    user_id = request.data.get("user_id")
    if not user_id:
        return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Optional role param: "student" or "mentor"
    invited_role = (request.data.get("role") or "").strip().lower()
    if invited_role and invited_role not in ("student", "mentor"):
        return Response({"detail": "role must be 'student' or 'mentor'."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        target_user = User.objects.get(id=user_id)
    except (User.DoesNotExist, ValueError):
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    # Target must have at least a student or mentor profile
    has_student = StudentProfile.objects.filter(user=target_user).exists()
    has_mentor = MentorProfile.objects.filter(user=target_user).exists()
    if not has_student and not has_mentor:
        return Response({"detail": "למשתמש/ת אין פרופיל במערכת."}, status=status.HTTP_400_BAD_REQUEST)

    # Validate role-specific profile existence
    if invited_role == "student" and not has_student:
        return Response({"detail": "למשתמש/ת אין פרופיל מתלמד/ת."}, status=status.HTTP_400_BAD_REQUEST)
    if invited_role == "mentor" and not has_mentor:
        return Response({"detail": "למשתמש/ת אין פרופיל מנחה."}, status=status.HTTP_400_BAD_REQUEST)

    # Availability check: skip for mentors / role=mentor invites
    if invited_role != "mentor" and has_student:
        student_profile = StudentProfile.objects.get(user=target_user)
        if not student_profile.isAvailableForResearch:
            return Response(
                {"detail": "המשתמש/ת לא זמין/ה כרגע להצטרפות למחקרים."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    try:
        obj = ResearchApplication.objects.get(research=research, applicant=target_user)
        if obj.status in {
            ResearchApplication.Status.PENDING,
            ResearchApplication.Status.APPROVED,
            ResearchApplication.Status.INVITED,
        }:
            return Response({"detail": "המתלמד/ת כבר נמצא/ת במחקר או שכבר נשלחה הזמנה."}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = ResearchApplication.Status.INVITED
        obj.invited_role = invited_role
        obj.save(update_fields=["status", "invited_role", "updated_at"])
    except ResearchApplication.DoesNotExist:
        obj = ResearchApplication.objects.create(
            research=research, applicant=target_user,
            status=ResearchApplication.Status.INVITED, invited_role=invited_role,
        )

    _create_notification(
        sender=request.user,
        recipient=target_user,
        research=research,
        notification_type=ContactMessage.NotificationType.APPLICATION_INVITED,
        subject=f"הוזמנת למחקר {research.researchName}",
        body=f"{request.user.get_full_name()} הזמין/ה אותך להצטרף למחקר {research.researchName}.",
    )
    EmailService.send_research_invitation_email(target_user, research)

    return Response(
        ResearchApplicationSerializer(obj, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@extend_schema(
    methods=["POST"],
    summary="Accept a research invitation",
    description="Student accepts a mentor's invitation to join a research.",
    request=None,
    responses={
        200: ResearchApplicationSerializer,
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def accept_invite(request, research_id: int):
    """POST /api/research/<id>/accept-invite/ — student accepts a research invitation."""
    try:
        obj = ResearchApplication.objects.select_related("research", "research__owner").get(
            research_id=research_id, applicant=request.user, status=ResearchApplication.Status.INVITED
        )
    except ResearchApplication.DoesNotExist:
        return Response({"detail": "No pending invitation found."}, status=status.HTTP_404_NOT_FOUND)

    obj.status = ResearchApplication.Status.APPROVED
    obj.save(update_fields=["status", "updated_at"])

    # Auto-close applications when team is full (mentors don't count)
    research = obj.research
    if research.teamSize:
        if _approved_non_mentor_count(research) >= research.teamSize and research.accepting_applications:
            research.accepting_applications = False
            research.save(update_fields=["accepting_applications"])

    _create_notification(
        sender=request.user,
        recipient=research.owner,
        research=research,
        notification_type=ContactMessage.NotificationType.APPLICATION_APPROVED,
        subject=f"ההזמנה למחקר {research.researchName} התקבלה",
        body=f"{request.user.get_full_name()} קיבל/ה את ההזמנה להצטרף למחקר {research.researchName}.",
    )

    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data)


@extend_schema(
    methods=["POST"],
    summary="Decline a research invitation",
    description="Student declines a mentor's invitation to join a research.",
    request=None,
    responses={
        200: ResearchApplicationSerializer,
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def decline_invite(request, research_id: int):
    """POST /api/research/<id>/decline-invite/ — student declines a research invitation."""
    try:
        obj = ResearchApplication.objects.select_related("research", "research__owner").get(
            research_id=research_id, applicant=request.user, status=ResearchApplication.Status.INVITED
        )
    except ResearchApplication.DoesNotExist:
        return Response({"detail": "No pending invitation found."}, status=status.HTTP_404_NOT_FOUND)

    obj.status = ResearchApplication.Status.REJECTED
    obj.save(update_fields=["status", "updated_at"])

    _create_notification(
        sender=request.user,
        recipient=obj.research.owner,
        research=obj.research,
        notification_type=ContactMessage.NotificationType.APPLICATION_REJECTED,
        subject=f"ההזמנה למחקר {obj.research.researchName} נדחתה",
        body=f"{request.user.get_full_name()} דחה/תה את ההזמנה להצטרף למחקר {obj.research.researchName}.",
    )

    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data)


@extend_schema(
    methods=["POST"],
    summary="Apply to a research",
    description="Current authenticated user applies to a research.",
    request=None,
    responses={
        201: ResearchApplicationSerializer,
        400: OpenApiResponse(description="Bad request"),
        403: OpenApiResponse(description="Forbidden"),
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
@throttle_classes([ResearchApplicationRateThrottle])
def apply_to_research(request, research_id: int):
    """POST /api/research/<id>/apply/ -> authenticated user applies to a research."""
    with transaction.atomic():
        try:
            research = Research.objects.select_for_update().get(id=research_id)
        except Research.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if research.owner_id == request.user.id:
            return Response({"detail": "You cannot apply to your own research."}, status=status.HTTP_400_BAD_REQUEST)

        if not research.accepting_applications:
            return Response({"detail": "המחקר אינו מקבל הגשות כרגע."}, status=status.HTTP_400_BAD_REQUEST)

        # Direct capacity check (mentors don't count towards teamSize, but still
        # cannot apply when team is full — they must be invited by the owner).
        is_mentor = getattr(request.user, "has_mentor_profile", False)
        if research.teamSize:
            if _approved_non_mentor_count(research) >= research.teamSize:
                if research.accepting_applications:
                    research.accepting_applications = False
                    research.save(update_fields=["accepting_applications"])
                return Response({"detail": "הצוות מלא, לא ניתן להצטרף."}, status=status.HTTP_400_BAD_REQUEST)

        # Site-wide application settings
        site = SiteSetting.load()

        if not site.applications_globally_enabled:
            return Response({"detail": "הגשת מועמדויות מושבתת כרגע."}, status=status.HTTP_403_FORBIDDEN)

        if site.require_email_verification_to_apply and not getattr(request.user, "email_verified", False):
            return Response({"detail": "יש לאמת את כתובת האימייל לפני הגשת מועמדות."}, status=status.HTTP_403_FORBIDDEN)

        if site.max_applications_per_student > 0:
            active_count = ResearchApplication.objects.filter(
                applicant=request.user,
                status__in=[ResearchApplication.Status.PENDING, ResearchApplication.Status.APPROVED],
            ).count()
            if active_count >= site.max_applications_per_student:
                return Response(
                    {"detail": f"ניתן להגיש מועמדות ל-{site.max_applications_per_student} מחקרים לכל היותר."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if site.max_applications_per_research > 0:
            research_active_count = ResearchApplication.objects.filter(
                research=research,
                status__in=[ResearchApplication.Status.PENDING, ResearchApplication.Status.APPROVED],
            ).count()
            if research_active_count >= site.max_applications_per_research:
                return Response(
                    {"detail": "מספר המועמדויות למחקר זה הגיע למקסימום."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # User must have at least a student or mentor profile to apply
        has_profile = getattr(request.user, "has_student_profile", False) or getattr(request.user, "has_mentor_profile", False)
        if not has_profile:
            return Response({"detail": "יש ליצור פרופיל לפני הגשת מועמדות."}, status=status.HTTP_403_FORBIDDEN)

        try:
            obj = ResearchApplication.objects.get(research=research, applicant=request.user)
            if obj.status in {ResearchApplication.Status.PENDING, ResearchApplication.Status.APPROVED}:
                return Response({"detail": "Application already exists."}, status=status.HTTP_400_BAD_REQUEST)
            obj.status = ResearchApplication.Status.PENDING
            obj.save(update_fields=["status", "updated_at"])
        except ResearchApplication.DoesNotExist:
            obj = ResearchApplication.objects.create(research=research, applicant=request.user)

    _create_notification(
        sender=request.user,
        recipient=research.owner,
        research=research,
        notification_type=ContactMessage.NotificationType.APPLICATION_NEW,
        subject=f"בקשת הצטרפות חדשה למחקר {research.researchName}",
        body=f"{request.user.get_full_name()} הגיש/ה בקשת הצטרפות למחקר שלך.",
    )

    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data, status=status.HTTP_201_CREATED)


@extend_schema(
    methods=["DELETE"],
    summary="Cancel my application",
    description="Cancel the current user's application to the specified research.",
    request=None,
    responses={
        200: ResearchApplicationSerializer,
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def cancel_my_application(request, research_id: int):
    """DELETE /api/research/<id>/cancel/ -> user cancels their own application."""
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


@extend_schema(
    methods=["POST"],
    summary="Leave a research",
    description="An approved member leaves a research they have joined.",
    request=None,
    responses={
        200: ResearchApplicationSerializer,
        400: OpenApiResponse(description="Bad request"),
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def leave_research(request, research_id: int):
    """POST /api/research/<id>/leave/ -> approved member leaves the research."""
    try:
        research = Research.objects.get(id=research_id)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        obj = ResearchApplication.objects.get(research=research, applicant=request.user)
    except ResearchApplication.DoesNotExist:
        return Response({"detail": "לא נמצאה בקשה למחקר זה."}, status=status.HTTP_404_NOT_FOUND)

    if obj.status != ResearchApplication.Status.APPROVED:
        return Response({"detail": "ניתן לעזוב רק מחקר שהתקבלת אליו."}, status=status.HTTP_400_BAD_REQUEST)

    obj.status = ResearchApplication.Status.CANCELLED
    obj.save(update_fields=["status", "updated_at"])

    # Notify the research owner
    _create_notification(
        sender=request.user,
        recipient=research.owner,
        research=research,
        notification_type=ContactMessage.NotificationType.APPLICATION_NEW,
        subject=f"עזיבת מחקר: {research.researchName}",
        body=f"{request.user.get_full_name()} עזב/ה את המחקר {research.researchName}.",
    )

    # Re-open applications if team was full and now has a spot (mentors don't count)
    if research.teamSize and not research.accepting_applications:
        if _approved_non_mentor_count(research) < research.teamSize:
            research.accepting_applications = True
            research.save(update_fields=["accepting_applications"])

    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data)


@extend_schema(
    methods=["GET"],
    summary="List applications to my research",
    description=(
        "List applications for a research owned by the current user (mentor only). "
        "Optional query param: `status=pending|approved|rejected|cancelled|all`."
    ),
    responses={
        200: ResearchApplicationSerializer(many=True),
        400: OpenApiResponse(description="Invalid status"),
        404: OpenApiResponse(description="Not found"),
        403: OpenApiResponse(description="Permission denied"),
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def my_research_applications(request, research_id: int):
    """GET /api/research/me/<id>/applications/?status=pending|approved|rejected|cancelled|all"""
    deny = require_mentor(request)
    if deny is not None:
        return deny

    research, err = check_research_any_permission(request, research_id)
    if err:
        return err

    status_param = (request.query_params.get("status") or "pending").strip().lower()
    qs = ResearchApplication.objects.filter(research=research).select_related("applicant")

    if status_param and status_param != "all":
        valid = {c for c, _ in ResearchApplication.Status.choices}
        if status_param not in valid:
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        qs = qs.filter(status=status_param)

    return Response(ResearchApplicationSerializer(qs, many=True, context={"request": request}).data)


@extend_schema(
    methods=["POST"],
    summary="Approve an application",
    description="Approve an application for a research owned by the current user (mentor only).",
    request=None,
    responses={
        200: ResearchApplicationSerializer,
        404: OpenApiResponse(description="Not found"),
        403: OpenApiResponse(description="Permission denied"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def approve_application(request, research_id: int, application_id: int):
    """POST /api/research/me/<id>/applications/<app_id>/approve/"""
    deny = require_mentor(request)
    if deny is not None:
        return deny

    research, err = check_research_permission(request, research_id, "can_approve")
    if err:
        return err

    try:
        obj = ResearchApplication.objects.select_related("applicant").get(id=application_id, research=research)
    except ResearchApplication.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    # Block approval if team is already full (mentors don't count towards teamSize)
    if research.teamSize and _approved_non_mentor_count(research) >= research.teamSize:
        # Check if applicant is a mentor (mentors don't count towards limit)
        is_applicant_mentor = MentorProfile.objects.filter(user=obj.applicant).exists()
        if not is_applicant_mentor:
            return Response(
                {"detail": "לא ניתן לאשר — הצוות מלא."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    note = request.data.get("note", "").strip() if request.data else ""
    if note:
        site = SiteSetting.load()
        obj.mentor_note = note[:site.mentor_note_max_length]

    obj.status = ResearchApplication.Status.APPROVED
    obj.save(update_fields=["status", "updated_at", "mentor_note"])

    # Auto-close applications when team is full (mentors don't count)
    if research.teamSize:
        if _approved_non_mentor_count(research) >= research.teamSize and research.accepting_applications:
            research.accepting_applications = False
            research.save(update_fields=["accepting_applications"])

    _create_notification(
        sender=request.user,
        recipient=obj.applicant,
        research=research,
        notification_type=ContactMessage.NotificationType.APPLICATION_APPROVED,
        subject=f"בקשתך למחקר {research.researchName} אושרה",
        body=f"הבקשה שלך למחקר {research.researchName} אושרה." + (f"\nהערת המנחה: {note}" if note else ""),
    )

    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data)


@extend_schema(
    methods=["POST"],
    summary="Reject an application",
    description="Reject an application for a research owned by the current user (mentor only).",
    request=None,
    responses={
        200: ResearchApplicationSerializer,
        404: OpenApiResponse(description="Not found"),
        403: OpenApiResponse(description="Permission denied"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def reject_application(request, research_id: int, application_id: int):
    """POST /api/research/me/<id>/applications/<app_id>/reject/"""
    deny = require_mentor(request)
    if deny is not None:
        return deny

    research, err = check_research_permission(request, research_id, "can_approve")
    if err:
        return err

    try:
        obj = ResearchApplication.objects.select_related("applicant").get(id=application_id, research=research)
    except ResearchApplication.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    note = request.data.get("note", "").strip() if request.data else ""
    if note:
        site = SiteSetting.load()
        obj.mentor_note = note[:site.mentor_note_max_length]

    obj.status = ResearchApplication.Status.REJECTED
    obj.save(update_fields=["status", "updated_at", "mentor_note"])

    _create_notification(
        sender=request.user,
        recipient=obj.applicant,
        research=research,
        notification_type=ContactMessage.NotificationType.APPLICATION_REJECTED,
        subject=f"בקשתך למחקר {research.researchName} נדחתה",
        body=f"הבקשה שלך למחקר {research.researchName} נדחתה." + (f"\nהערת המנחה: {note}" if note else ""),
    )

    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data)


@extend_schema(
    methods=["POST"],
    summary="Remove an approved student from a research",
    description="Remove (kick) an approved student from a research owned by the current user (mentor only). Sends a notification to the student.",
    request=None,
    responses={
        200: ResearchApplicationSerializer,
        404: OpenApiResponse(description="Not found"),
        400: OpenApiResponse(description="Student is not currently approved"),
        403: OpenApiResponse(description="Permission denied"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def remove_application(request, research_id: int, application_id: int):
    """POST /api/research/me/<id>/applications/<app_id>/remove/"""
    deny = require_mentor(request)
    if deny is not None:
        return deny

    research, err = check_research_permission(request, research_id, "can_remove")
    if err:
        return err

    try:
        obj = ResearchApplication.objects.select_related("applicant").get(id=application_id, research=research)
    except ResearchApplication.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if obj.status != ResearchApplication.Status.APPROVED:
        return Response({"detail": "Only approved members can be removed."}, status=status.HTTP_400_BAD_REQUEST)

    # Only the owner can remove mentors
    target_is_mentor = MentorProfile.objects.filter(user=obj.applicant).exists()
    if target_is_mentor and research.owner_id != request.user.id:
        return Response(
            {"detail": "רק בעל המחקר יכול להסיר מנחים."},
            status=status.HTTP_403_FORBIDDEN,
        )

    note = request.data.get("note", "").strip() if request.data else ""
    if note:
        site = SiteSetting.load()
        obj.mentor_note = note[:site.mentor_note_max_length]

    obj.status = ResearchApplication.Status.REMOVED
    obj.save(update_fields=["status", "updated_at", "mentor_note"])

    # Re-open applications if team was full and now has a spot (mentors don't count)
    if research.teamSize and not research.accepting_applications:
        if _approved_non_mentor_count(research) < research.teamSize:
            research.accepting_applications = True
            research.save(update_fields=["accepting_applications"])

    _create_notification(
        sender=request.user,
        recipient=obj.applicant,
        research=research,
        notification_type=ContactMessage.NotificationType.APPLICATION_REMOVED,
        subject=f"הוסרת מהמחקר {research.researchName}",
        body=f"הוסרת מהמחקר {research.researchName} על ידי {request.user.get_full_name()}." + (f"\nהערת המנחה: {note}" if note else ""),
    )

    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data)


@extend_schema(
    methods=["PATCH"],
    summary="Update mentor permissions",
    description="Owner-only: update granular permissions on a mentor's application.",
    request=None,
    responses={
        200: ResearchApplicationSerializer,
        400: OpenApiResponse(description="Bad request"),
        403: OpenApiResponse(description="Permission denied"),
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def update_mentor_permissions(request, research_id: int, application_id: int):
    """PATCH /api/research/me/<id>/applications/<app_id>/permissions/ — owner-only."""
    deny = require_mentor(request)
    if deny is not None:
        return deny

    # Owner-only: permission_name=None
    research, err = check_research_permission(request, research_id, None)
    if err:
        return err

    try:
        obj = ResearchApplication.objects.select_related("applicant").get(
            id=application_id, research=research
        )
    except ResearchApplication.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if obj.status != ResearchApplication.Status.APPROVED:
        return Response(
            {"detail": "ניתן לעדכן הרשאות רק למנחים שאושרו."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Verify the applicant is a mentor
    if not MentorProfile.objects.filter(user=obj.applicant).exists():
        return Response(
            {"detail": "ניתן לעדכן הרשאות רק למנחים."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    PERMISSION_FIELDS = ("can_edit", "can_approve", "can_invite", "can_remove", "can_manage_chat")
    updated_fields = []
    for field in PERMISSION_FIELDS:
        if field in request.data:
            setattr(obj, field, _is_truthy(request.data[field]))
            updated_fields.append(field)

    if updated_fields:
        obj.save(update_fields=updated_fields + ["updated_at"])

    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data)


@extend_schema(
    methods=["GET"],
    summary="Get my application",
    description="Get the current user's application for the specified research (if exists).",
    responses={
        200: ResearchApplicationSerializer,
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_application_status(request, research_id: int):
    """GET /api/research/<id>/my-application/ -> get current user's application for this research (if exists)."""
    try:
        research = Research.objects.get(id=research_id)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        obj = ResearchApplication.objects.get(research=research, applicant=request.user)
    except ResearchApplication.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response(ResearchApplicationSerializer(obj, context={"request": request}).data)


@extend_schema(
    methods=["GET"],
    summary="List approved applicants",
    description="List approved applicants for a research. Only the research owner can access this.",
    responses={
        200: ResearchApplicationSerializer(many=True),
        403: OpenApiResponse(description="Permission denied – only the research owner can view applicants"),
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def research_approved_applicants(request, research_id: int):
    """GET /api/research/<id>/approved-applicants/ -> list approved applicants (research owner only)."""
    try:
        research = Research.objects.get(id=research_id)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    # Authorization: only the research owner or staff can view approved applicants
    if research.owner != request.user and not request.user.is_staff:
        return Response(
            {"detail": "Permission denied – only the research owner can view applicants."},
            status=status.HTTP_403_FORBIDDEN,
        )

    qs = (
        ResearchApplication.objects.filter(
            research=research,
            status=ResearchApplication.Status.APPROVED,
        )
        .select_related("applicant")
        .order_by("created_at")
    )
    return Response(ResearchApplicationSerializer(qs, many=True, context={"request": request}).data)


@extend_schema(
    methods=["GET"],
    summary="List joined researches",
    description="List researches the current user has joined (approved applications).",
    responses={200: ResearchSerializer(many=True)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_joined_researches(request):
    """GET /api/research/joined/ -> list researches current user has joined (approved)."""
    qs = (
        Research.objects.filter(
            applications__applicant=request.user,
            applications__status=ResearchApplication.Status.APPROVED,
        )
        .distinct()
        .order_by("-created_at")
    )
    return Response(ResearchSerializer(qs, many=True, context={"request": request}).data)


# =============================================================================
# APPLICANT DASHBOARD — all my applications across all researches
# =============================================================================

@extend_schema(
    methods=["GET"],
    summary="List my applications (applicant dashboard)",
    description=(
        "List all research applications for the current user across all researches. "
        "Returns application status, research name, and dates. "
        "Optional query param: `status=pending|approved|rejected|cancelled|all` (default: all)."
    ),
    responses={200: OpenApiResponse(description="List of applications with research info")},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_applications_dashboard(request):
    """
    GET /api/research/my-applications/
    Applicant dashboard: list all applications for the current user.
    """
    status_param = (request.query_params.get("status") or "all").strip().lower()
    qs = (
        ResearchApplication.objects
        .filter(applicant=request.user)
        .select_related("research")
        .order_by("-created_at")
    )

    if status_param and status_param != "all":
        valid = {c for c, _ in ResearchApplication.Status.choices}
        if status_param not in valid:
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        qs = qs.filter(status=status_param)

    results = []
    for app in qs:
        results.append({
            "id": app.id,
            "status": app.status,
            "created_at": app.created_at,
            "updated_at": app.updated_at,
            "mentor_note": app.mentor_note,
            "research": {
                "id": app.research.id,
                "researchName": app.research.researchName,
                "researchArea": app.research.researchArea,
                "status": app.research.status,
            },
        })

    return Response(results)


# =============================================================================
# CONTACT MESSAGE — secure contact from profile (no public email)
# =============================================================================

@extend_schema(
    methods=["POST"],
    summary="Send contact message to a research owner",
    description=(
        "Send a contact message to the owner of a research project. "
        "The sender's email is not exposed; the system forwards the message."
    ),
    request=None,
    responses={
        200: OpenApiResponse(description="Message sent"),
        400: OpenApiResponse(description="Bad request"),
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
@throttle_classes([ContactRateThrottle])
def contact_research_owner(request, research_id: int):
    """
    POST /api/research/<id>/contact/
    Send a contact message to the research owner.
    Body: { "message": "..." }
    """
    import logging
    audit_logger = logging.getLogger('audit')

    try:
        research = Research.objects.select_related("owner").get(id=research_id)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    message_text = sanitize_text(request.data.get("message", ""))
    if not message_text:
        return Response({"detail": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

    site = SiteSetting.load()
    max_len = site.contact_message_max_length
    if len(message_text) > max_len:
        return Response({"detail": f"Message too long (max {max_len} characters)."}, status=status.HTTP_400_BAD_REQUEST)

    # Log the contact attempt (in production, integrate with email service)
    audit_logger.info(
        f"Contact message sent: from={request.user.email} to research #{research.id} ({research.researchName})",
        extra={
            "sender_id": str(request.user.id),
            "sender_email": request.user.email,
            "research_id": research.id,
            "research_owner_id": str(research.owner_id),
            "message_preview": message_text[:100],
        },
    )

    # Save contact message
    ContactMessage.objects.create(
        sender=request.user,
        recipient=research.owner,
        research=research,
        subject=f"הודעה חדשה על {research.researchName}",
        body=message_text,
    )
    EmailService.send_private_message_notification(research.owner, request.user, message_text)

    return Response({
        "message": "ההודעה נרשמה בהצלחה.",
        "research_id": research.id,
    })


# =============================================================================
# CONTACT USER (user-to-user messaging)
# =============================================================================

@extend_schema(
    methods=["POST"],
    summary="Send a direct message to another user",
    description=(
        "Send a contact message to any user. "
        "The message appears in the recipient's notification inbox."
    ),
    request=None,
    responses={
        200: OpenApiResponse(description="Message sent"),
        400: OpenApiResponse(description="Bad request"),
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
@throttle_classes([ContactRateThrottle])
def contact_user(request):
    """
    POST /api/research/messages/contact-user/
    Send a direct contact message to another user.
    Body: { "recipient_id": "...", "subject": "...", "message": "..." }
    """
    import logging
    audit_logger = logging.getLogger('audit')

    recipient_id = request.data.get("recipient_id")
    if not recipient_id:
        return Response({"detail": "recipient_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        recipient = User.objects.get(id=recipient_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if recipient == request.user:
        return Response({"detail": "You cannot message yourself."}, status=status.HTTP_400_BAD_REQUEST)

    subject = sanitize_text(request.data.get("subject", ""))
    if not subject:
        return Response({"detail": "Subject is required."}, status=status.HTTP_400_BAD_REQUEST)

    message_text = sanitize_text(request.data.get("message", ""))
    if not message_text:
        return Response({"detail": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

    site = SiteSetting.load()
    max_len = site.contact_message_max_length
    if len(message_text) > max_len:
        return Response({"detail": f"Message too long (max {max_len} characters)."}, status=status.HTTP_400_BAD_REQUEST)

    audit_logger.info(
        f"Contact message sent: from={request.user.email} to user #{recipient.id}",
        extra={
            "sender_id": str(request.user.id),
            "sender_email": request.user.email,
            "recipient_id": str(recipient.id),
            "message_preview": message_text[:100],
        },
    )

    ContactMessage.objects.create(
        sender=request.user,
        recipient=recipient,
        research=None,
        notification_type=ContactMessage.NotificationType.CONTACT,
        subject=subject,
        body=message_text,
    )
    EmailService.send_private_message_notification(recipient, request.user, message_text)

    return Response({"message": "ההודעה נשלחה בהצלחה."})


# =============================================================================
# SECURE CONTRACT FILE DOWNLOAD
# =============================================================================

@extend_schema(
    methods=["GET"],
    summary="Download research contract file",
    description=(
        "Securely download the contract file for a research project. "
        "Only the research owner, approved applicants, or staff can download."
    ),
    responses={
        200: OpenApiResponse(description="File content"),
        403: OpenApiResponse(description="Permission denied"),
        404: OpenApiResponse(description="Not found or no contract file"),
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def secure_contract_download(request, research_id: int):
    """
    GET /api/research/<id>/contract/
    Secure download endpoint that verifies authorization before serving the contract file.
    """
    import logging
    from django.http import FileResponse
    from urllib.parse import quote

    audit_logger = logging.getLogger('audit')

    try:
        research = Research.objects.get(id=research_id)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if not research.contract:
        return Response(
            {"detail": "No contract file attached to this research."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Authorization: match research_detail visibility logic
    is_owner_or_staff = research.owner_id == request.user.id or request.user.is_staff
    if research.moderation_status in ("flagged", "rejected") and not is_owner_or_staff:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    if research.status == "draft" and not is_owner_or_staff:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    audit_logger.info(
        f"Contract downloaded: research #{research.id} ({research.researchName})",
        extra={
            "user_id": str(request.user.id),
            "research_id": research.id,
            "is_owner": research.owner_id == request.user.id,
        },
    )

    response = FileResponse(
        research.contract.open("rb"),
        content_type="application/octet-stream",
    )
    filename = research.contract.name.split("/")[-1]
    encoded_filename = quote(filename)
    response["Content-Disposition"] = (
        f'attachment; filename="{encoded_filename}"; '
        f"filename*=UTF-8''{encoded_filename}"
    )
    return response


# =============================================================================
# NOTIFICATIONS INBOX
# =============================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inbox(request):
    """GET /api/research/messages/inbox/ — list contact messages for current user."""
    qs = (
        ContactMessage.objects
        .filter(recipient=request.user)
        .select_related("sender", "research")
        .order_by("-created_at")
    )
    return Response(ContactMessageSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """GET /api/research/messages/unread-count/ — count unread messages."""
    count = ContactMessage.objects.filter(recipient=request.user, is_read=False).count()
    return Response({"count": count})


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_read(request, message_id: int):
    """PATCH /api/research/messages/<id>/read/ — mark message as read."""
    try:
        msg = ContactMessage.objects.get(id=message_id, recipient=request.user)
    except ContactMessage.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    msg.is_read = True
    msg.save(update_fields=["is_read"])
    return Response({"detail": "Marked as read."})


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """PATCH /api/research/messages/mark-all-read/ — mark all messages as read."""
    updated = ContactMessage.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({"detail": "All marked as read.", "count": updated})


# =============================================================================
# RESEARCH CHAT
# =============================================================================

def _check_chat_access(request, research_id):
    """
    Check if the user has access to the research chat.
    Returns (research, None) if user is owner or has an approved application.
    Otherwise returns (None, Response 403).
    """
    try:
        research = Research.objects.select_related("owner").get(id=research_id)
    except Research.DoesNotExist:
        return None, Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if research.owner_id == request.user.id:
        return research, None

    is_member = ResearchApplication.objects.filter(
        research=research,
        applicant=request.user,
        status=ResearchApplication.Status.APPROVED,
    ).exists()

    if not is_member:
        return None, Response(
            {"detail": "אין לך גישה לצ'אט המחקר."},
            status=status.HTTP_403_FORBIDDEN,
        )

    return research, None


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def research_chat_settings(request, research_id: int):
    """
    GET  /api/research/me/<id>/chat/settings/ — get chat settings
    PATCH /api/research/me/<id>/chat/settings/ — update (owner or can_manage_chat)
    """
    research, err = _check_chat_access(request, research_id)
    if err:
        return err

    settings_obj, _ = ResearchChatSettings.objects.get_or_create(research=research)

    if request.method == "GET":
        return Response(ResearchChatSettingsSerializer(settings_obj).data)

    # PATCH — owner or mentor with can_manage_chat
    is_owner = research.owner_id == request.user.id
    if not is_owner:
        has_perm = ResearchApplication.objects.filter(
            research=research,
            applicant=request.user,
            status=ResearchApplication.Status.APPROVED,
            can_manage_chat=True,
        ).exists()
        if not has_perm:
            return Response(
                {"detail": "אין לך הרשאה לנהל הגדרות צ'אט."},
                status=status.HTTP_403_FORBIDDEN,
            )

    serializer = ResearchChatSettingsSerializer(settings_obj, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
@throttle_classes([ChatMessageRateThrottle])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def research_chat(request, research_id: int):
    """
    GET  /api/research/me/<id>/chat/?before=<msg_id>&limit=50 — list messages
    POST /api/research/me/<id>/chat/ — send message
    """
    from apps.profiles.file_security import validate_upload, generate_secure_filename

    research, err = _check_chat_access(request, research_id)
    if err:
        return err

    if request.method == "GET":
        limit = min(int(request.query_params.get("limit", 50)), 100)
        qs = ResearchChatMessage.objects.filter(research=research).select_related("sender", "pinned_by")

        before_id = request.query_params.get("before")
        after_id = request.query_params.get("after")

        if before_id:
            qs = qs.filter(id__lt=int(before_id))
        if after_id:
            qs = qs.filter(id__gt=int(after_id))
            # For polling: return newest messages after a given id, chronological order
            messages = list(qs.order_by("created_at")[:limit])
        else:
            # Default or "before" pagination: return newest N, reversed for display
            messages = list(qs.order_by("-created_at")[:limit])
            messages.reverse()

        return Response(ResearchChatMessageSerializer(messages, many=True, context={"request": request}).data)

    # POST — send message
    settings_obj, _ = ResearchChatSettings.objects.get_or_create(research=research)

    # Check send permission
    if settings_obj.send_permission == ResearchChatSettings.SendPermission.MENTORS_ONLY:
        is_owner = research.owner_id == request.user.id
        is_mentor = MentorProfile.objects.filter(user=request.user).exists()
        if not is_owner and not is_mentor:
            return Response(
                {"detail": "ההודעות מוגבלות למנחים בלבד."},
                status=status.HTTP_403_FORBIDDEN,
            )

    body = (request.data.get("body") or "").strip()
    file_obj = request.FILES.get("file")

    if not body and not file_obj:
        return Response(
            {"detail": "יש לשלוח הודעה או קובץ."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(body) > 2000:
        return Response(
            {"detail": "ההודעה ארוכה מדי (מקסימום 2000 תווים)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    file_name = ""
    if file_obj:
        if not settings_obj.files_enabled:
            return Response(
                {"detail": "שיתוף קבצים מושבת בצ'אט זה."},
                status=status.HTTP_403_FORBIDDEN,
            )
        is_valid, error_message = validate_upload(file_obj)
        if not is_valid:
            return Response({"detail": error_message}, status=status.HTTP_400_BAD_REQUEST)
        file_name = generate_secure_filename(file_obj.name)

    msg = ResearchChatMessage.objects.create(
        research=research,
        sender=request.user,
        body=sanitize_text(body) if body else "",
        file=file_obj,
        file_name=file_name,
    )

    # Parse @mentions and create notifications
    if body:
        mentioned_ids, is_all = _parse_mentions(body, research)
        mentioned_ids.discard(request.user.id)
        if mentioned_ids:
            preview = body[:100] + ("..." if len(body) > 100 else "")
            sender_name = request.user.get_full_name()
            mentioned_users = User.objects.filter(id__in=mentioned_ids)
            for u in mentioned_users:
                _create_notification(
                    sender=request.user,
                    recipient=u,
                    research=research,
                    notification_type=ContactMessage.NotificationType.CHAT_MENTION,
                    subject=f"הוזכרת בצ'אט מחקר {research.researchName}",
                    body=f"{sender_name}: {preview}",
                )

    return Response(
        ResearchChatMessageSerializer(msg, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def research_chat_pin(request, research_id: int, message_id: int):
    """POST /api/research/me/<id>/chat/<msg_id>/pin/ — toggle pin (owner or can_manage_chat)."""
    research, err = _check_chat_access(request, research_id)
    if err:
        return err

    is_owner = research.owner_id == request.user.id
    if not is_owner:
        has_perm = ResearchApplication.objects.filter(
            research=research,
            applicant=request.user,
            status=ResearchApplication.Status.APPROVED,
            can_manage_chat=True,
        ).exists()
        if not has_perm:
            return Response(
                {"detail": "אין לך הרשאה להצמיד הודעות."},
                status=status.HTTP_403_FORBIDDEN,
            )

    try:
        msg = ResearchChatMessage.objects.select_related("sender", "pinned_by").get(
            id=message_id, research=research
        )
    except ResearchChatMessage.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    msg.is_pinned = not msg.is_pinned
    msg.pinned_by = request.user if msg.is_pinned else None
    msg.save(update_fields=["is_pinned", "pinned_by"])

    return Response(ResearchChatMessageSerializer(msg, context={"request": request}).data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def research_chat_delete(request, research_id: int, message_id: int):
    """DELETE /api/research/me/<id>/chat/<msg_id>/ — delete own message (or owner can delete any)."""
    research, err = _check_chat_access(request, research_id)
    if err:
        return err

    try:
        msg = ResearchChatMessage.objects.get(id=message_id, research=research)
    except ResearchChatMessage.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    is_owner = research.owner_id == request.user.id
    is_sender = msg.sender_id == request.user.id
    has_manage = (
        not is_owner
        and not is_sender
        and ResearchApplication.objects.filter(
            research=research,
            applicant=request.user,
            status=ResearchApplication.Status.APPROVED,
            can_manage_chat=True,
        ).exists()
    )

    if not is_sender and not is_owner and not has_manage:
        return Response(
            {"detail": "ניתן למחוק רק הודעות שלך."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Delete file from storage if present
    if msg.file:
        try:
            msg.file.delete(save=False)
        except Exception:
            pass

    msg.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# CHAT MENTIONS — helper
# =============================================================================

def _parse_mentions(body, research):
    """
    Parse @mentions from a chat message body.
    Matches @all and @<FullName> against actual research members.
    Returns (mentioned_user_ids: set, is_all: bool).
    """
    if "@" not in body:
        return set(), False

    # Build name→user_id map from research members
    members = {}  # full_name -> user_id
    members[research.owner.get_full_name()] = research.owner_id

    approved_apps = ResearchApplication.objects.filter(
        research=research,
        status=ResearchApplication.Status.APPROVED,
    ).select_related("applicant")
    for app in approved_apps:
        members[app.applicant.get_full_name()] = app.applicant_id

    is_all = False
    mentioned_ids = set()

    # Check for @all
    if re.search(r"@all\b", body):
        is_all = True
        return set(members.values()), True

    # Check for @<member name> by trying to match each member name after @ signs
    for name, user_id in members.items():
        # Escape the name for regex, look for @name followed by word boundary
        pattern = r"@" + re.escape(name) + r"(?=\s|$|[^\w\u0590-\u05FF])"
        if re.search(pattern, body):
            mentioned_ids.add(user_id)

    return mentioned_ids, False


# =============================================================================
# CHAT MARK SEEN
# =============================================================================

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def research_chat_mark_seen(request, research_id: int):
    """
    GET  /api/research/me/<id>/chat/seen/ — get last seen message ID
    POST /api/research/me/<id>/chat/seen/ — mark latest seen message ID
    """
    research, err = _check_chat_access(request, research_id)
    if err:
        return err

    if request.method == "GET":
        if research.owner_id == request.user.id:
            return Response({"message_id": research.owner_last_seen_chat_message_id})
        app = ResearchApplication.objects.filter(
            research=research,
            applicant=request.user,
            status=ResearchApplication.Status.APPROVED,
        ).first()
        return Response({"message_id": app.last_seen_chat_message_id if app else None})

    message_id = request.data.get("message_id")
    if not message_id:
        return Response({"detail": "message_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        message_id = int(message_id)
    except (TypeError, ValueError):
        return Response({"detail": "Invalid message_id."}, status=status.HTTP_400_BAD_REQUEST)

    if research.owner_id == request.user.id:
        current = research.owner_last_seen_chat_message_id or 0
        if message_id > current:
            research.owner_last_seen_chat_message_id = message_id
            research.save(update_fields=["owner_last_seen_chat_message_id"])
    else:
        app = ResearchApplication.objects.filter(
            research=research,
            applicant=request.user,
            status=ResearchApplication.Status.APPROVED,
        ).first()
        if app:
            current = app.last_seen_chat_message_id or 0
            if message_id > current:
                app.last_seen_chat_message_id = message_id
                app.save(update_fields=["last_seen_chat_message_id"])

    return Response({"detail": "ok"})


# =============================================================================
# CHAT MEMBERS (for @mention autocomplete)
# =============================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def research_chat_members(request, research_id: int):
    """GET /api/research/me/<id>/chat/members/ — list chat members for @mention."""
    research, err = _check_chat_access(request, research_id)
    if err:
        return err

    members = []

    # Owner
    owner = research.owner
    is_owner_mentor = MentorProfile.objects.filter(user=owner).exists()
    members.append({
        "user_id": str(owner.id),
        "name": owner.get_full_name(),
        "is_mentor": is_owner_mentor,
    })

    # Approved applicants
    approved_apps = ResearchApplication.objects.filter(
        research=research,
        status=ResearchApplication.Status.APPROVED,
    ).select_related("applicant")

    mentor_ids = set(
        MentorProfile.objects.filter(
            user_id__in=[a.applicant_id for a in approved_apps]
        ).values_list("user_id", flat=True)
    )

    for app in approved_apps:
        members.append({
            "user_id": str(app.applicant_id),
            "name": app.applicant.get_full_name(),
            "is_mentor": app.applicant_id in mentor_ids,
        })

    return Response(members)


# =============================================================================
# RESEARCH TASK MANAGER
# =============================================================================

def _user_research_ids(user):
    """IDs of researches the user has access to (owner OR approved applicant)."""
    owned = set(
        Research.objects.filter(owner=user).values_list("id", flat=True)
    )
    member = set(
        ResearchApplication.objects.filter(
            applicant=user,
            status=ResearchApplication.Status.APPROVED,
        ).values_list("research_id", flat=True)
    )
    return owned | member


def _research_member_user_ids(research):
    """IDs of all users with access to the research (owner + approved members)."""
    ids = {research.owner_id}
    ids.update(
        ResearchApplication.objects.filter(
            research=research,
            status=ResearchApplication.Status.APPROVED,
        ).values_list("applicant_id", flat=True)
    )
    return ids


def _check_task_access(request, task_id, *, for_write=False):
    """
    Return (task, None) on success, or (None, Response) on failure.

    Read: research owner, approved member, or the task creator.
    Write (edit/delete task): task creator, research owner, or approved
    mentor with can_edit permission on the research.
    """
    try:
        task = (
            ResearchTask.objects
            .select_related("research", "research__owner", "created_by")
            .get(id=task_id)
        )
    except ResearchTask.DoesNotExist:
        return None, Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    research = task.research
    user = request.user
    is_owner = research.owner_id == user.id
    is_member = ResearchApplication.objects.filter(
        research=research,
        applicant=user,
        status=ResearchApplication.Status.APPROVED,
    ).exists()
    is_creator = task.created_by_id == user.id

    if not (is_owner or is_member or is_creator):
        return None, Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if for_write and not (is_owner or is_creator):
        has_edit_perm = ResearchApplication.objects.filter(
            research=research,
            applicant=user,
            status=ResearchApplication.Status.APPROVED,
            can_edit=True,
        ).exists()
        if not has_edit_perm:
            return None, Response(
                {"detail": "אין לך הרשאה לפעולה זו."},
                status=status.HTTP_403_FORBIDDEN,
            )

    return task, None


def _tasks_base_queryset(user):
    """Visible tasks for a user with comment count annotation and prefetches."""
    from django.db.models import Count

    research_ids = _user_research_ids(user)
    return (
        ResearchTask.objects.filter(research_id__in=research_ids)
        .select_related("research", "created_by")
        .prefetch_related("task_assignees__user", "attachments")
        .annotate(_comments_count=Count("comments", distinct=True))
    )


@extend_schema(
    methods=["GET"],
    summary="List research tasks",
    description=(
        "List all tasks across researches the current user has access to "
        "(as owner or approved member). "
        "Supports query params: research_id, status, urgency, q."
    ),
    responses={200: ResearchTaskSerializer(many=True)},
)
@extend_schema(
    methods=["POST"],
    summary="Create a research task",
    description=(
        "Create a task inside a research. The user must be a research owner "
        "or an approved member. Supports multipart/form-data with a `files` "
        "multi-value field for attachments. Optional `assignees` field (JSON "
        "array of user ids) — if omitted, the current user is the sole assignee."
    ),
    request=ResearchTaskSerializer,
    responses={
        201: ResearchTaskSerializer,
        400: OpenApiResponse(description="Validation error"),
        403: OpenApiResponse(description="Permission denied"),
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def research_tasks(request):
    """
    GET  /api/research/tasks/ — list current user's visible tasks
    POST /api/research/tasks/ — create task (multipart for attachments)
    """
    if request.method == "GET":
        qs = _tasks_base_queryset(request.user)

        research_id = request.query_params.get("research_id")
        if research_id:
            try:
                qs = qs.filter(research_id=int(research_id))
            except (TypeError, ValueError):
                return Response({"detail": "Invalid research_id."}, status=status.HTTP_400_BAD_REQUEST)

        task_status = request.query_params.get("status")
        if task_status:
            if task_status not in ResearchTask.Status.values:
                return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(status=task_status)

        urgency = request.query_params.get("urgency")
        if urgency:
            if urgency not in ResearchTask.Urgency.values:
                return Response({"detail": "Invalid urgency."}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(urgency=urgency)

        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(title__icontains=q)

        qs = qs.order_by("-created_at")
        return Response(ResearchTaskSerializer(qs, many=True, context={"request": request}).data)

    # POST — create
    research_id = request.data.get("research_id") or request.data.get("researchId")
    if not research_id:
        return Response({"detail": "research_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        research = Research.objects.get(id=int(research_id))
    except (Research.DoesNotExist, TypeError, ValueError):
        return Response({"detail": "Research not found."}, status=status.HTTP_404_NOT_FOUND)

    if research.id not in _user_research_ids(request.user):
        return Response(
            {"detail": "אין לך הרשאה ליצור משימה במחקר זה."},
            status=status.HTTP_403_FORBIDDEN,
        )

    data = {}
    for key in ("title", "description", "urgency", "status", "due_date", "dueDate"):
        if key in request.data:
            data[key] = request.data.get(key)
    if "dueDate" in data and "due_date" not in data:
        data["due_date"] = data.pop("dueDate")

    serializer = ResearchTaskSerializer(data=data, context={"request": request})
    if not serializer.is_valid():
        return Response(
            {"code": "VALIDATION_ERROR", "message": "Validation failed.", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from apps.profiles.file_security import validate_upload, generate_secure_filename
    import json as _json

    with transaction.atomic():
        task = ResearchTask.objects.create(
            research=research,
            created_by=request.user,
            **serializer.validated_data,
        )

        # Explicit assignees list, or fallback to current user as owner.
        raw_assignees = request.data.get("assignees")
        parsed_assignees = []
        if raw_assignees:
            parsed = raw_assignees
            if isinstance(parsed, str):
                try:
                    parsed = _json.loads(parsed)
                except (ValueError, TypeError):
                    parsed = None
            if isinstance(parsed, list):
                for item in parsed:
                    try:
                        if isinstance(item, dict):
                            uid = int(item.get("id") or item.get("user_id"))
                            role = str(item.get("role") or "")[:100]
                        else:
                            uid = int(item)
                            role = ""
                        parsed_assignees.append((uid, role))
                    except (TypeError, ValueError):
                        continue

        if not parsed_assignees:
            ResearchTaskAssignee.objects.create(task=task, user=request.user, role="owner")
        else:
            valid_user_ids = _research_member_user_ids(research)
            for uid, role in parsed_assignees:
                if uid in valid_user_ids:
                    ResearchTaskAssignee.objects.get_or_create(
                        task=task, user_id=uid, defaults={"role": role},
                    )

        files = []
        if hasattr(request, "FILES"):
            files = request.FILES.getlist("files") or request.FILES.getlist("file")
        for f in files:
            ok, err = validate_upload(f)
            if not ok:
                return Response({"detail": err}, status=status.HTTP_400_BAD_REQUEST)
            ResearchTaskAttachment.objects.create(
                task=task,
                file=f,
                file_name=generate_secure_filename(f.name),
                size=getattr(f, "size", 0) or 0,
                uploaded_by=request.user,
            )

    task = _tasks_base_queryset(request.user).get(id=task.id)
    return Response(
        ResearchTaskSerializer(task, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@extend_schema(
    methods=["GET"],
    summary="Get a research task",
    responses={200: ResearchTaskSerializer, 404: OpenApiResponse(description="Not found")},
)
@extend_schema(
    methods=["PATCH"],
    summary="Update a research task",
    request=ResearchTaskSerializer,
    responses={
        200: ResearchTaskSerializer,
        400: OpenApiResponse(description="Validation error"),
        403: OpenApiResponse(description="Permission denied"),
        404: OpenApiResponse(description="Not found"),
    },
)
@extend_schema(
    methods=["DELETE"],
    summary="Delete a research task",
    responses={
        204: OpenApiResponse(description="Deleted"),
        403: OpenApiResponse(description="Permission denied"),
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated, IsEmailVerified])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def research_task_detail(request, task_id: int):
    if request.method == "GET":
        task, err = _check_task_access(request, task_id, for_write=False)
        if err:
            return err
        try:
            task = _tasks_base_queryset(request.user).get(id=task.id)
        except ResearchTask.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ResearchTaskSerializer(task, context={"request": request}).data)

    if request.method == "PATCH":
        task, err = _check_task_access(request, task_id, for_write=True)
        if err:
            return err

        data = {}
        for key in ("title", "description", "urgency", "status", "due_date", "dueDate"):
            if key in request.data:
                data[key] = request.data.get(key)
        if "dueDate" in data and "due_date" not in data:
            data["due_date"] = data.pop("dueDate")

        serializer = ResearchTaskSerializer(
            task, data=data, partial=True, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Validation failed.", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save()

        task = _tasks_base_queryset(request.user).get(id=task.id)
        return Response(ResearchTaskSerializer(task, context={"request": request}).data)

    # DELETE
    task, err = _check_task_access(request, task_id, for_write=True)
    if err:
        return err

    for att in task.attachments.all():
        try:
            if att.file:
                att.file.delete(save=False)
        except Exception:
            pass

    task.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    methods=["POST"],
    summary="Assign a user to a task",
    description="Add a research member as a task assignee. Body: user_id, optional role.",
    request=None,
    responses={
        201: ResearchTaskAssigneeSerializer,
        400: OpenApiResponse(description="Bad request"),
        403: OpenApiResponse(description="Permission denied"),
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def research_task_assign(request, task_id: int):
    """POST /api/research/tasks/<task_id>/assignees/"""
    task, err = _check_task_access(request, task_id, for_write=True)
    if err:
        return err

    user_id = request.data.get("user_id") or request.data.get("id")
    if not user_id:
        return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return Response({"detail": "Invalid user_id."}, status=status.HTTP_400_BAD_REQUEST)

    if user_id not in _research_member_user_ids(task.research):
        return Response(
            {"detail": "המשתמש אינו חבר במחקר זה."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    role = (request.data.get("role") or "").strip()[:100]
    assignee, created = ResearchTaskAssignee.objects.get_or_create(
        task=task, user_id=user_id, defaults={"role": role},
    )
    if not created and role and assignee.role != role:
        assignee.role = role
        assignee.save(update_fields=["role"])

    return Response(
        ResearchTaskAssigneeSerializer(assignee, context={"request": request}).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@extend_schema(
    methods=["DELETE"],
    summary="Unassign a user from a task",
    responses={
        204: OpenApiResponse(description="Unassigned"),
        403: OpenApiResponse(description="Permission denied"),
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def research_task_unassign(request, task_id: int, user_id: int):
    """DELETE /api/research/tasks/<task_id>/assignees/<user_id>/"""
    task, err = _check_task_access(request, task_id, for_write=True)
    if err:
        return err

    deleted, _ = ResearchTaskAssignee.objects.filter(task=task, user_id=user_id).delete()
    if not deleted:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    methods=["GET"],
    summary="List task comments",
    responses={200: ResearchTaskCommentSerializer(many=True)},
)
@extend_schema(
    methods=["POST"],
    summary="Add a task comment",
    request=ResearchTaskCommentSerializer,
    responses={
        201: ResearchTaskCommentSerializer,
        400: OpenApiResponse(description="Validation error"),
    },
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def research_task_comments(request, task_id: int):
    """GET/POST /api/research/tasks/<task_id>/comments/"""
    task, err = _check_task_access(request, task_id, for_write=False)
    if err:
        return err

    if request.method == "GET":
        qs = task.comments.select_related("author").all()
        return Response(
            ResearchTaskCommentSerializer(qs, many=True, context={"request": request}).data
        )

    serializer = ResearchTaskCommentSerializer(data=request.data, context={"request": request})
    if not serializer.is_valid():
        return Response(
            {"code": "VALIDATION_ERROR", "message": "Validation failed.", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
    comment = ResearchTaskComment.objects.create(
        task=task,
        author=request.user,
        body=serializer.validated_data["body"],
    )
    return Response(
        ResearchTaskCommentSerializer(comment, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@extend_schema(
    methods=["DELETE"],
    summary="Delete a task comment",
    description="Comment author, task creator, or research owner can delete.",
    responses={204: OpenApiResponse(description="Deleted")},
)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def research_task_comment_delete(request, task_id: int, comment_id: int):
    """DELETE /api/research/tasks/<task_id>/comments/<comment_id>/"""
    task, err = _check_task_access(request, task_id, for_write=False)
    if err:
        return err

    try:
        comment = ResearchTaskComment.objects.get(id=comment_id, task=task)
    except ResearchTaskComment.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    is_author = comment.author_id == request.user.id
    is_owner = task.research.owner_id == request.user.id
    is_task_creator = task.created_by_id == request.user.id
    if not (is_author or is_owner or is_task_creator):
        return Response(
            {"detail": "ניתן למחוק רק הערות שלך."},
            status=status.HTTP_403_FORBIDDEN,
        )

    comment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    methods=["POST"],
    summary="Upload task attachments",
    description="Upload one or more files to a task via multipart `files` field.",
    request=None,
    responses={
        201: ResearchTaskAttachmentSerializer(many=True),
        400: OpenApiResponse(description="Bad request"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
@parser_classes([MultiPartParser, FormParser])
def research_task_attachments_upload(request, task_id: int):
    """POST /api/research/tasks/<task_id>/attachments/"""
    from apps.profiles.file_security import validate_upload, generate_secure_filename

    task, err = _check_task_access(request, task_id, for_write=True)
    if err:
        return err

    files = request.FILES.getlist("files") or request.FILES.getlist("file")
    if not files:
        return Response({"detail": "יש לצרף לפחות קובץ אחד."}, status=status.HTTP_400_BAD_REQUEST)

    created = []
    for f in files:
        ok, msg = validate_upload(f)
        if not ok:
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)
        att = ResearchTaskAttachment.objects.create(
            task=task,
            file=f,
            file_name=generate_secure_filename(f.name),
            size=getattr(f, "size", 0) or 0,
            uploaded_by=request.user,
        )
        created.append(att)

    return Response(
        ResearchTaskAttachmentSerializer(created, many=True, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@extend_schema(
    methods=["DELETE"],
    summary="Delete a task attachment",
    responses={204: OpenApiResponse(description="Deleted")},
)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def research_task_attachment_delete(request, task_id: int, attachment_id: int):
    """DELETE /api/research/tasks/<task_id>/attachments/<attachment_id>/"""
    task, err = _check_task_access(request, task_id, for_write=True)
    if err:
        return err

    try:
        att = ResearchTaskAttachment.objects.get(id=attachment_id, task=task)
    except ResearchTaskAttachment.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        if att.file:
            att.file.delete(save=False)
    except Exception:
        pass
    att.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
