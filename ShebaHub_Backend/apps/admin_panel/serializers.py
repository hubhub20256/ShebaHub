from rest_framework import serializers
from django.contrib.auth import get_user_model

from apps.common.utils import sanitize_text
from apps.research.models import Research, ResearchApplication
from .models import AdminActionLog, AnnouncementDismissal, SiteSetting, SystemAnnouncement

User = get_user_model()


class AdminResearchSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Research
        fields = [
            "id",
            "researchName",
            "description",
            "owner",
            "owner_email",
            "owner_name",
            "researchArea",
            "mentors",
            "status",
            "accepting_applications",
            "moderation_status",
            "moderation_note",
            "location",
            "workMode",
            "requirements",
            "skillsAndTools",
            "output",
            "compensation",
            "helsinkiApproval",
            "dataType",
            "teamSize",
            "weeklyHours",
            "durationMonths",
            "startDate",
            "estimatedCompletionDate",
            "is_deleted",
            "created_at",
            "updated_at",
        ]

    def get_owner_name(self, obj):
        owner = obj.owner
        return f"{owner.firstName} {owner.lastName}".strip() or owner.email


class AdminResearchEditSerializer(serializers.ModelSerializer):
    """Partial-update serializer for admin research editing."""

    TEXT_FIELDS = [
        "researchName", "description", "researchArea", "mentors",
        "requirements", "skillsAndTools", "output", "location",
        "compensation", "moderation_note",
    ]

    class Meta:
        model = Research
        fields = [
            "researchName", "description", "researchArea", "mentors",
            "status", "accepting_applications",
            "moderation_status", "moderation_note",
            "location", "workMode",
            "requirements", "skillsAndTools", "output",
            "compensation", "helsinkiApproval", "dataType",
            "teamSize",
            "weeklyHours", "durationWeeks",
            "startDate", "estimatedCompletionDate",
        ]

    def validate(self, attrs):
        for field in self.TEXT_FIELDS:
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = sanitize_text(attrs[field])
        return attrs


class AdminUserSerializer(serializers.ModelSerializer):
    has_student_profile = serializers.BooleanField(read_only=True)
    has_mentor_profile = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "firstName",
            "lastName",
            "is_active",
            "is_staff",
            "is_superuser",
            "email_verified",
            "has_student_profile",
            "has_mentor_profile",
            "date_joined",
            "last_login",
        ]


class AdminActionLogSerializer(serializers.ModelSerializer):
    admin_email = serializers.EmailField(source="admin.email", read_only=True, default=None)
    target_user_email = serializers.EmailField(
        source="target_user.email", read_only=True, default=None
    )

    class Meta:
        model = AdminActionLog
        fields = [
            "id",
            "admin",
            "admin_email",
            "action_type",
            "target_user",
            "target_user_email",
            "target_research_id",
            "note",
            "details",
            "created_at",
        ]


class SiteSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSetting
        fields = [
            "max_applications_per_student",
            "max_applications_per_research",
            "default_moderation_status",
            "contact_message_max_length",
            "mentor_note_max_length",
            "applications_globally_enabled",
            "registration_enabled",
            "student_registration_enabled",
            "mentor_registration_enabled",
            "require_email_verification_to_apply",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def validate_contact_message_max_length(self, value):
        if not (100 <= value <= 10000):
            raise serializers.ValidationError("Must be between 100 and 10000.")
        return value

    def validate_mentor_note_max_length(self, value):
        if not (100 <= value <= 5000):
            raise serializers.ValidationError("Must be between 100 and 5000.")
        return value


class DashboardStatsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    deactivated_users = serializers.IntegerField()
    unverified_emails = serializers.IntegerField()
    total_researches = serializers.IntegerField()
    pending_researches = serializers.IntegerField()
    flagged_researches = serializers.IntegerField()
    deleted_researches = serializers.IntegerField()
    total_applications = serializers.IntegerField()
    pending_applications = serializers.IntegerField()
    active_announcements = serializers.IntegerField()
    registered_students = serializers.IntegerField()
    registered_mentors = serializers.IntegerField()


class SystemAnnouncementSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True, default=None)
    dismissal_count = serializers.IntegerField(read_only=True, default=0)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)

    class Meta:
        model = SystemAnnouncement
        fields = [
            "id", "title", "body", "audience", "priority",
            "is_active", "expires_at", "created_by", "created_by_email",
            "dismissal_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class ActiveAnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemAnnouncement
        fields = ["id", "title", "body", "priority", "created_at"]
        read_only_fields = fields


class AdminUserEditSerializer(serializers.Serializer):
    firstName = serializers.CharField(max_length=150, required=False)
    lastName = serializers.CharField(max_length=150, required=False)
    gender = serializers.ChoiceField(choices=["man", "woman", "other"], required=False, allow_null=True)
    is_staff = serializers.BooleanField(required=False)
    email_verified = serializers.BooleanField(required=False)
    is_active = serializers.BooleanField(required=False)

    def validate_firstName(self, value):
        return sanitize_text(value)

    def validate_lastName(self, value):
        return sanitize_text(value)


class AdminApplicationSerializer(serializers.ModelSerializer):
    research_name = serializers.CharField(source="research.researchName", read_only=True)
    applicant_email = serializers.EmailField(source="applicant.email", read_only=True)
    applicant_name = serializers.SerializerMethodField()

    class Meta:
        model = ResearchApplication
        fields = [
            "id", "research_id", "research_name",
            "applicant_id", "applicant_email", "applicant_name",
            "status", "mentor_note", "created_at", "updated_at",
        ]

    def get_applicant_name(self, obj):
        u = obj.applicant
        return f"{u.firstName} {u.lastName}".strip() or u.email
