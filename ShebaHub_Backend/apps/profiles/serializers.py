"""
Serializers for the profiles app.

This module provides serializers for:
- StudentProfile CRUD operations
- MentorProfile CRUD operations
- Reference data (dropdowns)
- Profile documents
- Professional recommendations

Field names match Frontend (camelCase).
Serializers handle conversion from Frontend text values to Backend IDs.
"""

from datetime import date
from rest_framework import serializers
# Only allow a constrained set of academic degree names from the frontend
# (prevents unsupported options like Post-Doc/"התמחות" from being saved).
ALLOWED_DEGREE_NAMES = {"MD", "PhD", "MSc", "MPH", "MBA"}


def _validate_degree_names_input(data):
    degrees = data.get('degrees') if isinstance(data, dict) else None
    if degrees is None:
        return
    if not isinstance(degrees, list):
        return
    invalid = [d for d in degrees if d not in ALLOWED_DEGREE_NAMES]
    if invalid:
        raise serializers.ValidationError({
            'degrees': f"Unsupported degree(s): {', '.join(invalid)}"
        })


from .models import (
    StudentProfile,
    MentorProfile,
    ProfileDocument,
    ProfessionalRecommendation,
    # Reference models
    Institution,
    Degree,
    AcademicRank,
    MedicalTrainingStage,
    SpecialtyGroup,
    Specialty,
    ResearchInterest,
    WorkType,
    ParticipationMode,
    ProfessionalExperience,
    CompensationPreference,
)


# =============================================================================
# CUSTOM FIELDS
# =============================================================================

class HebrewBooleanField(serializers.BooleanField):
    """
    A BooleanField that accepts Hebrew כן/לא in addition to standard boolean values.
    """
    
    def to_internal_value(self, data):
        # Handle boolean directly
        if isinstance(data, bool):
            return data
        
        # Handle None
        if data is None:
            if self.allow_null:
                return None
            self.fail('null')
        
        # Handle strings
        if isinstance(data, str):
            data_stripped = data.strip()
            # Hebrew yes/no
            if data_stripped == 'כן':
                return True
            if data_stripped == 'לא':
                return False
            # English/standard values
            if data_stripped.lower() in ('yes', 'true', '1', 'on', 't', 'y'):
                return True
            if data_stripped.lower() in ('no', 'false', '0', 'off', 'f', 'n', ''):
                return False
        
        # Handle numbers
        if data == 1:
            return True
        if data == 0:
            return False
        self.fail('invalid', input=data)


# =============================================================================
# HELPER FUNCTIONS FOR CONVERSIONS
# =============================================================================

def convert_yes_no_to_bool(value):
    """
    Convert Hebrew yes/no strings to boolean.
    כן → True, לא → False
    Also handles English yes/no and boolean values.
    """
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        value_lower = value.strip().lower()
        if value_lower in ('כן', 'yes', 'true', '1'):
            return True
        if value_lower in ('לא', 'no', 'false', '0', ''):
            return False
    return bool(value)


def get_reference_by_name(model_class, name_value):
    """
    Look up a reference table entry by name or name_he.
    Returns the instance or None if not found.
    """
    if not name_value:
        return None
    
    # If it's already an int (ID), return the object
    if isinstance(name_value, int):
        try:
            return model_class.objects.get(id=name_value, is_active=True)
        except model_class.DoesNotExist:
            return None
    
    # Try to find by name or name_he
    name_value = str(name_value).strip()
    try:
        return model_class.objects.get(
            models.Q(name__iexact=name_value) | models.Q(name_he__iexact=name_value),
            is_active=True
        )
    except model_class.DoesNotExist:
        return None
    except model_class.MultipleObjectsReturned:
        # Return the first match
        return model_class.objects.filter(
            models.Q(name__iexact=name_value) | models.Q(name_he__iexact=name_value),
            is_active=True
        ).first()


# Need to import models.Q for the query
from django.db import models as django_models


def get_reference_by_name(model_class, name_value):
    """
    Look up a reference table entry by name or name_he.
    Returns the instance or None if not found.
    """
    if not name_value:
        return None
    
    # If it's already an int (ID), return the object
    if isinstance(name_value, int):
        try:
            return model_class.objects.get(id=name_value, is_active=True)
        except model_class.DoesNotExist:
            return None
    
    # Try to find by name or name_he
    name_value = str(name_value).strip()
    try:
        return model_class.objects.get(
            django_models.Q(name__iexact=name_value) | django_models.Q(name_he__iexact=name_value),
            is_active=True
        )
    except model_class.DoesNotExist:
        pass
    except model_class.MultipleObjectsReturned:
        # Return the first match
        return model_class.objects.filter(
            django_models.Q(name__iexact=name_value) | django_models.Q(name_he__iexact=name_value),
            is_active=True
        ).first()

    # אם לא נמצא ערך פעיל, צור ערך חדש כדי שלא לאבד נתונים מהפרונט
    obj, _ = model_class.objects.get_or_create(
        name=name_value,
        defaults={'name_he': name_value, 'is_active': True}
    )
    return obj


# =============================================================================
# REFERENCE DATA SERIALIZERS
# =============================================================================

class ReferenceSerializer(serializers.Serializer):
    """Base serializer for all reference/dropdown data."""
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    name_he = serializers.CharField(read_only=True)


class InstitutionSerializer(ReferenceSerializer):
    class Meta:
        model = Institution
        fields = ['id', 'name', 'name_he']


class DegreeSerializer(ReferenceSerializer):
    class Meta:
        model = Degree
        fields = ['id', 'name', 'name_he']


class AcademicRankSerializer(ReferenceSerializer):
    class Meta:
        model = AcademicRank
        fields = ['id', 'name', 'name_he']


class MedicalTrainingStageSerializer(ReferenceSerializer):
    class Meta:
        model = MedicalTrainingStage
        fields = ['id', 'name', 'name_he']


class SpecialtySerializer(ReferenceSerializer):
    group_id = serializers.IntegerField(source='group.id', read_only=True, allow_null=True)
    group_name = serializers.CharField(source='group.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Specialty
        fields = ['id', 'name', 'name_he', 'group_id', 'group_name']


class SpecialtyGroupSerializer(ReferenceSerializer):
    specialties = SpecialtySerializer(many=True, read_only=True)
    
    class Meta:
        model = SpecialtyGroup
        fields = ['id', 'name', 'name_he', 'specialties']


class ResearchInterestSerializer(ReferenceSerializer):
    class Meta:
        model = ResearchInterest
        fields = ['id', 'name', 'name_he']


class WorkTypeSerializer(ReferenceSerializer):
    class Meta:
        model = WorkType
        fields = ['id', 'name', 'name_he']


class ParticipationModeSerializer(ReferenceSerializer):
    class Meta:
        model = ParticipationMode
        fields = ['id', 'name', 'name_he']


class ProfessionalExperienceSerializer(ReferenceSerializer):
    class Meta:
        model = ProfessionalExperience
        fields = ['id', 'name', 'name_he']


class CompensationPreferenceSerializer(ReferenceSerializer):
    class Meta:
        model = CompensationPreference
        fields = ['id', 'name', 'name_he']


# =============================================================================
# PROFESSIONAL RECOMMENDATION SERIALIZER
# =============================================================================

class ProfessionalRecommendationSerializer(serializers.ModelSerializer):
    """Serializer for professional recommendations."""
    
    class Meta:
        model = ProfessionalRecommendation
        fields = [
            'id',
            'recommender_name',
            'recommender_email',
            'recommender_title',
            'recommender_institution',
            'relationship',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# =============================================================================
# PROFILE DOCUMENT SERIALIZER
# =============================================================================

class ProfileDocumentSerializer(serializers.ModelSerializer):
    """Serializer for profile documents (read operations)."""
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProfileDocument
        fields = [
            'id',
            'file',
            'file_url',
            'original_filename',
            'document_type',
            'description',
            'uploaded_at',
        ]
        read_only_fields = ['id', 'uploaded_at', 'file_url']
    
    def get_file_url(self, obj):
        """Return the full URL for the file."""
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class ProfileDocumentUploadSerializer(serializers.Serializer):
    """
    Serializer for uploading profile documents with validation.
    
    Validates:
    - File extension (pdf, doc, docx, jpg, jpeg, png)
    - File size (max 10MB by default)
    """
    file = serializers.FileField(required=True)
    document_type = serializers.ChoiceField(
        choices=ProfileDocument.DocumentType.choices,
        default=ProfileDocument.DocumentType.OTHER
    )
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    
    def validate_file(self, value):
        """Validate file extension and size."""
        import os
        from django.conf import settings
        
        # Get allowed extensions from settings
        allowed_extensions = getattr(
            settings, 
            'ALLOWED_DOCUMENT_EXTENSIONS', 
            ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
        )
        max_size_mb = getattr(settings, 'MAX_DOCUMENT_SIZE_MB', 10)
        max_size_bytes = max_size_mb * 1024 * 1024
        
        # Validate extension
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"File type '{ext}' is not allowed. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Validate file size
        if value.size > max_size_bytes:
            raise serializers.ValidationError(
                f"File size ({value.size / (1024*1024):.2f} MB) exceeds maximum allowed size ({max_size_mb} MB)."
            )
        
        return value


# =============================================================================
# STUDENT PROFILE SERIALIZERS
# =============================================================================

class StudentProfileSerializer(serializers.ModelSerializer):
    """
    Full serializer for StudentProfile with nested reference data for reads.
    Field names match Frontend (camelCase).
    Handles conversion from Frontend text values to Backend objects.
    """
    
    # Nested serializers for read operations
    institution_detail = InstitutionSerializer(source='institution', read_only=True)
    degrees_detail = DegreeSerializer(source='degrees', many=True, read_only=True)
    apprenticeStage_detail = MedicalTrainingStageSerializer(
        source='apprenticeStage', read_only=True
    )
    specialtyGroup_detail = SpecialtyGroupSerializer(source='specialtyGroup', read_only=True)
    specialty_detail = SpecialtySerializer(source='specialty', read_only=True)
    workType_detail = WorkTypeSerializer(source='workType', read_only=True)
    participationMode_detail = ParticipationModeSerializer(
        source='participationMode', read_only=True
    )
    compensationPreference_detail = CompensationPreferenceSerializer(
        source='compensationPreference', read_only=True
    )
    
    # Nested documents and recommendations
    documents = ProfileDocumentSerializer(many=True, read_only=True)
    recommendations = ProfessionalRecommendationSerializer(many=True, read_only=True)
    
    # Write fields - accept both IDs and text values
    institution = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    # For writes we accept a simple list of degree names; for reads we rely on degrees_detail
    degrees = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        write_only=True
    )
    apprenticeStage = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    specialtyGroup = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    specialty = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    workType = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    participationMode = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    compensationPreference = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    
    # Boolean fields - accept כן/לא strings or boolean values
    isShebaEmployee = HebrewBooleanField(required=False, allow_null=True)
    hasResearchExperience = HebrewBooleanField(required=False, allow_null=True)
    isAvailableForResearch = HebrewBooleanField(required=False, allow_null=True)
    
    # Avatar URL for reading
    avatarUrl = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = StudentProfile
        fields = [
            # ID and metadata
            'id',
            'created_at',
            'updated_at',
            'avatarUrl',
            
            # Basic study info (שלב הכשרה)
            'apprenticeStage',
            'apprenticeStage_detail',
            'startYear',
            'yearOfStudy',
            'institution',
            'institution_detail',
            'degrees',
            'degrees_detail',
            'specialtyGroup',
            'specialtyGroup_detail',
            'specialty',
            'specialty_detail',
            'workplace',
            'isShebaEmployee',
            
            # Research experience (ניסיון במחקר)
            'hasResearchExperience',
            'researchExperienceDetails',
            
            # Research & Availability (מחקר וזמינות)
            'workType',
            'workType_detail',
            'compensationPreference',
            'compensationPreference_detail',
            'participationMode',
            'participationMode_detail',
            'isAvailableForResearch',
            'weeklyHours',
            'startDate',
            'softwareSkills',
            'professionalExperience',
            
            # Additional details (פרטים נוספים)
            'personalAcademicDescription',
            'recommendationRequest',
            
            # Nested relations
            'documents',
            'recommendations',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def to_internal_value(self, data):
        """
        Convert Frontend text values to Backend objects before validation.
        """
        _validate_degree_names_input(data)
        # Note: Boolean fields (כן/לא) are handled by HebrewBooleanField directly
        
        # Convert reference fields from text to objects
        reference_mappings = {
            'institution': Institution,
            'apprenticeStage': MedicalTrainingStage,
            'specialtyGroup': SpecialtyGroup,
            'specialty': Specialty,
            'workType': WorkType,
            'participationMode': ParticipationMode,
            'compensationPreference': CompensationPreference,
        }
        
        for field_name, model_class in reference_mappings.items():
            if field_name in data and data[field_name]:
                obj = get_reference_by_name(model_class, data[field_name])
                data[field_name] = obj.id if obj else None
        
        # Convert degrees list from text to IDs
        if 'degrees' in data and data['degrees']:
            degree_ids = []
            for deg_name in data['degrees']:
                obj = get_reference_by_name(Degree, deg_name)
                if obj:
                    degree_ids.append(obj.id)
            data['degrees'] = degree_ids
        
        return super().to_internal_value(data)
    
    def validate_startYear(self, value):
        """Validate startYear is in reasonable range."""
        if value is not None:
            # Convert string to int if needed
            if isinstance(value, str):
                try:
                    value = int(value)
                except ValueError:
                    raise serializers.ValidationError("startYear must be a number")
            
            current_year = date.today().year
            if value < 1990 or value > current_year + 1:
                raise serializers.ValidationError(
                    f"startYear must be between 1990 and {current_year + 1}"
                )
        return value
    
    def validate_weeklyHours(self, value):
        """Validate weeklyHours is between 1 and 60."""
        if value is not None:
            # Convert string to int if needed
            if isinstance(value, str):
                try:
                    value = int(value)
                except ValueError:
                    raise serializers.ValidationError("weeklyHours must be a number")
            
            if value < 1 or value > 60:
                raise serializers.ValidationError(
                    "weeklyHours must be between 1 and 60"
                )
        return value
    
    def validate(self, attrs):
        """
        Cross-field validation.
        If hasResearchExperience is True, researchExperienceDetails is required.
        """
        has_experience = attrs.get('hasResearchExperience')
        details = attrs.get('researchExperienceDetails', '')
        
        # For partial updates, check current instance values
        if self.instance:
            if has_experience is None:
                has_experience = self.instance.hasResearchExperience
            if not details:
                details = self.instance.researchExperienceDetails
        
        if has_experience and not details:
            raise serializers.ValidationError({
                'researchExperienceDetails': 
                    'This field is required when hasResearchExperience is True.'
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create profile with M2M degrees handling."""
        degrees_data = validated_data.pop('degrees', [])
        
        # Convert FK IDs to objects
        for fk_field in ['institution', 'apprenticeStage', 'specialtyGroup', 
                         'specialty', 'workType', 'participationMode', 'compensationPreference']:
            if fk_field in validated_data and validated_data[fk_field]:
                fk_id = validated_data[fk_field]
                model_class = self.Meta.model._meta.get_field(fk_field).related_model
                try:
                    validated_data[fk_field] = model_class.objects.get(id=fk_id)
                except model_class.DoesNotExist:
                    validated_data[fk_field] = None
        
        profile = StudentProfile.objects.create(**validated_data)
        
        if degrees_data:
            degree_objects = Degree.objects.filter(id__in=degrees_data)
            profile.degrees.set(degree_objects)
        
        return profile
    
    def update(self, instance, validated_data):
        """Update profile with M2M degrees handling."""
        degrees_data = validated_data.pop('degrees', None)
        
        # Convert FK IDs to objects
        for fk_field in ['institution', 'apprenticeStage', 'specialtyGroup', 
                         'specialty', 'workType', 'participationMode', 'compensationPreference']:
            if fk_field in validated_data:
                fk_id = validated_data[fk_field]
                if fk_id:
                    model_class = self.Meta.model._meta.get_field(fk_field).related_model
                    try:
                        validated_data[fk_field] = model_class.objects.get(id=fk_id)
                    except model_class.DoesNotExist:
                        validated_data[fk_field] = None
                else:
                    validated_data[fk_field] = None
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if degrees_data is not None:
            degree_objects = Degree.objects.filter(id__in=degrees_data)
            instance.degrees.set(degree_objects)
        
        return instance
    
    def get_avatarUrl(self, obj):
        """Return full URL for avatar image."""
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class StudentProfileCreateSerializer(StudentProfileSerializer):
    """
    Serializer specifically for creating a new StudentProfile.
    Ensures user cannot be set from request body.
    """
    
    def create(self, validated_data):
        """Create profile, attaching to request.user."""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Authentication required.")
        
        validated_data['user'] = request.user
        return super().create(validated_data)


# =============================================================================
# MENTOR PROFILE SERIALIZERS
# =============================================================================

class MentorProfileSerializer(serializers.ModelSerializer):
    """
    Full serializer for MentorProfile with nested reference data for reads.
    Field names match Frontend (camelCase).
    Handles conversion from Frontend text values to Backend objects.
    """
    
    # Nested serializers for read operations
    academicRank_detail = AcademicRankSerializer(source='academicRank', read_only=True)
    specialtyGroup_detail = SpecialtyGroupSerializer(source='specialtyGroup', read_only=True)
    specialty_detail = SpecialtySerializer(source='specialty', read_only=True)
    researchInterests_detail = ResearchInterestSerializer(
        source='researchInterests', read_only=True
    )
    institution_detail = InstitutionSerializer(source='institution', read_only=True)
    degrees_detail = DegreeSerializer(source='degrees', many=True, read_only=True)
    
    # Nested documents and recommendations
    documents = ProfileDocumentSerializer(many=True, read_only=True)
    recommendations = ProfessionalRecommendationSerializer(many=True, read_only=True)
    
    # Write fields - accept both IDs and text values
    academicRank = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    specialtyGroup = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    specialty = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    researchInterests = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    institution = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    
    # Write-only field for accepting degree names from frontend
    degrees = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        write_only=True
    )
    
    # Boolean field - accept כן/לא strings or boolean values
    hasMentoringExperience = HebrewBooleanField(required=True)
    
    # Avatar URL for reading
    avatarUrl = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = MentorProfile
        fields = [
            # ID and metadata
            'id',
            'created_at',
            'updated_at',
            'avatarUrl',
            
            # שלב הכשרה (Academic/Professional Info)
            'academicRank',
            'academicRank_detail',
            'specialtyGroup',
            'specialtyGroup_detail',
            'specialty',
            'specialty_detail',
            'institution',
            'institution_detail',
            'degrees',
            'degrees_detail',
            'workplace',
            
            # ניסיון בחניכה (Mentoring Experience)
            'hasMentoringExperience',
            'mentoringExperienceDetails',
            
            # מחקר (Research)
            'researchInterests',
            'researchInterests_detail',
            'previousResearchDescription',
            
            # פרטים נוספים (Additional Details)
            'personalAcademicDescription',
            'recommendationRequest',
            
            # Nested relations
            'documents',
            'recommendations',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def to_internal_value(self, data):
        """
        Convert Frontend text values to Backend objects before validation.
        """
        _validate_degree_names_input(data)
        # Note: Boolean field (כן/לא) is handled by HebrewBooleanField directly
        
        # Convert reference fields from text to objects
        reference_mappings = {
            'academicRank': AcademicRank,
            'specialtyGroup': SpecialtyGroup,
            'specialty': Specialty,
            'researchInterests': ResearchInterest,
            'institution': Institution,
        }
        
        for field_name, model_class in reference_mappings.items():
            if field_name in data and data[field_name]:
                obj = get_reference_by_name(model_class, data[field_name])
                data[field_name] = obj.id if obj else None
        
        # Convert degrees list from text to IDs
        if 'degrees' in data and data['degrees']:
            degree_ids = []
            for deg_name in data['degrees']:
                obj = get_reference_by_name(Degree, deg_name)
                if obj:
                    degree_ids.append(obj.id)
            data['degrees'] = degree_ids
        
        return super().to_internal_value(data)
    
    def validate(self, attrs):
        """
        Cross-field validation.
        If hasMentoringExperience is True, mentoringExperienceDetails is required.
        """
        has_experience = attrs.get('hasMentoringExperience')
        details = attrs.get('mentoringExperienceDetails', '')
        
        # For partial updates, check current instance values
        if self.instance:
            if has_experience is None:
                has_experience = self.instance.hasMentoringExperience
            if not details:
                details = self.instance.mentoringExperienceDetails
        
        if has_experience and not details:
            raise serializers.ValidationError({
                'mentoringExperienceDetails': 
                    'This field is required when hasMentoringExperience is True.'
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create profile with M2M handling."""
        degrees_data = validated_data.pop('degrees', [])
        
        # Convert FK IDs to objects
        for fk_field in ['academicRank', 'specialtyGroup', 'specialty', 'researchInterests', 'institution']:
            if fk_field in validated_data and validated_data[fk_field]:
                fk_id = validated_data[fk_field]
                model_class = self.Meta.model._meta.get_field(fk_field).related_model
                try:
                    validated_data[fk_field] = model_class.objects.get(id=fk_id)
                except model_class.DoesNotExist:
                    validated_data[fk_field] = None
        
        profile = MentorProfile.objects.create(**validated_data)
        
        if degrees_data:
            degree_objects = Degree.objects.filter(id__in=degrees_data)
            profile.degrees.set(degree_objects)
        
        return profile
    
    def update(self, instance, validated_data):
        """Update profile with M2M handling."""
        degrees_data = validated_data.pop('degrees', None)
        
        # Convert FK IDs to objects
        for fk_field in ['academicRank', 'specialtyGroup', 'specialty', 'researchInterests', 'institution']:
            if fk_field in validated_data:
                fk_id = validated_data[fk_field]
                if fk_id:
                    model_class = self.Meta.model._meta.get_field(fk_field).related_model
                    try:
                        validated_data[fk_field] = model_class.objects.get(id=fk_id)
                    except model_class.DoesNotExist:
                        validated_data[fk_field] = None
                else:
                    validated_data[fk_field] = None
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if degrees_data is not None:
            degree_objects = Degree.objects.filter(id__in=degrees_data)
            instance.degrees.set(degree_objects)
        
        return instance
    
    def get_avatarUrl(self, obj):
        """Return full URL for avatar image."""
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class MentorProfileCreateSerializer(MentorProfileSerializer):
    """
    Serializer specifically for creating a new MentorProfile.
    Ensures user cannot be set from request body.
    """
    
    def create(self, validated_data):
        """Create profile, attaching to request.user."""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Authentication required.")
        
        validated_data['user'] = request.user
        return super().create(validated_data)


# =============================================================================
# PUBLIC LIST/DETAIL SERIALIZERS (Mentors/Students)
# =============================================================================


class PublicMentorSerializer(serializers.ModelSerializer):
    """Public-facing mentor card data (used by FE mentor list)."""

    name = serializers.SerializerMethodField(read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    gender = serializers.CharField(source='user.gender', read_only=True)
    genderDisplay = serializers.SerializerMethodField(read_only=True)

    specialty = serializers.SerializerMethodField(read_only=True)
    degrees = serializers.SerializerMethodField(read_only=True)
    institution = serializers.SerializerMethodField(read_only=True)
    avatarUrl = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MentorProfile
        fields = [
            'id',
            'name',
            'email',
            'gender',
            'genderDisplay',
            'specialty',
            'degrees',
            'institution',
            'avatarUrl',
        ]

    def get_genderDisplay(self, obj):
        value = getattr(obj.user, 'gender', None)
        if value == 'man':
            return 'זכר'
        if value == 'woman':
            return 'נקבה'
        if value == 'other':
            return 'אחר'
        return value

    def get_name(self, obj):
        return obj.user.get_full_name()

    def get_specialty(self, obj):
        if not obj.specialty:
            return None
        return obj.specialty.name_he or obj.specialty.name

    def get_degrees(self, obj):
        return [(d.name_he or d.name) for d in obj.degrees.all()]

    def get_institution(self, obj):
        if not obj.institution:
            return None
        return obj.institution.name_he or obj.institution.name

    def get_avatarUrl(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class PublicStudentSerializer(serializers.ModelSerializer):
    """Public-facing student card data (used by FE apprentice list)."""

    name = serializers.SerializerMethodField(read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    gender = serializers.CharField(source='user.gender', read_only=True)
    genderDisplay = serializers.SerializerMethodField(read_only=True)

    startYear = serializers.IntegerField(read_only=True)
    apprenticeStage = serializers.SerializerMethodField(read_only=True)
    institution = serializers.SerializerMethodField(read_only=True)
    avatarUrl = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            'id',
            'name',
            'email',
            'gender',
            'genderDisplay',
            'startYear',
            'apprenticeStage',
            'institution',
            'avatarUrl',
        ]

    def get_genderDisplay(self, obj):
        value = getattr(obj.user, 'gender', None)
        if value == 'man':
            return 'זכר'
        if value == 'woman':
            return 'נקבה'
        if value == 'other':
            return 'אחר'
        return value

    def get_name(self, obj):
        return obj.user.get_full_name()

    def get_apprenticeStage(self, obj):
        if not obj.apprenticeStage:
            return None
        return obj.apprenticeStage.name_he or obj.apprenticeStage.name

    def get_institution(self, obj):
        if not obj.institution:
            return None
        return obj.institution.name_he or obj.institution.name

    def get_avatarUrl(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class PublicStudentDetailSerializer(StudentProfileSerializer):
    """Public-facing student detail data (used by FE public profile page)."""

    name = serializers.SerializerMethodField(read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    gender = serializers.CharField(source='user.gender', read_only=True)
    genderDisplay = serializers.SerializerMethodField(read_only=True)

    class Meta(StudentProfileSerializer.Meta):
        fields = [
            'id',
            'name',
            'email',
            'gender',
            'genderDisplay',
            *[f for f in StudentProfileSerializer.Meta.fields if f != 'id'],
        ]

    def get_name(self, obj):
        return obj.user.get_full_name()

    def get_genderDisplay(self, obj):
        value = getattr(obj.user, 'gender', None)
        if value == 'man':
            return 'זכר'
        if value == 'woman':
            return 'נקבה'
        if value == 'other':
            return 'אחר'
        return value


class PublicMentorDetailSerializer(MentorProfileSerializer):
    """Public-facing mentor detail data (used by FE public profile page)."""

    name = serializers.SerializerMethodField(read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    gender = serializers.CharField(source='user.gender', read_only=True)
    genderDisplay = serializers.SerializerMethodField(read_only=True)

    class Meta(MentorProfileSerializer.Meta):
        fields = [
            'id',
            'name',
            'email',
            'gender',
            'genderDisplay',
            *[f for f in MentorProfileSerializer.Meta.fields if f != 'id'],
        ]

    def get_name(self, obj):
        return obj.user.get_full_name()

    def get_genderDisplay(self, obj):
        value = getattr(obj.user, 'gender', None)
        if value == 'man':
            return 'זכר'
        if value == 'woman':
            return 'נקבה'
        if value == 'other':
            return 'אחר'
        return value
