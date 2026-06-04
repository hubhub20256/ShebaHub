from django.urls import path

from . import views

urlpatterns = [
    path("", views.saved_items_list, name="saved-items-list"),
    path("<int:pk>/", views.saved_item_detail, name="saved-item-detail"),
]
