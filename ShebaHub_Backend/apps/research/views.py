from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Research
from .serializers import ResearchSerializer, ResearchCreateSerializer
from .permissions import require_mentor


def _is_truthy(value) -> bool:
    if value is True:
        return True
    if value is False or value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


@api_view(["GET"])
@permission_classes([AllowAny])
def researches(request):
    """GET /api/v1/research/ -> list all researches (public read)"""
    qs = Research.objects.all().order_by("-created_at")
    return Response(ResearchSerializer(qs, many=True, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def research_detail(request, research_id: int):
    """GET /api/v1/research/<id>/ -> get one research (public read)"""
    try:
        obj = Research.objects.get(id=research_id)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response(ResearchSerializer(obj, context={"request": request}).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def my_researches(request):
    """
    GET  /api/v1/research/me/       -> list current user's researches
    POST /api/v1/research/me/       -> create research for current user (supports multipart for contract)
    """
    deny = require_mentor(request)
    if deny is not None:
        return deny

    if request.method == "GET":
        qs = Research.objects.filter(owner=request.user).order_by("-created_at")
        return Response(ResearchSerializer(qs, many=True, context={"request": request}).data)

    serializer = ResearchCreateSerializer(data=request.data, context={"request": request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    obj = serializer.save()
    return Response(ResearchSerializer(obj, context={"request": request}).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def my_research_detail(request, research_id: int):
    """GET/PATCH/DELETE /api/v1/research/me/<id>/ -> get/update/delete one research owned by current user"""
    deny = require_mentor(request)
    if deny is not None:
        return deny

    try:
        obj = Research.objects.get(id=research_id, owner=request.user)
    except Research.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(ResearchSerializer(obj, context={"request": request}).data)

    if request.method == "PATCH":
        remove_contract = _is_truthy(request.data.get("remove_contract"))
        has_new_contract = "contract" in getattr(request, "FILES", {})

        data = request.data.copy()
        try:
            data.pop("remove_contract", None)
        except Exception:
            pass

        serializer = ResearchCreateSerializer(
            obj,
            data=data,
            partial=True,
            context={"request": request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        obj = serializer.save()

        if remove_contract and not has_new_contract:
            try:
                if obj.contract:
                    obj.contract.delete(save=False)
                    obj.contract = None
                    obj.save(update_fields=["contract"])
            except Exception:
                pass

        return Response(ResearchSerializer(obj, context={"request": request}).data)

    # DELETE
    # Best-effort: delete contract file from storage as well.
    try:
        if obj.contract:
            obj.contract.delete(save=False)
    except Exception:
        pass

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
