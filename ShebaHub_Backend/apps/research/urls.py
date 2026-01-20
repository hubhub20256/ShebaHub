from django.urls import path

from .views import (
    researches,
    research_detail,
    my_researches,
    my_research_detail,
    apply_to_research,
    cancel_my_application,
    my_research_applications,
    approve_application,
    reject_application,
    my_application_status,
    research_approved_applicants,
    my_joined_researches,
)

urlpatterns = [
    path("", researches, name="researches"),
    path("joined/", my_joined_researches, name="my-joined-researches"),
    path("<int:research_id>/", research_detail, name="research-detail"),
    path(
        "<int:research_id>/approved-applicants/",
        research_approved_applicants,
        name="research-approved-applicants",
    ),
    path("<int:research_id>/apply/", apply_to_research, name="research-apply"),
    path("<int:research_id>/cancel/", cancel_my_application, name="research-cancel"),
    path("<int:research_id>/my-application/", my_application_status, name="research-my-application"),
    path("me/", my_researches, name="my-researches"),
    path("me/<int:research_id>/", my_research_detail, name="my-research-detail"),
    path("me/<int:research_id>/applications/", my_research_applications, name="my-research-applications"),
    path(
        "me/<int:research_id>/applications/<int:application_id>/approve/",
        approve_application,
        name="research-application-approve",
    ),
    path(
        "me/<int:research_id>/applications/<int:application_id>/reject/",
        reject_application,
        name="research-application-reject",
    ),
]
