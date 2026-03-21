import csv

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.email_service import EmailService
from apps.common.permissions import IsAdminUser
from apps.profiles.models import StudentProfile, MentorProfile
from apps.research.models import Research, ResearchApplication
from .models import AdminActionLog, AnnouncementDismissal, SiteSetting, SystemAnnouncement
from .serializers import (
    ActiveAnnouncementSerializer,
    AdminActionLogSerializer,
    AdminApplicationSerializer,
    AdminResearchEditSerializer,
    AdminResearchSerializer,
    AdminUserEditSerializer,
    AdminUserSerializer,
    DashboardStatsSerializer,
    SiteSettingSerializer,
    SystemAnnouncementSerializer,
)

User = get_user_model()

ADMIN_PERMS = [IsAuthenticated, IsAdminUser]


def _log_action(admin, action_type, target_user=None, target_research_id=None, note="", details=None):
    AdminActionLog.objects.create(
        admin=admin,
        action_type=action_type,
        target_user=target_user,
        target_research_id=target_research_id,
        note=note,
        details=details or {},
    )


# ===================== Dashboard =====================


@api_view(["GET"])
@permission_classes(ADMIN_PERMS)
def dashboard_stats(request):
    users = User.objects.all()
    all_researches = Research.all_objects.all()
    now = timezone.now()
    data = {
        "total_users": users.count(),
        "active_users": users.filter(is_active=True).count(),
        "deactivated_users": users.filter(is_active=False).count(),
        "unverified_emails": users.filter(email_verified=False).count(),
        "total_researches": all_researches.filter(is_deleted=False).count(),
        "pending_researches": all_researches.filter(moderation_status="pending", is_deleted=False).count(),
        "flagged_researches": all_researches.filter(moderation_status="flagged", is_deleted=False).count(),
        "deleted_researches": all_researches.filter(is_deleted=True).count(),
        "total_applications": ResearchApplication.objects.count(),
        "pending_applications": ResearchApplication.objects.filter(status="pending").count(),
        "active_announcements": SystemAnnouncement.objects.filter(
            is_active=True,
        ).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now)).count(),
        "registered_students": StudentProfile.objects.count(),
        "registered_mentors": MentorProfile.objects.count(),
    }
    serializer = DashboardStatsSerializer(data)
    return Response(serializer.data)


# ===================== Research Moderation =====================


@api_view(["GET"])
@permission_classes(ADMIN_PERMS)
def list_researches(request):
    qs = Research.all_objects.select_related("owner").all()

    moderation_status = request.query_params.get("moderation_status")
    if moderation_status:
        qs = qs.filter(moderation_status=moderation_status)

    include_deleted = request.query_params.get("include_deleted", "").lower() == "true"
    if not include_deleted:
        qs = qs.filter(is_deleted=False)

    search = request.query_params.get("search", "").strip()
    if search:
        qs = qs.filter(researchName__icontains=search)

    serializer = AdminResearchSerializer(qs[:200], many=True)
    return Response(serializer.data)


def _get_research_or_404(pk):
    try:
        return Research.all_objects.select_related("owner").get(pk=pk)
    except Research.DoesNotExist:
        return None


@api_view(["POST"])
@permission_classes(ADMIN_PERMS)
def approve_research(request, pk):
    research = _get_research_or_404(pk)
    if not research:
        return Response({"detail": "Research not found."}, status=status.HTTP_404_NOT_FOUND)

    old_status = research.moderation_status
    research.moderation_status = "approved"
    note = request.data.get("note", "")
    if note:
        research.moderation_note = note
    research.save(update_fields=["moderation_status", "moderation_note"])

    _log_action(
        request.user,
        AdminActionLog.ActionType.RESEARCH_APPROVE,
        target_research_id=research.id,
        note=note,
        details={"old_status": old_status, "new_status": "approved"},
    )
    EmailService.send_research_approved_email(research.owner, research)
    return Response({"detail": "Research approved."})


@api_view(["POST"])
@permission_classes(ADMIN_PERMS)
def reject_research(request, pk):
    research = _get_research_or_404(pk)
    if not research:
        return Response({"detail": "Research not found."}, status=status.HTTP_404_NOT_FOUND)

    old_status = research.moderation_status
    research.moderation_status = "rejected"
    note = request.data.get("note", "")
    if note:
        research.moderation_note = note
    research.save(update_fields=["moderation_status", "moderation_note"])

    _log_action(
        request.user,
        AdminActionLog.ActionType.RESEARCH_REJECT,
        target_research_id=research.id,
        note=note,
        details={"old_status": old_status, "new_status": "rejected"},
    )
    EmailService.send_research_rejected_email(research.owner, research)
    return Response({"detail": "Research rejected."})


@api_view(["POST"])
@permission_classes(ADMIN_PERMS)
def flag_research(request, pk):
    research = _get_research_or_404(pk)
    if not research:
        return Response({"detail": "Research not found."}, status=status.HTTP_404_NOT_FOUND)

    old_status = research.moderation_status
    research.moderation_status = "flagged"
    note = request.data.get("note", "")
    if note:
        research.moderation_note = note
    research.save(update_fields=["moderation_status", "moderation_note"])

    _log_action(
        request.user,
        AdminActionLog.ActionType.RESEARCH_FLAG,
        target_research_id=research.id,
        note=note,
        details={"old_status": old_status, "new_status": "flagged"},
    )
    return Response({"detail": "Research flagged."})


@api_view(["POST"])
@permission_classes(ADMIN_PERMS)
def soft_delete_research(request, pk):
    research = _get_research_or_404(pk)
    if not research:
        return Response({"detail": "Research not found."}, status=status.HTTP_404_NOT_FOUND)

    research.is_deleted = True
    note = request.data.get("note", "")
    research.save(update_fields=["is_deleted"])

    _log_action(
        request.user,
        AdminActionLog.ActionType.RESEARCH_SOFT_DELETE,
        target_research_id=research.id,
        note=note,
    )
    return Response({"detail": "Research soft-deleted."})


@api_view(["POST"])
@permission_classes(ADMIN_PERMS)
def restore_research(request, pk):
    research = _get_research_or_404(pk)
    if not research:
        return Response({"detail": "Research not found."}, status=status.HTTP_404_NOT_FOUND)

    research.is_deleted = False
    research.save(update_fields=["is_deleted"])

    _log_action(
        request.user,
        AdminActionLog.ActionType.RESEARCH_RESTORE,
        target_research_id=research.id,
    )
    return Response({"detail": "Research restored."})


@api_view(["PATCH"])
@permission_classes(ADMIN_PERMS)
def edit_research(request, pk):
    research = _get_research_or_404(pk)
    if not research:
        return Response({"detail": "Research not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = AdminResearchEditSerializer(research, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Track which fields actually changed
    changed = {}
    for field, new_value in serializer.validated_data.items():
        old_value = getattr(research, field)
        if old_value != new_value:
            changed[field] = {"old": str(old_value), "new": str(new_value)}

    if not changed:
        return Response({"detail": "No changes detected."})

    serializer.save()

    _log_action(
        request.user,
        AdminActionLog.ActionType.RESEARCH_EDIT,
        target_research_id=research.id,
        details={"changed_fields": changed},
    )
    return Response({"detail": "Research updated.", "changed": list(changed.keys())})


# ===================== Bulk Research Actions =====================


@api_view(["POST"])
@permission_classes(ADMIN_PERMS)
def bulk_research_action(request):
    ids = request.data.get("ids", [])
    action = request.data.get("action", "")
    note = request.data.get("note", "")

    ALLOWED_ACTIONS = {"approve", "reject", "flag", "soft_delete", "restore"}
    if action not in ALLOWED_ACTIONS:
        return Response({"detail": f"Invalid action. Must be one of: {', '.join(ALLOWED_ACTIONS)}"},
                        status=status.HTTP_400_BAD_REQUEST)

    if not ids or not isinstance(ids, list):
        return Response({"detail": "ids must be a non-empty list."}, status=status.HTTP_400_BAD_REQUEST)

    ACTION_MAP = {
        "approve": ("moderation_status", "approved", AdminActionLog.ActionType.RESEARCH_APPROVE),
        "reject": ("moderation_status", "rejected", AdminActionLog.ActionType.RESEARCH_REJECT),
        "flag": ("moderation_status", "flagged", AdminActionLog.ActionType.RESEARCH_FLAG),
        "soft_delete": ("is_deleted", True, AdminActionLog.ActionType.RESEARCH_SOFT_DELETE),
        "restore": ("is_deleted", False, AdminActionLog.ActionType.RESEARCH_RESTORE),
    }

    field, value, action_type = ACTION_MAP[action]
    updated = 0

    for pk in ids:
        research = _get_research_or_404(pk)
        if not research:
            continue
        old_value = getattr(research, field)
        setattr(research, field, value)
        if field == "moderation_status" and note:
            research.moderation_note = note
            research.save(update_fields=[field, "moderation_note"])
        else:
            research.save(update_fields=[field])
        _log_action(
            request.user, action_type,
            target_research_id=research.id,
            note=note,
            details={"old": str(old_value), "new": str(value)},
        )
        if action == "approve":
            EmailService.send_research_approved_email(research.owner, research)
        elif action == "reject":
            EmailService.send_research_rejected_email(research.owner, research)
        updated += 1

    return Response({"detail": f"{updated} researches updated."})


# ===================== User Management =====================


@api_view(["GET"])
@permission_classes(ADMIN_PERMS)
def list_users(request):
    qs = User.objects.all()

    # Regular admins cannot see superusers
    if not request.user.is_superuser:
        qs = qs.exclude(is_superuser=True)

    search = request.query_params.get("search", "").strip()
    if search:
        qs = qs.filter(
            Q(email__icontains=search)
            | Q(firstName__icontains=search)
            | Q(lastName__icontains=search)
        )

    is_active = request.query_params.get("is_active")
    if is_active is not None:
        qs = qs.filter(is_active=is_active.lower() == "true")

    serializer = AdminUserSerializer(qs[:200], many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes(ADMIN_PERMS)
def get_user(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    if user.is_superuser and not request.user.is_superuser:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    serializer = AdminUserSerializer(user)
    return Response(serializer.data)


@api_view(["PATCH"])
@permission_classes(ADMIN_PERMS)
def edit_user(request, pk):
    try:
        target = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    # Guard: cannot edit superuser unless requester is superuser
    if target.is_superuser and not request.user.is_superuser:
        return Response({"detail": "Cannot edit a superuser."}, status=status.HTTP_403_FORBIDDEN)

    # Guard: cannot grant is_staff unless requester is superuser
    if "is_staff" in request.data and request.data["is_staff"] and not request.user.is_superuser:
        return Response({"detail": "Only superusers can grant staff status."}, status=status.HTTP_403_FORBIDDEN)

    # Guard: is_superuser cannot be changed via this endpoint
    if "is_superuser" in request.data:
        return Response({"detail": "Cannot modify superuser status via this endpoint."}, status=status.HTTP_403_FORBIDDEN)

    serializer = AdminUserEditSerializer(data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    changed = {}
    for field, new_value in serializer.validated_data.items():
        old_value = getattr(target, field)
        if old_value != new_value:
            changed[field] = {"old": str(old_value), "new": str(new_value)}
            setattr(target, field, new_value)

    if not changed:
        return Response({"detail": "No changes detected."})

    target.save(update_fields=list(changed.keys()))

    _log_action(
        request.user,
        AdminActionLog.ActionType.USER_EDIT,
        target_user=target,
        details={"changed_fields": changed},
    )
    return Response({"detail": "User updated.", "changed": list(changed.keys())})


@api_view(["POST"])
@permission_classes(ADMIN_PERMS)
def deactivate_user(request, pk):
    try:
        target = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if target.is_superuser:
        return Response(
            {"detail": "Cannot deactivate a superuser."},
            status=status.HTTP_403_FORBIDDEN,
        )

    target.is_active = False
    target.save(update_fields=["is_active"])

    _log_action(
        request.user,
        AdminActionLog.ActionType.USER_DEACTIVATE,
        target_user=target,
        details={"email": target.email},
    )
    return Response({"detail": "User deactivated."})


@api_view(["POST"])
@permission_classes(ADMIN_PERMS)
def reactivate_user(request, pk):
    try:
        target = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if target.is_superuser and not request.user.is_superuser:
        return Response({"detail": "Cannot modify a superuser."}, status=status.HTTP_403_FORBIDDEN)

    target.is_active = True
    target.save(update_fields=["is_active"])

    _log_action(
        request.user,
        AdminActionLog.ActionType.USER_REACTIVATE,
        target_user=target,
        details={"email": target.email},
    )
    return Response({"detail": "User reactivated."})


@api_view(["POST"])
@permission_classes(ADMIN_PERMS)
def force_verify_user(request, pk):
    try:
        target = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if target.is_superuser and not request.user.is_superuser:
        return Response({"detail": "Cannot modify a superuser."}, status=status.HTTP_403_FORBIDDEN)

    target.email_verified = True
    target.save(update_fields=["email_verified"])

    _log_action(
        request.user,
        AdminActionLog.ActionType.USER_FORCE_VERIFY,
        target_user=target,
        details={"email": target.email},
    )
    return Response({"detail": "User email verified."})


# ===================== Bulk User Actions =====================


@api_view(["POST"])
@permission_classes(ADMIN_PERMS)
def bulk_user_action(request):
    ids = request.data.get("ids", [])
    action = request.data.get("action", "")

    ALLOWED_ACTIONS = {"deactivate", "reactivate", "force_verify"}
    if action not in ALLOWED_ACTIONS:
        return Response({"detail": f"Invalid action. Must be one of: {', '.join(ALLOWED_ACTIONS)}"},
                        status=status.HTTP_400_BAD_REQUEST)

    if not ids or not isinstance(ids, list):
        return Response({"detail": "ids must be a non-empty list."}, status=status.HTTP_400_BAD_REQUEST)

    ACTION_MAP = {
        "deactivate": ("is_active", False, AdminActionLog.ActionType.USER_DEACTIVATE),
        "reactivate": ("is_active", True, AdminActionLog.ActionType.USER_REACTIVATE),
        "force_verify": ("email_verified", True, AdminActionLog.ActionType.USER_FORCE_VERIFY),
    }

    field, value, action_type = ACTION_MAP[action]
    updated = 0

    for uid in ids:
        try:
            target = User.objects.get(pk=uid)
        except User.DoesNotExist:
            continue
        if target.is_superuser:
            continue
        setattr(target, field, value)
        target.save(update_fields=[field])
        _log_action(request.user, action_type, target_user=target, details={"email": target.email})
        updated += 1

    return Response({"detail": f"{updated} users updated."})


# ===================== Audit Log =====================


@api_view(["GET"])
@permission_classes(ADMIN_PERMS)
def list_logs(request):
    qs = AdminActionLog.objects.select_related("admin", "target_user").all()

    action_type = request.query_params.get("action_type")
    if action_type:
        qs = qs.filter(action_type=action_type)

    serializer = AdminActionLogSerializer(qs[:200], many=True)
    return Response(serializer.data)


# ===================== Site Settings =====================


@api_view(["GET", "PATCH"])
@permission_classes(ADMIN_PERMS)
def site_settings(request):
    obj = SiteSetting.load()

    if request.method == "GET":
        return Response(SiteSettingSerializer(obj).data)

    serializer = SiteSettingSerializer(obj, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    changed = {k: v for k, v in serializer.validated_data.items() if getattr(obj, k) != v}
    serializer.save()

    if changed:
        _log_action(
            request.user,
            AdminActionLog.ActionType.SETTINGS_UPDATED,
            details={"changed_fields": {k: str(v) for k, v in changed.items()}},
        )

    return Response(SiteSettingSerializer(obj).data)


# ===================== Announcements =====================


@api_view(["GET"])
@permission_classes(ADMIN_PERMS)
def list_announcements(request):
    qs = SystemAnnouncement.objects.select_related("created_by").annotate(
        dismissal_count=Count("dismissals")
    ).all()
    serializer = SystemAnnouncementSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes(ADMIN_PERMS)
def create_announcement(request):
    serializer = SystemAnnouncementSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    announcement = serializer.save(created_by=request.user)

    _log_action(
        request.user,
        AdminActionLog.ActionType.ANNOUNCEMENT_CREATE,
        details={"title": announcement.title, "audience": announcement.audience},
    )
    return Response(SystemAnnouncementSerializer(announcement).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
@permission_classes(ADMIN_PERMS)
def update_announcement(request, pk):
    try:
        announcement = SystemAnnouncement.objects.get(pk=pk)
    except SystemAnnouncement.DoesNotExist:
        return Response({"detail": "Announcement not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = SystemAnnouncementSerializer(announcement, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    changed = {}
    for field, new_value in serializer.validated_data.items():
        old_value = getattr(announcement, field)
        if old_value != new_value:
            changed[field] = {"old": str(old_value), "new": str(new_value)}

    if not changed:
        return Response({"detail": "No changes detected."})

    serializer.save()

    _log_action(
        request.user,
        AdminActionLog.ActionType.ANNOUNCEMENT_UPDATE,
        details={"announcement_id": announcement.id, "changed_fields": changed},
    )
    return Response(SystemAnnouncementSerializer(announcement).data)


@api_view(["POST"])
@permission_classes(ADMIN_PERMS)
def deactivate_announcement(request, pk):
    try:
        announcement = SystemAnnouncement.objects.get(pk=pk)
    except SystemAnnouncement.DoesNotExist:
        return Response({"detail": "Announcement not found."}, status=status.HTTP_404_NOT_FOUND)

    announcement.is_active = False
    announcement.save(update_fields=["is_active"])

    _log_action(
        request.user,
        AdminActionLog.ActionType.ANNOUNCEMENT_DEACTIVATE,
        details={"announcement_id": announcement.id, "title": announcement.title},
    )
    return Response({"detail": "Announcement deactivated."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def active_announcements(request):
    now = timezone.now()
    user = request.user

    # Build audience filter based on user profile
    audience_q = Q(audience="all")
    if hasattr(user, "has_mentor_profile") and user.has_mentor_profile:
        audience_q |= Q(audience="mentors")
    if hasattr(user, "has_student_profile") and user.has_student_profile:
        audience_q |= Q(audience="students")

    qs = SystemAnnouncement.objects.filter(
        is_active=True,
    ).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=now)
    ).exclude(
        dismissals__user=user,
    ).filter(audience_q)

    serializer = ActiveAnnouncementSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def dismiss_announcement(request, pk):
    try:
        announcement = SystemAnnouncement.objects.get(pk=pk)
    except SystemAnnouncement.DoesNotExist:
        return Response({"detail": "Announcement not found."}, status=status.HTTP_404_NOT_FOUND)

    AnnouncementDismissal.objects.get_or_create(
        announcement=announcement,
        user=request.user,
    )
    return Response({"detail": "Announcement dismissed."})


# ===================== Applications =====================


@api_view(["GET"])
@permission_classes(ADMIN_PERMS)
def list_applications(request):
    qs = ResearchApplication.objects.select_related("applicant", "research").all()

    app_status = request.query_params.get("status")
    if app_status:
        qs = qs.filter(status=app_status)

    research_id = request.query_params.get("research_id")
    if research_id:
        qs = qs.filter(research_id=research_id)

    search = request.query_params.get("search", "").strip()
    if search:
        qs = qs.filter(
            Q(applicant__email__icontains=search)
            | Q(applicant__firstName__icontains=search)
            | Q(applicant__lastName__icontains=search)
        )

    serializer = AdminApplicationSerializer(qs[:200], many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes(ADMIN_PERMS)
def override_application(request, pk):
    try:
        application = ResearchApplication.objects.select_related("applicant", "research").get(pk=pk)
    except ResearchApplication.DoesNotExist:
        return Response({"detail": "Application not found."}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get("new_status")
    ALLOWED_STATUSES = {"pending", "approved", "rejected", "cancelled", "invited"}
    if new_status not in ALLOWED_STATUSES:
        return Response(
            {"detail": f"Invalid status. Must be one of: {', '.join(ALLOWED_STATUSES)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    old_status = application.status
    note = request.data.get("note", "")

    application.status = new_status
    if note:
        application.mentor_note = note
    application.save(update_fields=["status", "mentor_note"])

    _log_action(
        request.user,
        AdminActionLog.ActionType.APPLICATION_OVERRIDE,
        target_user=application.applicant,
        target_research_id=application.research_id,
        note=note,
        details={"old_status": old_status, "new_status": new_status, "application_id": application.id},
    )
    return Response({"detail": f"Application status changed from {old_status} to {new_status}."})


# ===================== CSV Export =====================


def _csv_response(filename):
    response = HttpResponse(content_type="text/csv; charset=utf-8-sig")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    # BOM for Hebrew in Excel
    response.write("\ufeff")
    return response


@api_view(["GET"])
@permission_classes(ADMIN_PERMS)
def export_researches_csv(request):
    qs = Research.all_objects.select_related("owner").all()

    moderation_status = request.query_params.get("moderation_status")
    if moderation_status:
        qs = qs.filter(moderation_status=moderation_status)

    include_deleted = request.query_params.get("include_deleted", "").lower() == "true"
    if not include_deleted:
        qs = qs.filter(is_deleted=False)

    search = request.query_params.get("search", "").strip()
    if search:
        qs = qs.filter(researchName__icontains=search)

    response = _csv_response("researches.csv")
    writer = csv.writer(response)
    writer.writerow(["ID", "Name", "Owner Email", "Area", "Status", "Moderation", "Created At"])
    for r in qs[:2000]:
        writer.writerow([
            r.id, r.researchName, r.owner.email if r.owner else "",
            r.researchArea, r.status, r.moderation_status,
            r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
        ])
    return response


@api_view(["GET"])
@permission_classes(ADMIN_PERMS)
def export_users_csv(request):
    qs = User.objects.all()

    search = request.query_params.get("search", "").strip()
    if search:
        qs = qs.filter(
            Q(email__icontains=search)
            | Q(firstName__icontains=search)
            | Q(lastName__icontains=search)
        )

    is_active = request.query_params.get("is_active")
    if is_active is not None:
        qs = qs.filter(is_active=is_active.lower() == "true")

    response = _csv_response("users.csv")
    writer = csv.writer(response)
    writer.writerow(["Email", "First Name", "Last Name", "Active", "Staff", "Email Verified", "Date Joined"])
    for u in qs[:2000]:
        writer.writerow([
            u.email, u.firstName, u.lastName,
            u.is_active, u.is_staff, u.email_verified,
            u.date_joined.strftime("%Y-%m-%d %H:%M") if u.date_joined else "",
        ])
    return response


@api_view(["GET"])
@permission_classes(ADMIN_PERMS)
def export_logs_csv(request):
    qs = AdminActionLog.objects.select_related("admin", "target_user").all()

    action_type = request.query_params.get("action_type")
    if action_type:
        qs = qs.filter(action_type=action_type)

    response = _csv_response("admin_logs.csv")
    writer = csv.writer(response)
    writer.writerow(["Date", "Action Type", "Admin Email", "Target User Email", "Research ID", "Note"])
    for log in qs[:2000]:
        writer.writerow([
            log.created_at.strftime("%Y-%m-%d %H:%M") if log.created_at else "",
            log.action_type,
            log.admin.email if log.admin else "",
            log.target_user.email if log.target_user else "",
            log.target_research_id or "",
            log.note,
        ])
    return response
