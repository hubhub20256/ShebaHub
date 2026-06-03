from django.contrib import admin
from .models import SavedItem


@admin.register(SavedItem)
class SavedItemAdmin(admin.ModelAdmin):
    list_display = ('user', 'content_type', 'object_id', 'created_at')
    list_filter = ('content_type',)
    search_fields = ('user__email',)
    readonly_fields = ('created_at',)
