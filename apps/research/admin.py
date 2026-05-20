from django.contrib import admin

from .models import (
    Research,
    ResearchApplication,
    ResearchTask,
    ResearchTaskAssignee,
    ResearchTaskAttachment,
    ResearchTaskComment,
)


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


class ResearchTaskAssigneeInline(admin.TabularInline):
    model = ResearchTaskAssignee
    extra = 0


class ResearchTaskAttachmentInline(admin.TabularInline):
    model = ResearchTaskAttachment
    extra = 0
    readonly_fields = ("file_name", "size", "uploaded_by", "created_at")


@admin.register(ResearchTask)
class ResearchTaskAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "research", "status", "urgency", "due_date", "created_by", "created_at")
    list_filter = ("status", "urgency")
    search_fields = ("title", "description", "research__researchName")
    readonly_fields = ("created_at", "updated_at")
    inlines = [ResearchTaskAssigneeInline, ResearchTaskAttachmentInline]


@admin.register(ResearchTaskComment)
class ResearchTaskCommentAdmin(admin.ModelAdmin):
    list_display = ("id", "task", "author", "created_at")
    search_fields = ("body", "task__title", "author__email")
