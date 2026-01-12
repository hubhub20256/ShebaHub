from rest_framework import serializers

from .models import Research


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
