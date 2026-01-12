from django.urls import path

from .views import researches, research_detail, my_researches, my_research_detail

urlpatterns = [
    path("", researches, name="researches"),
    path("<int:research_id>/", research_detail, name="research-detail"),
    path("me/", my_researches, name="my-researches"),
    path("me/<int:research_id>/", my_research_detail, name="my-research-detail"),
]
