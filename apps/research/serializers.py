import json
import re

from rest_framework import serializers

from apps.profiles.models import StudentProfile, MentorProfile
from apps.profiles.file_security import validate_upload
from apps.common.utils import sanitize_text

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


class ResearchSerializer(serializers.ModelSerializer):
    contractUrl = serializers.SerializerMethodField(read_only=True)
    contractFileName = serializers.SerializerMethodField(read_only=True)
    isFull = serializers.SerializerMethodField(read_only=True)
    ownerName = serializers.SerializerMethodField(read_only=True)
    ownerAvatarUrl = serializers.SerializerMethodField(read_only=True)
    ownerRole = serializers.SerializerMethodField(read_only=True)
    ownerProfileId = serializers.SerializerMethodField(read_only=True)
    ownerId = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Research
        fields = [
            "id",
            "ownerId",
            "ownerName",
            "ownerAvatarUrl",
            "ownerRole",
            "ownerProfileId",
            "researchName",
            "description",
            "researchArea",
            "mentors",
            "teamSize",
            "startDate",
            "estimatedCompletionDate",
            "weeklyHours",
            "durationMonths",
            "compensation",
            "academic_tracks",
            "workMode",
            "requirements",
            "skillsAndTools",
            "output",
            "location",
            "status",
            "helsinkiApproval",
            "dataType",
            "contractUrl",
            "contractFileName",
            "accepting_applications",
            "isFull",
            "moderation_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "ownerId", "ownerName", "ownerAvatarUrl", "ownerRole", "ownerProfileId", "created_at", "updated_at", "contractUrl", "contractFileName", "isFull", "moderation_status"]

    def get_contractUrl(self, obj):
        if not obj.contract:
            return None
        request = self.context.get("request")
        secure_path = f"/api/research/{obj.id}/contract/"
        return request.build_absolute_uri(secure_path) if request else secure_path

    def get_contractFileName(self, obj):
        if not obj.contract:
            return None
        try:
            return obj.contract.name.split("/")[-1]
        except Exception:
            return None

    def get_isFull(self, obj):
        if not obj.teamSize:
            return False
        # Mentors don't count towards team size
        approved_count = ResearchApplication.objects.filter(
            research=obj, status=ResearchApplication.Status.APPROVED
        ).exclude(
            applicant__in=MentorProfile.objects.values_list("user_id", flat=True)
        ).count()
        return approved_count >= obj.teamSize

    def get_ownerName(self, obj):
        try:
            return obj.owner.get_full_name()
        except Exception:
            return None

    def _get_owner_profile(self, obj):
        """Return (profile, profile_type) for the research owner."""
        try:
            profile = MentorProfile.objects.get(user=obj.owner)
            return profile, "mentor"
        except MentorProfile.DoesNotExist:
            pass
        try:
            profile = StudentProfile.objects.get(user=obj.owner)
            return profile, "student"
        except StudentProfile.DoesNotExist:
            pass
        return None, None

    def get_ownerAvatarUrl(self, obj):
        profile, _ = self._get_owner_profile(obj)
        if not profile or not profile.avatar:
            return None
        request = self.context.get("request")
        url = profile.avatar.url
        return request.build_absolute_uri(url) if request else url

    def get_ownerRole(self, obj):
        _, profile_type = self._get_owner_profile(obj)
        if profile_type == "mentor":
            return "מנחה"
        if profile_type == "student":
            return "סטודנט"
        return None

    def get_ownerProfileId(self, obj):
        profile, _ = self._get_owner_profile(obj)
        return str(profile.id) if profile else None

    def get_ownerId(self, obj):
        return str(obj.owner_id) if obj.owner_id else None


class ResearchCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Research
        fields = [
            "researchName",
            "description",
            "researchArea",
            "mentors",
            "teamSize",
            "startDate",
            "estimatedCompletionDate",
            "weeklyHours",
            "durationMonths",
            "compensation",
            "academic_tracks",
            "workMode",
            "requirements",
            "skillsAndTools",
            "output",
            "location",
            "status",
            "helsinkiApproval",
            "dataType",
            "contract",
            "accepting_applications",
        ]
        extra_kwargs = {
            "researchName": {"required": True, "min_length": 3, "max_length": 255},
            "description": {"required": True, "max_length": 5000, "min_length": 10},
            "researchArea": {"max_length": 255},
            "mentors": {"max_length": 255},
            "requirements": {"max_length": 5000},
            "skillsAndTools": {"max_length": 5000},
            "output": {"max_length": 5000},
            "location": {"max_length": 255},
            "helsinkiApproval": {"max_length": 100},
            "accepting_applications": {"default": True, "required": False},
        }

    # --- Text sanitization ---
    _TEXT_FIELDS_TO_SANITIZE = (
        "researchName", "description", "researchArea", "mentors",
        "requirements", "skillsAndTools", "output", "location",
        "helsinkiApproval",
    )

    def to_internal_value(self, data):
        ret = super().to_internal_value(data)
        for field in self._TEXT_FIELDS_TO_SANITIZE:
            if field in ret and isinstance(ret[field], str):
                ret[field] = sanitize_text(ret[field])
        return ret

    # --- Numeric bounds validators ---
    def validate_weeklyHours(self, value):
        if value is not None and not (1 <= value <= 168):
            raise serializers.ValidationError("Weekly hours must be between 1 and 168.")
        return value

    def validate_durationMonths(self, value):
        if value is not None and not (1 <= value <= 120):
            raise serializers.ValidationError("Duration must be between 1 and 120 months.")
        return value

    def validate_teamSize(self, value):
        if value is not None and not (1 <= value <= 500):
            raise serializers.ValidationError("Team size must be between 1 and 500.")
        return value

    # --- Title quality gate ---
    def validate_researchName(self, value):
        if value:
            distinct_word_chars = set(re.findall(r"\w", value, re.UNICODE))
            if len(distinct_word_chars) < 2:
                raise serializers.ValidationError(
                    "Research name must contain at least 2 distinct characters."
                )
        return value

    def _validate_string_list(self, value, field_name, max_items=10):
        """Shared validator: ensure value is a list of strings (handles JSON string from FormData)."""
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                raise serializers.ValidationError(f"Invalid JSON for {field_name}.")
        if not isinstance(value, list):
            raise serializers.ValidationError(f"{field_name} must be a list.")
        if len(value) > max_items:
            raise serializers.ValidationError(f"{field_name} cannot have more than {max_items} items.")
        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError(f"Each item in {field_name} must be a string.")
        return value

    def validate_compensation(self, value):
        """Ensure compensation is a list of strings."""
        return self._validate_string_list(value, "compensation")

    def validate_academic_tracks(self, value):
        """Ensure academic_tracks is a list of unique strings."""
        value = self._validate_string_list(value, "academic_tracks")
        # Remove duplicates while preserving order
        seen = set()
        deduped = []
        for item in value:
            stripped = item.strip()
            if stripped and stripped not in seen:
                seen.add(stripped)
                deduped.append(stripped)
        return deduped

    def validate_contract(self, value):
        """Validate uploaded contract file using the file security pipeline."""
        if value is None:
            return value
        is_valid, error_message = validate_upload(value)
        if not is_valid:
            raise serializers.ValidationError(error_message)
        return value

    def validate_startDate(self, value):
        """Accept any valid date (past dates allowed for ongoing research)."""
        return value

    def validate_estimatedCompletionDate(self, value):
        """Accept any valid date (past dates allowed for completed research)."""
        return value

    def validate(self, attrs):
        """Cross-field validation: end date must be after start date."""
        start = attrs.get("startDate")
        end = attrs.get("estimatedCompletionDate")
        # For PATCH, fall back to instance values
        if self.instance:
            if start is None:
                start = self.instance.startDate
            if end is None:
                end = self.instance.estimatedCompletionDate
        if start and end and end <= start:
            raise serializers.ValidationError({
                "estimatedCompletionDate": "Estimated completion date must be after start date."
            })
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")
        from apps.admin_panel.models import SiteSetting
        site = SiteSetting.load()
        validated_data.setdefault("moderation_status", site.default_moderation_status)
        return Research.objects.create(owner=request.user, **validated_data)


class ResearchApplicationSerializer(serializers.ModelSerializer):
    applicantId = serializers.SerializerMethodField(read_only=True)
    applicantProfileId = serializers.SerializerMethodField(read_only=True)
    applicantMentorProfileId = serializers.SerializerMethodField(read_only=True)
    name = serializers.SerializerMethodField(read_only=True)
    email = serializers.SerializerMethodField(read_only=True)
    gender = serializers.SerializerMethodField(read_only=True)
    apprenticeStage = serializers.SerializerMethodField(read_only=True)
    startYear = serializers.SerializerMethodField(read_only=True)
    institution = serializers.SerializerMethodField(read_only=True)
    avatarUrl = serializers.SerializerMethodField(read_only=True)
    researchAvailability = serializers.SerializerMethodField(read_only=True)
    isAvailableForResearch = serializers.SerializerMethodField(read_only=True)
    hasStudentProfile = serializers.SerializerMethodField(read_only=True)
    workplace = serializers.SerializerMethodField(read_only=True)
    academicRank = serializers.SerializerMethodField(read_only=True)
    isMentor = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ResearchApplication
        fields = [
            "id",
            "status",
            "created_at",
            "updated_at",
            "applicantId",
            "applicantProfileId",
            "applicantMentorProfileId",
            "name",
            "email",
            "gender",
            "apprenticeStage",
            "startYear",
            "institution",
            "avatarUrl",
            "workplace",
            "academicRank",
            "isMentor",
            "researchAvailability",
            "isAvailableForResearch",
            "hasStudentProfile",
            "invited_role",
            "mentor_note",
            "can_edit",
            "can_approve",
            "can_invite",
            "can_remove",
            "can_manage_chat",
        ]
        read_only_fields = fields

    def get_applicantId(self, obj):
        return str(getattr(obj.applicant, "id", ""))

    def get_applicantProfileId(self, obj):
        profile = self._get_student_profile(obj)
        return str(profile.id) if profile else None

    def get_applicantMentorProfileId(self, obj):
        profile = self._get_mentor_profile(obj)
        return str(profile.id) if profile else None

    def _get_student_profile(self, obj):
        cache_attr = '_cached_student_profile'
        cache_key = getattr(obj, 'applicant_id', None)
        cached = getattr(self, cache_attr, {})
        if cache_key in cached:
            return cached[cache_key]
        try:
            profile = StudentProfile.objects.select_related(
                "institution",
                "apprenticeStage",
            ).get(user=obj.applicant)
        except StudentProfile.DoesNotExist:
            profile = None
        if not hasattr(self, cache_attr):
            setattr(self, cache_attr, {})
        getattr(self, cache_attr)[cache_key] = profile
        return profile

    def _get_mentor_profile(self, obj):
        cache_attr = '_cached_mentor_profile'
        cache_key = getattr(obj, 'applicant_id', None)
        cached = getattr(self, cache_attr, {})
        if cache_key in cached:
            return cached[cache_key]
        try:
            profile = MentorProfile.objects.select_related(
                "institution",
                "academicRank",
            ).get(user=obj.applicant)
        except MentorProfile.DoesNotExist:
            profile = None
        if not hasattr(self, cache_attr):
            setattr(self, cache_attr, {})
        getattr(self, cache_attr)[cache_key] = profile
        return profile

    def get_name(self, obj):
        try:
            return obj.applicant.get_full_name()
        except Exception:
            return None

    def get_email(self, obj):
        """Return email to the research owner, staff, or permitted mentors."""
        request = self.context.get("request")
        if request and hasattr(obj, "research"):
            if obj.research.owner_id == request.user.id or request.user.is_staff:
                return getattr(obj.applicant, "email", None)
            # Also show email to permitted mentors
            from django.db.models import Q
            if ResearchApplication.objects.filter(
                research=obj.research,
                applicant=request.user,
                status="approved",
            ).filter(
                Q(can_edit=True) | Q(can_approve=True) | Q(can_invite=True) | Q(can_remove=True)
            ).exists():
                return getattr(obj.applicant, "email", None)
        return None

    def get_gender(self, obj):
        value = getattr(obj.applicant, "gender", None)
        if value == "male":
            return "זכר"
        if value == "female":
            return "נקבה"
        if value == "other":
            return "אחר"
        return value

    def get_apprenticeStage(self, obj):
        profile = self._get_student_profile(obj)
        if not profile or not profile.apprenticeStage:
            return None
        return profile.apprenticeStage.name_he or profile.apprenticeStage.name

    def get_startYear(self, obj):
        profile = self._get_student_profile(obj)
        return getattr(profile, "startYear", None) if profile else None

    def get_institution(self, obj):
        profile = self._get_student_profile(obj)
        if profile and profile.institution:
            return profile.institution.name_he or profile.institution.name
        # Fallback to mentor profile's workplace
        mentor = self._get_mentor_profile(obj)
        if mentor and mentor.workplace:
            return mentor.workplace
        return None

    def get_avatarUrl(self, obj):
        profile = self._get_student_profile(obj)
        if profile and profile.avatar:
            request = self.context.get("request")
            url = profile.avatar.url
            return request.build_absolute_uri(url) if request else url
        # Fallback to mentor profile avatar
        mentor = self._get_mentor_profile(obj)
        if mentor and mentor.avatar:
            request = self.context.get("request")
            url = mentor.avatar.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_researchAvailability(self, obj):
        profile = self._get_student_profile(obj)
        if not profile:
            return None
        return bool(getattr(profile, "isAvailableForResearch", False))

    def get_isAvailableForResearch(self, obj):
        return self.get_researchAvailability(obj)

    def get_hasStudentProfile(self, obj):
        return self._get_student_profile(obj) is not None

    def get_workplace(self, obj):
        profile = self._get_student_profile(obj)
        if profile and profile.workplace:
            return profile.workplace
        mentor = self._get_mentor_profile(obj)
        if mentor and mentor.workplace:
            return mentor.workplace
        return None

    def get_academicRank(self, obj):
        mentor = self._get_mentor_profile(obj)
        if not mentor or not mentor.academicRank:
            return None
        return mentor.academicRank.name_he or mentor.academicRank.name

    def get_isMentor(self, obj):
        return self._get_mentor_profile(obj) is not None


class ContactMessageSerializer(serializers.ModelSerializer):
    senderName = serializers.SerializerMethodField()
    senderProfileId = serializers.SerializerMethodField()
    senderId = serializers.CharField(source='sender.id', read_only=True)
    researchName = serializers.SerializerMethodField()
    research_id = serializers.IntegerField(source='research.id', read_only=True, default=None)

    class Meta:
        model = ContactMessage
        fields = ['id', 'senderName', 'senderProfileId', 'senderId', 'researchName', 'research_id', 'notification_type', 'subject', 'body', 'is_read', 'created_at']
        read_only_fields = fields

    def get_senderName(self, obj):
        try:
            return obj.sender.get_full_name()
        except Exception:
            return None

    def get_senderProfileId(self, obj):
        """Return the sender's profile UUID (student or mentor) for linking to /user/:id."""
        try:
            return str(StudentProfile.objects.values_list('id', flat=True).get(user=obj.sender))
        except StudentProfile.DoesNotExist:
            pass
        try:
            return str(MentorProfile.objects.values_list('id', flat=True).get(user=obj.sender))
        except MentorProfile.DoesNotExist:
            pass
        return None

    def get_researchName(self, obj):
        try:
            return obj.research.researchName if obj.research else None
        except Exception:
            return None


class ResearchChatSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchChatSettings
        fields = ["send_permission", "files_enabled"]


class ResearchChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.CharField(source="sender.id", read_only=True)
    sender_name = serializers.SerializerMethodField(read_only=True)
    sender_avatar_url = serializers.SerializerMethodField(read_only=True)
    sender_is_mentor = serializers.SerializerMethodField(read_only=True)
    file_url = serializers.SerializerMethodField(read_only=True)
    pinned_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ResearchChatMessage
        fields = [
            "id",
            "body",
            "file_name",
            "file_url",
            "is_pinned",
            "pinned_by_name",
            "sender_id",
            "sender_name",
            "sender_avatar_url",
            "sender_is_mentor",
            "created_at",
        ]
        read_only_fields = fields

    def _get_mentor_profile(self, user):
        cache_attr = '_cached_mentor_profile'
        cache_key = user.id
        cached = getattr(self, cache_attr, {})
        if cache_key in cached:
            return cached[cache_key]
        try:
            profile = MentorProfile.objects.get(user=user)
        except MentorProfile.DoesNotExist:
            profile = None
        if not hasattr(self, cache_attr):
            setattr(self, cache_attr, {})
        getattr(self, cache_attr)[cache_key] = profile
        return profile

    def _get_student_profile(self, user):
        cache_attr = '_cached_student_profile'
        cache_key = user.id
        cached = getattr(self, cache_attr, {})
        if cache_key in cached:
            return cached[cache_key]
        try:
            profile = StudentProfile.objects.get(user=user)
        except StudentProfile.DoesNotExist:
            profile = None
        if not hasattr(self, cache_attr):
            setattr(self, cache_attr, {})
        getattr(self, cache_attr)[cache_key] = profile
        return profile

    def get_sender_name(self, obj):
        try:
            return obj.sender.get_full_name()
        except Exception:
            return None

    def get_sender_avatar_url(self, obj):
        request = self.context.get("request")
        # Try mentor profile first, then student
        profile = self._get_mentor_profile(obj.sender)
        if not profile:
            profile = self._get_student_profile(obj.sender)
        if not profile or not profile.avatar:
            return None
        url = profile.avatar.url
        return request.build_absolute_uri(url) if request else url

    def get_sender_is_mentor(self, obj):
        return self._get_mentor_profile(obj.sender) is not None

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url

    def get_pinned_by_name(self, obj):
        if not obj.pinned_by:
            return None
        try:
            return obj.pinned_by.get_full_name()
        except Exception:
            return None


# =============================================================================
# RESEARCH TASK MANAGER SERIALIZERS
# =============================================================================

def _user_avatar_url(user, request):
    """Return the best-guess avatar URL for a user (mentor or student profile)."""
    if user is None:
        return None
    profile = None
    try:
        profile = MentorProfile.objects.only("avatar").get(user=user)
    except MentorProfile.DoesNotExist:
        try:
            profile = StudentProfile.objects.only("avatar").get(user=user)
        except StudentProfile.DoesNotExist:
            profile = None
    if not profile or not profile.avatar:
        return None
    url = profile.avatar.url
    return request.build_absolute_uri(url) if request else url


class ResearchTaskAssigneeSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = ResearchTaskAssignee
        fields = ["id", "name", "role", "avatar"]
        read_only_fields = fields

    def get_id(self, obj):
        return str(obj.user_id)

    def get_name(self, obj):
        try:
            return obj.user.get_full_name() or obj.user.email
        except Exception:
            return None

    def get_avatar(self, obj):
        return _user_avatar_url(obj.user, self.context.get("request"))


class ResearchTaskAttachmentSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="file_name", read_only=True)
    url = serializers.SerializerMethodField(read_only=True)
    size = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ResearchTaskAttachment
        fields = ["id", "name", "size", "url", "created_at"]
        read_only_fields = fields

    def get_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        try:
            url = obj.file.url
        except Exception:
            return None
        return request.build_absolute_uri(url) if request else url

    def get_size(self, obj):
        """Return a human-readable size string (matches frontend expectation)."""
        bytes_ = obj.size or 0
        if bytes_ <= 0:
            return "0 B"
        units = ["B", "KB", "MB", "GB"]
        idx = 0
        val = float(bytes_)
        while val >= 1024 and idx < len(units) - 1:
            val /= 1024
            idx += 1
        if idx == 0:
            return f"{int(val)} {units[idx]}"
        return f"{val:.1f} {units[idx]}"


class ResearchTaskCommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField(read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    timeString = serializers.SerializerMethodField(read_only=True)
    body = serializers.CharField(max_length=2000)

    class Meta:
        model = ResearchTaskComment
        fields = ["id", "author", "body", "createdAt", "timeString"]
        read_only_fields = ["id", "author", "createdAt", "timeString"]

    def get_author(self, obj):
        try:
            name = obj.author.get_full_name() or obj.author.email
        except Exception:
            name = None
        return {
            "id": str(obj.author_id),
            "name": name,
            "avatar": _user_avatar_url(obj.author, self.context.get("request")),
        }

    def get_timeString(self, obj):
        try:
            return obj.created_at.strftime("%H:%M")
        except Exception:
            return None

    def validate_body(self, value):
        cleaned = sanitize_text(value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Comment body cannot be empty.")
        return cleaned


class ResearchTaskSerializer(serializers.ModelSerializer):
    """Full task representation matching the frontend Task Manager data shape."""

    researchId = serializers.SerializerMethodField(read_only=True)
    researchName = serializers.CharField(source="research.researchName", read_only=True)
    dueDate = serializers.DateField(source="due_date", allow_null=True, required=False)
    assignees = serializers.SerializerMethodField(read_only=True)
    attachments = ResearchTaskAttachmentSerializer(many=True, read_only=True)
    commentsCount = serializers.SerializerMethodField(read_only=True)
    createdBy = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ResearchTask
        fields = [
            "id",
            "title",
            "description",
            "urgency",
            "status",
            "dueDate",
            "researchId",
            "researchName",
            "assignees",
            "attachments",
            "commentsCount",
            "createdBy",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "researchId", "researchName", "assignees",
            "attachments", "commentsCount", "createdBy",
            "created_at", "updated_at",
        ]
        extra_kwargs = {
            "title": {"required": True, "min_length": 1, "max_length": 255},
            "description": {"required": False, "allow_blank": True, "max_length": 5000},
        }

    def get_researchId(self, obj):
        return str(obj.research_id)

    def get_assignees(self, obj):
        qs = obj.task_assignees.select_related("user").all()
        return ResearchTaskAssigneeSerializer(qs, many=True, context=self.context).data

    def get_commentsCount(self, obj):
        # Prefer prefetched annotation if present.
        if hasattr(obj, "_comments_count"):
            return obj._comments_count
        return obj.comments.count()

    def get_createdBy(self, obj):
        if not obj.created_by_id:
            return None
        try:
            return {
                "id": str(obj.created_by_id),
                "name": obj.created_by.get_full_name() or obj.created_by.email,
            }
        except Exception:
            return {"id": str(obj.created_by_id), "name": None}

    def to_internal_value(self, data):
        ret = super().to_internal_value(data)
        if "title" in ret and isinstance(ret["title"], str):
            ret["title"] = sanitize_text(ret["title"])
        if "description" in ret and isinstance(ret["description"], str):
            ret["description"] = sanitize_text(ret["description"])
        return ret

    def validate_title(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Title is required.")
        return value
