from django.db import IntegrityError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.profiles.models import MentorProfile, StudentProfile
from apps.research.models import Research

from .models import SavedItem
from .serializers import SavedItemCreateSerializer, SavedItemSerializer


def _target_exists(content_type, object_id):
    """Validate that the target object exists."""
    try:
        if content_type == SavedItem.ContentType.RESEARCH:
            return Research.objects.filter(pk=int(object_id)).exists()
        elif content_type == SavedItem.ContentType.MENTOR_PROFILE:
            return MentorProfile.objects.filter(pk=object_id).exists()
        elif content_type == SavedItem.ContentType.STUDENT_PROFILE:
            return StudentProfile.objects.filter(pk=object_id).exists()
    except (ValueError, TypeError):
        return False
    return False


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def saved_items_list(request):
    """
    GET:  List the authenticated user's saved items.
          Optional ?type= filter (research, mentor_profile, student_profile).
    POST: Save an item. Returns 201 or 409 on duplicate.
    """
    if request.method == "GET":
        qs = SavedItem.objects.filter(user=request.user)
        type_filter = request.query_params.get("type")
        if type_filter:
            qs = qs.filter(content_type=type_filter)
        serializer = SavedItemSerializer(qs, many=True)
        return Response(serializer.data)

    # POST
    serializer = SavedItemCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    content_type = serializer.validated_data["contentType"]
    object_id = serializer.validated_data["objectId"]

    if not _target_exists(content_type, object_id):
        return Response(
            {"detail": "Target not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        item = SavedItem.objects.create(
            user=request.user,
            content_type=content_type,
            object_id=object_id,
        )
    except IntegrityError:
        return Response(
            {"detail": "Item already saved."},
            status=status.HTTP_409_CONFLICT,
        )

    return Response(
        SavedItemSerializer(item).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def saved_item_detail(request, pk):
    """Delete a saved item. Only the owner can delete."""
    try:
        item = SavedItem.objects.get(pk=pk, user=request.user)
    except SavedItem.DoesNotExist:
        return Response(
            {"detail": "Saved item not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    item.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
