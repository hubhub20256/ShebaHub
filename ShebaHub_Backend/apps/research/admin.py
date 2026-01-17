from django.contrib import admin

from .models import Research, ResearchApplication


@admin.register(Research)
class ResearchAdmin(admin.ModelAdmin):
    list_display = ("id", "researchName", "owner", "status", "startDate", "created_at")
    search_fields = ("researchName", "description", "owner__email")
    list_filter = ("status", "workMode", "compensation")


@admin.register(ResearchApplication)
class ResearchApplicationAdmin(admin.ModelAdmin):
    list_display = ("id", "research", "applicant", "status", "created_at")
    search_fields = ("research__researchName", "applicant__email")
    list_filter = ("status",)
