from rest_framework import serializers

from .models import SavedItem


class SavedItemSerializer(serializers.ModelSerializer):
    contentType = serializers.CharField(source='content_type')
    objectId = serializers.CharField(source='object_id')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = SavedItem
        fields = ['id', 'contentType', 'objectId', 'createdAt']
        read_only_fields = ['id', 'createdAt']


class SavedItemCreateSerializer(serializers.Serializer):
    contentType = serializers.ChoiceField(choices=SavedItem.ContentType.choices)
    objectId = serializers.CharField(max_length=255)
