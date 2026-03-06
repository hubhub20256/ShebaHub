from django.contrib import admin

from .models import Research, ResearchApplication


@admin.register(Research)
class ResearchAdmin(admin.ModelAdmin):
    list_display = ("id", "researchName", "owner", "status", "moderation_status", "startDate", "created_at")
    search_fields = ("researchName", "description", "owner__email")
    list_filter = ("status", "moderation_status", "workMode", "compensation")
    list_editable = ("moderation_status",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(ResearchApplication)
class ResearchApplicationAdmin(admin.ModelAdmin):
    list_display = ("id", "research", "applicant", "status", "created_at")
    search_fields = ("research__researchName", "applicant__email")
    list_filter = ("status",)
