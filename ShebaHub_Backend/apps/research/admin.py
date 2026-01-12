from django.contrib import admin

from .models import Research


@admin.register(Research)
class ResearchAdmin(admin.ModelAdmin):
    list_display = ("id", "researchName", "owner", "status", "startDate", "created_at")
    search_fields = ("researchName", "description", "owner__email")
    list_filter = ("status", "workMode", "compensation")
