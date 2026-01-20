from rest_framework import serializers

from apps.profiles.models import StudentProfile

from .models import Research, ResearchApplication


class ResearchSerializer(serializers.ModelSerializer):
    contractUrl = serializers.SerializerMethodField(read_only=True)
    contractFileName = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Research
        fields = [
            "id",
            "researchName",
            "description",
            "researchArea",
            "mentors",
            "teamSize",
            "startDate",
            "weeklyHours",
            "durationWeeks",
            "compensation",
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
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "contractUrl", "contractFileName"]

    def get_contractUrl(self, obj):
        if not obj.contract:
            return None
        request = self.context.get("request")
        url = obj.contract.url
        return request.build_absolute_uri(url) if request else url

    def get_contractFileName(self, obj):
        if not obj.contract:
            return None
        try:
            return obj.contract.name.split("/")[-1]
        except Exception:
            return None


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
            "weeklyHours",
            "durationWeeks",
            "compensation",
            "workMode",
            "requirements",
            "skillsAndTools",
            "output",
            "location",
            "status",
            "helsinkiApproval",
            "dataType",
            "contract",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")
        return Research.objects.create(owner=request.user, **validated_data)


class ResearchApplicationSerializer(serializers.ModelSerializer):
    applicantId = serializers.SerializerMethodField(read_only=True)
    applicantProfileId = serializers.SerializerMethodField(read_only=True)
    name = serializers.SerializerMethodField(read_only=True)
    email = serializers.SerializerMethodField(read_only=True)
    gender = serializers.SerializerMethodField(read_only=True)
    apprenticeStage = serializers.SerializerMethodField(read_only=True)
    startYear = serializers.SerializerMethodField(read_only=True)
    institution = serializers.SerializerMethodField(read_only=True)
    avatarUrl = serializers.SerializerMethodField(read_only=True)
    researchAvailability = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ResearchApplication
        fields = [
            "id",
            "status",
            "created_at",
            "updated_at",
            "applicantId",
            "applicantProfileId",
            "name",
            "email",
            "gender",
            "apprenticeStage",
            "startYear",
            "institution",
            "avatarUrl",
            "researchAvailability",
        ]
        read_only_fields = fields

    def get_applicantId(self, obj):
        return str(getattr(obj.applicant, "id", ""))

    def get_applicantProfileId(self, obj):
        profile = self._get_student_profile(obj)
        return str(profile.id) if profile else None

    def _get_student_profile(self, obj):
        try:
            return StudentProfile.objects.select_related(
                "institution",
                "apprenticeStage",
            ).get(user=obj.applicant)
        except StudentProfile.DoesNotExist:
            return None

    def get_name(self, obj):
        try:
            return obj.applicant.get_full_name()
        except Exception:
            return None

    def get_email(self, obj):
        return getattr(obj.applicant, "email", None)

    def get_gender(self, obj):
        value = getattr(obj.applicant, "gender", None)
        if value == "man":
            return "זכר"
        if value == "woman":
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
        if not profile or not profile.institution:
            return None
        return profile.institution.name_he or profile.institution.name

    def get_avatarUrl(self, obj):
        profile = self._get_student_profile(obj)
        if not profile or not profile.avatar:
            return None
        request = self.context.get("request")
        url = profile.avatar.url
        return request.build_absolute_uri(url) if request else url

    def get_researchAvailability(self, obj):
        profile = self._get_student_profile(obj)
        if not profile:
            return None
        return bool(getattr(profile, "isAvailableForResearch", False))
