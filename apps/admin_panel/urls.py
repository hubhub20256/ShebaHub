from django.urls import path

from . import views

urlpatterns = [
    # Dashboard
    path("stats/", views.dashboard_stats, name="admin-stats"),

    # Research moderation (export BEFORE pk patterns to avoid URL conflict)
    path("researches/export/", views.export_researches_csv, name="admin-researches-export"),
    path("researches/bulk/", views.bulk_research_action, name="admin-researches-bulk"),
    path("researches/", views.list_researches, name="admin-researches"),
    path("researches/<int:pk>/approve/", views.approve_research, name="admin-research-approve"),
    path("researches/<int:pk>/reject/", views.reject_research, name="admin-research-reject"),
    path("researches/<int:pk>/flag/", views.flag_research, name="admin-research-flag"),
    path("researches/<int:pk>/soft-delete/", views.soft_delete_research, name="admin-research-soft-delete"),
    path("researches/<int:pk>/restore/", views.restore_research, name="admin-research-restore"),
    path("researches/<int:pk>/edit/", views.edit_research, name="admin-research-edit"),

    # User management (export BEFORE pk patterns)
    path("users/export/", views.export_users_csv, name="admin-users-export"),
    path("users/bulk/", views.bulk_user_action, name="admin-users-bulk"),
    path("users/", views.list_users, name="admin-users"),
    path("users/<uuid:pk>/", views.get_user, name="admin-user-detail"),
    path("users/<uuid:pk>/edit/", views.edit_user, name="admin-user-edit"),
    path("users/<uuid:pk>/deactivate/", views.deactivate_user, name="admin-user-deactivate"),
    path("users/<uuid:pk>/reactivate/", views.reactivate_user, name="admin-user-reactivate"),
    path("users/<uuid:pk>/force-verify/", views.force_verify_user, name="admin-user-force-verify"),

    # Audit logs
    path("logs/export/", views.export_logs_csv, name="admin-logs-export"),
    path("logs/", views.list_logs, name="admin-logs"),

    # Site settings
    path("settings/", views.site_settings, name="admin-settings"),

    # Announcements
    path("announcements/", views.list_announcements, name="admin-announcements"),
    path("announcements/create/", views.create_announcement, name="admin-announcement-create"),
    path("announcements/active/", views.active_announcements, name="admin-announcements-active"),
    path("announcements/<int:pk>/update/", views.update_announcement, name="admin-announcement-update"),
    path("announcements/<int:pk>/deactivate/", views.deactivate_announcement, name="admin-announcement-deactivate"),
    path("announcements/<int:pk>/dismiss/", views.dismiss_announcement, name="admin-announcement-dismiss"),

    # Applications
    path("applications/", views.list_applications, name="admin-applications"),
    path("applications/<int:pk>/override/", views.override_application, name="admin-application-override"),
]
