"""
Views for the profiles app.

This module provides API endpoints for:
- Student profile management (create, read, update)
- Reference data endpoints (for dropdowns)
"""

import logging

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from apps.common.throttles import UploadRateThrottle
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse

from .models import (
    StudentProfile,
    MentorProfile,
    ProfileDocument,
    ProfessionalRecommendation,
    Institution,
    Degree,
    AcademicRank,
    MedicalTrainingStage,
    Specialty,
    ResearchInterest,
    WorkType,
    ParticipationMode,
    ProfessionalExperience,
    CompensationPreference,
)
from .serializers import (
    StudentProfileSerializer,
    StudentProfileCreateSerializer,
    MentorProfileSerializer,
    MentorProfileCreateSerializer,
    ProfileDocumentSerializer,
    ProfileDocumentUploadSerializer,
    ProfessionalRecommendationSerializer,
    ReferenceSerializer,
    ReferenceDataAllSerializer,
    PublicMentorSerializer,
    PublicStudentSerializer,
    PublicMentorDetailSerializer,
    PublicStudentDetailSerializer,
)
from rest_framework.parsers import MultiPartParser, FormParser

# Audit logger for sensitive operations
audit_logger = logging.getLogger('audit')

# Avatar upload constraints
AVATAR_MAX_SIZE_MB = 5
AVATAR_MAX_SIZE_BYTES = AVATAR_MAX_SIZE_MB * 1024 * 1024
AVATAR_ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
AVATAR_ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


def _validate_avatar(avatar_file):
    """
    Validate avatar file size, type, magic bytes, and virus scan.
    Returns an error Response if invalid, or None if valid.
    """
    import os
    from .file_security import validate_magic_bytes, scan_file_for_viruses

    # Validate file size
    if avatar_file.size > AVATAR_MAX_SIZE_BYTES:
        return Response(
            {
                'code': 'VALIDATION_ERROR',
                'message': f'Avatar file size ({avatar_file.size / (1024*1024):.1f} MB) exceeds '
                           f'maximum allowed size ({AVATAR_MAX_SIZE_MB} MB).',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    # Validate file extension
    ext = os.path.splitext(avatar_file.name)[1].lower()
    if ext not in AVATAR_ALLOWED_EXTENSIONS:
        return Response(
            {
                'code': 'VALIDATION_ERROR',
                'message': f"File type '{ext}' is not allowed. "
                           f"Allowed types: {', '.join(sorted(AVATAR_ALLOWED_EXTENSIONS))}",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    # Validate content type
    if hasattr(avatar_file, 'content_type') and avatar_file.content_type not in AVATAR_ALLOWED_TYPES:
        return Response(
            {
                'code': 'VALIDATION_ERROR',
                'message': f"Content type '{avatar_file.content_type}' is not allowed. Must be an image.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    # Validate magic bytes
    is_valid, error = validate_magic_bytes(avatar_file)
    if not is_valid:
        audit_logger.warning(
            f"Avatar magic bytes mismatch: {avatar_file.name}",
            extra={'filename': avatar_file.name},
        )
        return Response(
            {'code': 'VALIDATION_ERROR', 'message': error},
            status=status.HTTP_400_BAD_REQUEST,
        )
    # Virus scan
    is_clean, threat = scan_file_for_viruses(avatar_file)
    if not is_clean:
        return Response(
            {'code': 'VALIDATION_ERROR', 'message': f'File rejected: malware detected ({threat}).'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return None


# =============================================================================
# PUBLIC DIRECTORY ENDPOINTS (Mentors/Students)
# =============================================================================


@extend_schema(
    methods=['GET'],
    summary="List public mentors",
    description="Public directory endpoint returning mentor cards for browsing.",
    responses={200: PublicMentorSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def public_mentor_list(request):
    from apps.admin_panel.models import SiteSetting
    qs = (
        MentorProfile.objects
        .filter(user__is_staff=False)
        .select_related('user', 'specialty', 'institution')
        .prefetch_related('degrees', 'specialties')
        .order_by('-created_at')
    )
    if SiteSetting.load().require_email_verification_to_apply:
        qs = qs.filter(user__email_verified=True)
    return Response(PublicMentorSerializer(qs, many=True, context={'request': request}).data)


@extend_schema(
    methods=['GET'],
    summary="Get public mentor details",
    description="Public directory endpoint returning a mentor's public profile details.",
    responses={
        200: PublicMentorDetailSerializer,
        404: OpenApiResponse(description="Mentor not found."),
    },
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def public_mentor_detail(request, mentor_id):
    from apps.admin_panel.models import SiteSetting
    try:
        qs = MentorProfile.objects.all()
        if SiteSetting.load().require_email_verification_to_apply:
            qs = qs.filter(user__email_verified=True)
        mentor = (
            qs
            .select_related(
                'user',
                'academicRank',
                'specialtyGroup',
                'specialty',
                'institution',
            )
            .prefetch_related('degrees', 'researchInterests', 'documents', 'recommendations')
            .get(id=mentor_id)
        )
    except MentorProfile.DoesNotExist:
        return Response({'detail': 'Mentor not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(PublicMentorDetailSerializer(mentor, context={'request': request}).data)


@extend_schema(
    methods=['GET'],
    summary="List public students",
    description="Public directory endpoint returning student cards for browsing.",
    responses={200: PublicStudentSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def public_student_list(request):
    from apps.admin_panel.models import SiteSetting
    qs = (
        StudentProfile.objects
        .filter(user__is_staff=False)
        .select_related('user', 'apprenticeStage', 'institution')
        .order_by('-created_at')
    )
    if SiteSetting.load().require_email_verification_to_apply:
        qs = qs.filter(user__email_verified=True)
    return Response(PublicStudentSerializer(qs, many=True, context={'request': request}).data)


@extend_schema(
    methods=['GET'],
    summary="Get public student details",
    description="Public directory endpoint returning a student's public profile details.",
    responses={
        200: PublicStudentDetailSerializer,
        404: OpenApiResponse(description="Student not found."),
    },
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def public_student_detail(request, student_id):
    from apps.admin_panel.models import SiteSetting
    try:
        qs = StudentProfile.objects.all()
        if SiteSetting.load().require_email_verification_to_apply:
            qs = qs.filter(user__email_verified=True)
        student = (
            qs
            .select_related(
                'user',
                'apprenticeStage',
                'institution',
                'specialtyGroup',
                'specialty',
                'workType',
                'participationMode',
            )
            .prefetch_related('degrees', 'documents', 'recommendations')
            .get(id=student_id)
        )
    except StudentProfile.DoesNotExist:
        return Response({'detail': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

    data = PublicStudentDetailSerializer(student, context={'request': request}).data

    # Restrict documents visibility: only the student themselves, staff,
    # or a mentor whose research this student applied to can see documents.
    can_see_docs = False
    if request.user == student.user:
        can_see_docs = True
    elif request.user.is_staff:
        can_see_docs = True
    else:
        from apps.research.models import ResearchApplication
        can_see_docs = ResearchApplication.objects.filter(
            research__owner=request.user,
            applicant=student.user,
        ).exclude(
            status__in=[
                ResearchApplication.Status.CANCELLED,
                ResearchApplication.Status.REMOVED,
            ]
        ).exists()

    if not can_see_docs:
        data['documents'] = []

    return Response(data)


# =============================================================================
# STUDENT PROFILE ENDPOINTS
# =============================================================================

@extend_schema(
    methods=['GET'],
    summary="Get current user's student profile",
    description="Retrieve the authenticated user's student profile. Returns 404 if no profile exists.",
    responses={
        200: StudentProfileSerializer,
        404: OpenApiResponse(
            description="Profile not found",
            examples=[
                OpenApiExample(
                    "Not Found",
                    value={
                        "code": "NOT_FOUND",
                        "message": "Student profile not found.",
                        "details": None
                    }
                )
            ]
        )
    }
)
@extend_schema(
    methods=['POST'],
    summary="Create student profile for current user",
    description="Create a new student profile for the authenticated user. Only one profile per user is allowed.",
    request=StudentProfileCreateSerializer,
    responses={
        201: StudentProfileSerializer,
        409: OpenApiResponse(
            description="Profile already exists",
            examples=[
                OpenApiExample(
                    "Conflict",
                    value={
                        "code": "CONFLICT",
                        "message": "Student profile already exists for this user.",
                        "details": None
                    }
                )
            ]
        ),
        400: OpenApiResponse(description="Validation error")
    },
    examples=[
        OpenApiExample(
            "Create Student Profile",
            value={
                "study_start_year": 2022,
                "study_year": 3,
                "institution": 1,
                "degrees": [1, 2],
                "specialty": 1,
                "has_research_experience": True,
                "research_experience_details": "Worked on clinical research project at Sheba Medical Center",
                "background_description": "Medical student interested in cardiology research",
                "weekly_hours_commitment": 10,
                "is_available_for_research": True
            },
            request_only=True
        )
    ]
)
@extend_schema(
    methods=['PATCH'],
    summary="Update current user's student profile",
    description="Partially update the authenticated user's student profile. Only provided fields are updated.",
    request=StudentProfileSerializer,
    responses={
        200: StudentProfileSerializer,
        404: OpenApiResponse(description="Profile not found"),
        400: OpenApiResponse(description="Validation error")
    },
    examples=[
        OpenApiExample(
            "Update Student Profile",
            value={
                "weekly_hours_commitment": 15,
                "is_available_for_research": True,
                "background_description": "Updated background description"
            },
            request_only=True
        )
    ]
)
@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def student_profile_me(request):
    """
    Unified endpoint for current user's student profile.
    
    GET /api/profiles/student/me/
    - Returns current user's profile
    - Returns 404 if no profile exists
    
    POST /api/profiles/student/me/
    - Creates profile for authenticated user
    - Returns 409 Conflict if profile already exists
    
    PATCH /api/profiles/student/me/
    - Partial update of current user's profile
    - Returns 404 if no profile exists
    """
    user = request.user
    
    if request.method == 'GET':
        try:
            profile = (
                StudentProfile.objects
                .select_related(
                    'institution', 'apprenticeStage', 'specialtyGroup',
                    'specialty', 'workType', 'participationMode',
                )
                .prefetch_related('degrees', 'specialties', 'documents', 'recommendations')
                .get(user=user)
            )
        except StudentProfile.DoesNotExist:
            return Response(
                {
                    'code': 'NOT_FOUND',
                    'message': 'Student profile not found.',
                    'details': None,
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = StudentProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Prevent dual-role: cannot create student profile if mentor profile exists
        if MentorProfile.objects.filter(user=user).exists():
            return Response(
                {
                    'code': 'ROLE_LOCKED',
                    'message': 'You already have a mentor profile. Cannot create a student profile.',
                },
                status=status.HTTP_409_CONFLICT,
            )

        # Check if profile already exists
        if StudentProfile.objects.filter(user=user).exists():
            audit_logger.warning(
                f"Duplicate profile creation attempt: {user.email}",
                extra={'user_id': str(user.id), 'email': user.email}
            )
            return Response(
                {
                    'code': 'CONFLICT',
                    'message': 'Student profile already exists for this user.',
                    'details': None,
                },
                status=status.HTTP_409_CONFLICT
            )
        
        serializer = StudentProfileCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response(
                {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Validation failed.',
                    'details': serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        profile = serializer.save()
        
        audit_logger.info(
            f"Student profile created: {user.email}",
            extra={'user_id': str(user.id), 'profile_id': str(profile.id)}
        )
        
        # Return full profile data
        response_serializer = StudentProfileSerializer(profile, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    elif request.method == 'PATCH':
        # Partial update of existing profile
        try:
            profile = StudentProfile.objects.get(user=user)
        except StudentProfile.DoesNotExist:
            return Response(
                {
                    'code': 'NOT_FOUND',
                    'message': 'Student profile not found.',
                    'details': None,
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = StudentProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response(
                {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Validation failed.',
                    'details': serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        profile = serializer.save()
        
        audit_logger.info(
            f"Student profile updated: {user.email}",
            extra={'user_id': str(user.id), 'profile_id': str(profile.id)}
        )
        
        return Response(StudentProfileSerializer(profile, context={'request': request}).data)


# =============================================================================
# STUDENT DOCUMENT ENDPOINTS
# =============================================================================


@extend_schema(
    methods=['GET'],
    summary="List student profile documents",
    description="List all documents for the current user's student profile.",
    responses={
        200: ProfileDocumentSerializer(many=True),
        404: OpenApiResponse(description="Student profile not found"),
    },
)
@extend_schema(
    methods=['POST'],
    summary="Upload student profile document",
    description="Upload a document to the current user's student profile (multipart/form-data).",
    request={
        'multipart/form-data': {
            'type': 'object',
            'properties': {
                'file': {'type': 'string', 'format': 'binary'},
                'document_type': {
                    'type': 'string',
                    'enum': ['CV', 'TRANSCRIPT', 'CERTIFICATE', 'RECOMMENDATION', 'OTHER'],
                },
                'description': {'type': 'string'},
            },
            'required': ['file'],
        }
    },
    responses={
        201: ProfileDocumentSerializer,
        400: OpenApiResponse(description="Validation error"),
        404: OpenApiResponse(description="Student profile not found"),
    },
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([UploadRateThrottle])
def student_documents(request):
    """
    GET /api/profiles/student/me/documents/
    - List all documents for current user's student profile

    POST /api/profiles/student/me/documents/
    - Upload a document to student profile (multipart/form-data)
    """
    user = request.user

    try:
        profile = StudentProfile.objects.get(user=user)
    except StudentProfile.DoesNotExist:
        return Response(
            {
                'code': 'NOT_FOUND',
                'message': 'Student profile not found. Create a student profile first.',
                'details': None,
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == 'GET':
        documents = profile.documents.all()
        serializer = ProfileDocumentSerializer(documents, many=True, context={'request': request})
        return Response(serializer.data)

    serializer = ProfileDocumentUploadSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                'code': 'VALIDATION_ERROR',
                'message': 'Validation failed.',
                'details': serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    uploaded_file = serializer.validated_data['file']
    document = ProfileDocument.objects.create(
        student_profile=profile,
        file=uploaded_file,
        original_filename=uploaded_file.name,
        document_type=serializer.validated_data.get('document_type', ProfileDocument.DocumentType.OTHER),
        description=serializer.validated_data.get('description', ''),
    )

    audit_logger.info(
        f"Document uploaded to student profile: {user.email}",
        extra={
            'user_id': str(user.id),
            'profile_id': str(profile.id),
            'document_id': str(document.id),
            'document_type': document.document_type,
        },
    )

    response_serializer = ProfileDocumentSerializer(document, context={'request': request})
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    methods=['DELETE'],
    summary="Delete a student profile document",
    description="Delete a specific document from the current user's student profile.",
    responses={
        204: OpenApiResponse(description="Document deleted successfully"),
        404: OpenApiResponse(description="Document or profile not found"),
    },
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def student_document_detail(request, document_id):
    """
    DELETE /api/profiles/student/me/documents/<document_id>/
    - Delete a specific document from student profile
    """
    user = request.user

    try:
        profile = StudentProfile.objects.get(user=user)
    except StudentProfile.DoesNotExist:
        return Response(
            {
                'code': 'NOT_FOUND',
                'message': 'Student profile not found.',
                'details': None,
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        document = ProfileDocument.objects.get(id=document_id, student_profile=profile)
    except ProfileDocument.DoesNotExist:
        return Response(
            {
                'code': 'NOT_FOUND',
                'message': 'Document not found.',
                'details': None,
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    document_type = document.document_type
    document.file.delete(save=False)
    document.delete()

    audit_logger.info(
        f"Document deleted from student profile: {user.email}",
        extra={
            'user_id': str(user.id),
            'profile_id': str(profile.id),
            'document_id': str(document_id),
            'document_type': document_type,
        },
    )

    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# MENTOR PROFILE ENDPOINTS
# =============================================================================

@extend_schema(
    methods=['GET'],
    summary="Get current user's mentor profile",
    description="Retrieve the authenticated user's mentor profile. Returns 404 if no profile exists.",
    responses={
        200: MentorProfileSerializer,
        404: OpenApiResponse(
            description="Profile not found",
            examples=[
                OpenApiExample(
                    "Not Found",
                    value={
                        "code": "NOT_FOUND",
                        "message": "Mentor profile not found.",
                        "details": None
                    }
                )
            ]
        )
    }
)
@extend_schema(
    methods=['POST'],
    summary="Create mentor profile for current user",
    description="Create a new mentor profile for the authenticated user. Only one profile per user is allowed.",
    request=MentorProfileCreateSerializer,
    responses={
        201: MentorProfileSerializer,
        409: OpenApiResponse(
            description="Profile already exists",
            examples=[
                OpenApiExample(
                    "Conflict",
                    value={
                        "code": "CONFLICT",
                        "message": "Mentor profile already exists for this user.",
                        "details": None
                    }
                )
            ]
        ),
        400: OpenApiResponse(description="Validation error")
    },
    examples=[
        OpenApiExample(
            "Create Mentor Profile",
            value={
                "institution": 1,
                "degrees": [3, 4],
                "academic_rank": 2,
                "specialty": 1,
                "research_interest_field": 1,
                "workplace": "Sheba Medical Center",
                "previous_research_description": "Published 15 papers on cardiovascular research",
                "background_description": "Senior cardiologist with 20 years of experience",
                "has_mentoring_experience": True,
                "mentoring_experience_details": "Mentored 10+ medical students and residents"
            },
            request_only=True
        )
    ]
)
@extend_schema(
    methods=['PATCH'],
    summary="Update current user's mentor profile",
    description="Partially update the authenticated user's mentor profile. Only provided fields are updated.",
    request=MentorProfileSerializer,
    responses={
        200: MentorProfileSerializer,
        404: OpenApiResponse(description="Profile not found"),
        400: OpenApiResponse(description="Validation error")
    },
    examples=[
        OpenApiExample(
            "Update Mentor Profile",
            value={
                "workplace": "Updated Hospital Name",
                "background_description": "Updated background description"
            },
            request_only=True
        )
    ]
)
@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def mentor_profile_me(request):
    """
    Unified endpoint for current user's mentor profile.
    
    GET /api/profiles/mentor/me/
    - Returns current user's mentor profile
    - Returns 404 if no profile exists
    
    POST /api/profiles/mentor/me/
    - Creates mentor profile for authenticated user
    - Returns 409 Conflict if profile already exists
    
    PATCH /api/profiles/mentor/me/
    - Partial update of current user's mentor profile
    - Returns 404 if no profile exists
    """
    user = request.user
    
    if request.method == 'GET':
        try:
            profile = (
                MentorProfile.objects
                .select_related(
                    'user', 'institution', 'academicRank',
                    'specialtyGroup', 'specialty', 'researchInterests',
                )
                .prefetch_related('degrees', 'specialties', 'documents', 'recommendations')
                .get(user=user)
            )
        except MentorProfile.DoesNotExist:
            return Response(
                {
                    'code': 'NOT_FOUND',
                    'message': 'Mentor profile not found.',
                    'details': None,
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = MentorProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Prevent dual-role: cannot create mentor profile if student profile exists
        if StudentProfile.objects.filter(user=user).exists():
            return Response(
                {
                    'code': 'ROLE_LOCKED',
                    'message': 'You already have a student profile. Cannot create a mentor profile.',
                },
                status=status.HTTP_409_CONFLICT,
            )

        # Check if profile already exists
        if MentorProfile.objects.filter(user=user).exists():
            audit_logger.warning(
                f"Duplicate mentor profile creation attempt: {user.email}",
                extra={'user_id': str(user.id), 'email': user.email}
            )
            return Response(
                {
                    'code': 'CONFLICT',
                    'message': 'Mentor profile already exists for this user.',
                    'details': None,
                },
                status=status.HTTP_409_CONFLICT
            )
        
        serializer = MentorProfileCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response(
                {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Validation failed.',
                    'details': serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        profile = serializer.save()
        
        audit_logger.info(
            f"Mentor profile created: {user.email}",
            extra={'user_id': str(user.id), 'profile_id': str(profile.id)}
        )
        
        # Return full profile data
        response_serializer = MentorProfileSerializer(profile, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    elif request.method == 'PATCH':
        # Partial update of existing profile
        try:
            profile = MentorProfile.objects.get(user=user)
        except MentorProfile.DoesNotExist:
            return Response(
                {
                    'code': 'NOT_FOUND',
                    'message': 'Mentor profile not found.',
                    'details': None,
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = MentorProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response(
                {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Validation failed.',
                    'details': serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        profile = serializer.save()
        
        audit_logger.info(
            f"Mentor profile updated: {user.email}",
            extra={'user_id': str(user.id), 'profile_id': str(profile.id)}
        )
        
        return Response(MentorProfileSerializer(profile, context={'request': request}).data)


# =============================================================================
# AVATAR UPLOAD ENDPOINTS
# =============================================================================

@extend_schema(
    methods=['POST'],
    summary="Upload mentor avatar",
    description="Upload a profile picture for the current user's mentor profile.",
    request={'type': 'object', 'properties': {'avatar': {'type': 'string', 'format': 'binary'}}},
    responses={
        200: OpenApiResponse(description="Avatar uploaded successfully"),
        404: OpenApiResponse(description="Profile not found"),
    }
)
@extend_schema(
    methods=['DELETE'],
    summary="Delete mentor avatar",
    description="Remove the profile picture from the current user's mentor profile.",
    responses={
        200: OpenApiResponse(description="Avatar deleted successfully"),
        404: OpenApiResponse(description="Profile not found"),
    }
)
@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def mentor_avatar(request):
    """Upload or delete avatar for mentor profile."""
    user = request.user
    
    try:
        profile = MentorProfile.objects.get(user=user)
    except MentorProfile.DoesNotExist:
        return Response(
            {'code': 'NOT_FOUND', 'message': 'Mentor profile not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'POST':
        avatar_file = request.FILES.get('avatar')
        if not avatar_file:
            return Response(
                {'code': 'VALIDATION_ERROR', 'message': 'No avatar file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        validation_error = _validate_avatar(avatar_file)
        if validation_error:
            return validation_error

        # Delete old avatar if exists
        if profile.avatar:
            profile.avatar.delete(save=False)

        profile.avatar = avatar_file
        profile.save()

        avatar_url = request.build_absolute_uri(profile.avatar.url) if profile.avatar else None

        audit_logger.info(
            f"Mentor avatar uploaded: {user.email}",
            extra={'user_id': str(user.id), 'profile_id': str(profile.id)}
        )

        return Response({'avatarUrl': avatar_url})

    elif request.method == 'DELETE':
        if profile.avatar:
            profile.avatar.delete(save=False)
            profile.avatar = None
            profile.save()

            audit_logger.info(
                f"Mentor avatar deleted: {user.email}",
                extra={'user_id': str(user.id), 'profile_id': str(profile.id)}
            )

        return Response({'message': 'Avatar deleted successfully.'})


@extend_schema(
    methods=['POST'],
    summary="Upload student avatar",
    description="Upload a profile picture for the current user's student profile.",
    request={'type': 'object', 'properties': {'avatar': {'type': 'string', 'format': 'binary'}}},
    responses={
        200: OpenApiResponse(description="Avatar uploaded successfully"),
        404: OpenApiResponse(description="Profile not found"),
    }
)
@extend_schema(
    methods=['DELETE'],
    summary="Delete student avatar",
    description="Remove the profile picture from the current user's student profile.",
    responses={
        200: OpenApiResponse(description="Avatar deleted successfully"),
        404: OpenApiResponse(description="Profile not found"),
    }
)
@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def student_avatar(request):
    """Upload or delete avatar for student profile."""
    user = request.user
    
    try:
        profile = StudentProfile.objects.get(user=user)
    except StudentProfile.DoesNotExist:
        return Response(
            {'code': 'NOT_FOUND', 'message': 'Student profile not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'POST':
        avatar_file = request.FILES.get('avatar')
        if not avatar_file:
            return Response(
                {'code': 'VALIDATION_ERROR', 'message': 'No avatar file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        validation_error = _validate_avatar(avatar_file)
        if validation_error:
            return validation_error

        # Delete old avatar if exists
        if profile.avatar:
            profile.avatar.delete(save=False)

        profile.avatar = avatar_file
        profile.save()

        avatar_url = request.build_absolute_uri(profile.avatar.url) if profile.avatar else None

        audit_logger.info(
            f"Student avatar uploaded: {user.email}",
            extra={'user_id': str(user.id), 'profile_id': str(profile.id)}
        )

        return Response({'avatarUrl': avatar_url})

    elif request.method == 'DELETE':
        if profile.avatar:
            profile.avatar.delete(save=False)
            profile.avatar = None
            profile.save()

            audit_logger.info(
                f"Student avatar deleted: {user.email}",
                extra={'user_id': str(user.id), 'profile_id': str(profile.id)}
            )

        return Response({'message': 'Avatar deleted successfully.'})


# =============================================================================
# DOCUMENT UPLOAD ENDPOINTS
# =============================================================================

@extend_schema(
    methods=['GET'],
    summary="List mentor profile documents",
    description="Retrieve all documents for the current user's mentor profile.",
    responses={
        200: ProfileDocumentSerializer(many=True),
        404: OpenApiResponse(description="Mentor profile not found")
    }
)
@extend_schema(
    methods=['POST'],
    summary="Upload document to mentor profile",
    description="""
    Upload a document to the current user's mentor profile.
    
    Accepts multipart/form-data with:
    - file: The document file (required)
    - document_type: One of CV, TRANSCRIPT, CERTIFICATE, RECOMMENDATION, OTHER
    - description: Optional description of the document
    
    Allowed file types: PDF, DOC, DOCX, JPG, JPEG, PNG
    Maximum file size: 10 MB
    """,
    request={
        'multipart/form-data': {
            'type': 'object',
            'properties': {
                'file': {'type': 'string', 'format': 'binary'},
                'document_type': {
                    'type': 'string',
                    'enum': ['CV', 'TRANSCRIPT', 'CERTIFICATE', 'RECOMMENDATION', 'OTHER']
                },
                'description': {'type': 'string'}
            },
            'required': ['file']
        }
    },
    responses={
        201: ProfileDocumentSerializer,
        400: OpenApiResponse(description="Validation error"),
        404: OpenApiResponse(description="Mentor profile not found")
    }
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([UploadRateThrottle])
def mentor_documents(request):
    """
    GET /api/profiles/mentor/me/documents/
    - List all documents for current user's mentor profile
    
    POST /api/profiles/mentor/me/documents/
    - Upload a document to mentor profile (multipart/form-data)
    """
    user = request.user
    
    # Get mentor profile
    try:
        profile = MentorProfile.objects.get(user=user)
    except MentorProfile.DoesNotExist:
        return Response(
            {
                'code': 'NOT_FOUND',
                'message': 'Mentor profile not found. Create a mentor profile first.',
                'details': None,
            },
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        documents = profile.documents.all()
        serializer = ProfileDocumentSerializer(
            documents, 
            many=True, 
            context={'request': request}
        )
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = ProfileDocumentUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Validation failed.',
                    'details': serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the document
        uploaded_file = serializer.validated_data['file']
        document = ProfileDocument.objects.create(
            mentor_profile=profile,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            document_type=serializer.validated_data.get('document_type', ProfileDocument.DocumentType.OTHER),
            description=serializer.validated_data.get('description', '')
        )
        
        audit_logger.info(
            f"Document uploaded to mentor profile: {user.email}",
            extra={
                'user_id': str(user.id), 
                'profile_id': str(profile.id),
                'document_id': str(document.id),
                'document_type': document.document_type
            }
        )
        
        response_serializer = ProfileDocumentSerializer(document, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    methods=['DELETE'],
    summary="Delete a mentor profile document",
    description="Delete a specific document from the current user's mentor profile.",
    responses={
        204: OpenApiResponse(description="Document deleted successfully"),
        404: OpenApiResponse(description="Document or profile not found")
    }
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def mentor_document_detail(request, document_id):
    """
    DELETE /api/profiles/mentor/me/documents/<document_id>/
    - Delete a specific document from mentor profile
    """
    user = request.user
    
    # Get mentor profile
    try:
        profile = MentorProfile.objects.get(user=user)
    except MentorProfile.DoesNotExist:
        return Response(
            {
                'code': 'NOT_FOUND',
                'message': 'Mentor profile not found.',
                'details': None,
            },
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get the document
    try:
        document = ProfileDocument.objects.get(id=document_id, mentor_profile=profile)
    except ProfileDocument.DoesNotExist:
        return Response(
            {
                'code': 'NOT_FOUND',
                'message': 'Document not found.',
                'details': None,
            },
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Delete the file and document
    document_type = document.document_type
    document.file.delete(save=False)
    document.delete()
    
    audit_logger.info(
        f"Document deleted from mentor profile: {user.email}",
        extra={
            'user_id': str(user.id), 
            'profile_id': str(profile.id),
            'document_id': str(document_id),
            'document_type': document_type
        }
    )
    
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# SECURE DOCUMENT DOWNLOAD
# =============================================================================

@extend_schema(
    methods=['GET'],
    summary="Securely download a profile document",
    description="Download a document by ID. Only the document owner can download.",
    responses={
        200: OpenApiResponse(description="File content"),
        403: OpenApiResponse(description="Permission denied"),
        404: OpenApiResponse(description="Document not found"),
    },
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def secure_document_download(request, document_id):
    """
    GET /api/profiles/documents/<document_id>/download/
    Secure download endpoint that verifies ownership before serving the file.
    """
    from django.http import FileResponse

    try:
        document = ProfileDocument.objects.select_related(
            'student_profile__user', 'mentor_profile__user'
        ).get(id=document_id)
    except ProfileDocument.DoesNotExist:
        return Response(
            {'code': 'NOT_FOUND', 'message': 'Document not found.', 'details': None},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Determine document owner and enforce ownership check
    if document.student_profile:
        doc_owner = document.student_profile.user
    elif document.mentor_profile:
        doc_owner = document.mentor_profile.user
    else:
        return Response(
            {'code': 'FORBIDDEN', 'message': 'Access denied.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Allow access if: owner, staff, or mentor whose research the student applied to
    is_authorized = (doc_owner == request.user or request.user.is_staff)
    if not is_authorized and document.student_profile:
        from apps.research.models import ResearchApplication
        is_authorized = ResearchApplication.objects.filter(
            research__owner=request.user,
            applicant=doc_owner,
        ).exclude(
            status__in=[
                ResearchApplication.Status.CANCELLED,
                ResearchApplication.Status.REMOVED,
            ]
        ).exists()

    if not is_authorized:
        return Response(
            {'code': 'FORBIDDEN', 'message': 'Access denied.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not document.file:
        return Response(
            {'code': 'NOT_FOUND', 'message': 'File not found on disk.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    audit_logger.info(
        f"Document downloaded: {document.original_filename or document.file.name}",
        extra={
            'user_id': str(request.user.id),
            'document_id': str(document.id),
        },
    )

    response = FileResponse(
        document.file.open('rb'),
        content_type='application/octet-stream',
    )
    # Use original filename for the download, falling back to stored name
    filename = document.original_filename or document.file.name.split('/')[-1]
    # RFC 5987 encoding for safe Content-Disposition with non-ASCII filenames
    from urllib.parse import quote
    encoded_filename = quote(filename)
    response['Content-Disposition'] = (
        f"attachment; filename=\"{encoded_filename}\"; "
        f"filename*=UTF-8''{encoded_filename}"
    )
    return response


# =============================================================================
# PROFESSIONAL RECOMMENDATION ENDPOINTS
# =============================================================================


@extend_schema(
    methods=['GET'],
    summary="List student recommendations",
    description="List all professional recommendations for the current user's student profile.",
    responses={
        200: ProfessionalRecommendationSerializer(many=True),
        404: OpenApiResponse(description="Student profile not found"),
    },
)
@extend_schema(
    methods=['POST'],
    summary="Add student recommendation",
    description="Add a professional recommendation to the current user's student profile.",
    request=ProfessionalRecommendationSerializer,
    responses={
        201: ProfessionalRecommendationSerializer,
        400: OpenApiResponse(description="Validation error"),
        404: OpenApiResponse(description="Student profile not found"),
    },
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def student_recommendations(request):
    """GET/POST /api/profiles/student/me/recommendations/"""
    user = request.user
    try:
        profile = StudentProfile.objects.get(user=user)
    except StudentProfile.DoesNotExist:
        return Response(
            {'code': 'NOT_FOUND', 'message': 'Student profile not found.', 'details': None},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == 'GET':
        qs = profile.recommendations.all()
        return Response(ProfessionalRecommendationSerializer(qs, many=True).data)

    serializer = ProfessionalRecommendationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'code': 'VALIDATION_ERROR', 'message': 'Validation failed.', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
    serializer.save(student_profile=profile)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    methods=['DELETE'],
    summary="Delete a student recommendation",
    description="Delete a specific recommendation from the current user's student profile.",
    responses={
        204: OpenApiResponse(description="Recommendation deleted"),
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def student_recommendation_detail(request, recommendation_id):
    """DELETE /api/profiles/student/me/recommendations/<id>/"""
    user = request.user
    try:
        profile = StudentProfile.objects.get(user=user)
    except StudentProfile.DoesNotExist:
        return Response(
            {'code': 'NOT_FOUND', 'message': 'Student profile not found.', 'details': None},
            status=status.HTTP_404_NOT_FOUND,
        )
    try:
        rec = ProfessionalRecommendation.objects.get(id=recommendation_id, student_profile=profile)
    except ProfessionalRecommendation.DoesNotExist:
        return Response(
            {'code': 'NOT_FOUND', 'message': 'Recommendation not found.', 'details': None},
            status=status.HTTP_404_NOT_FOUND,
        )
    rec.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    methods=['GET'],
    summary="List mentor recommendations",
    description="List all professional recommendations for the current user's mentor profile.",
    responses={
        200: ProfessionalRecommendationSerializer(many=True),
        404: OpenApiResponse(description="Mentor profile not found"),
    },
)
@extend_schema(
    methods=['POST'],
    summary="Add mentor recommendation",
    description="Add a professional recommendation to the current user's mentor profile.",
    request=ProfessionalRecommendationSerializer,
    responses={
        201: ProfessionalRecommendationSerializer,
        400: OpenApiResponse(description="Validation error"),
        404: OpenApiResponse(description="Mentor profile not found"),
    },
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def mentor_recommendations(request):
    """GET/POST /api/profiles/mentor/me/recommendations/"""
    user = request.user
    try:
        profile = MentorProfile.objects.get(user=user)
    except MentorProfile.DoesNotExist:
        return Response(
            {'code': 'NOT_FOUND', 'message': 'Mentor profile not found.', 'details': None},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == 'GET':
        qs = profile.recommendations.all()
        return Response(ProfessionalRecommendationSerializer(qs, many=True).data)

    serializer = ProfessionalRecommendationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'code': 'VALIDATION_ERROR', 'message': 'Validation failed.', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
    serializer.save(mentor_profile=profile)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    methods=['DELETE'],
    summary="Delete a mentor recommendation",
    description="Delete a specific recommendation from the current user's mentor profile.",
    responses={
        204: OpenApiResponse(description="Recommendation deleted"),
        404: OpenApiResponse(description="Not found"),
    },
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def mentor_recommendation_detail(request, recommendation_id):
    """DELETE /api/profiles/mentor/me/recommendations/<id>/"""
    user = request.user
    try:
        profile = MentorProfile.objects.get(user=user)
    except MentorProfile.DoesNotExist:
        return Response(
            {'code': 'NOT_FOUND', 'message': 'Mentor profile not found.', 'details': None},
            status=status.HTTP_404_NOT_FOUND,
        )
    try:
        rec = ProfessionalRecommendation.objects.get(id=recommendation_id, mentor_profile=profile)
    except ProfessionalRecommendation.DoesNotExist:
        return Response(
            {'code': 'NOT_FOUND', 'message': 'Recommendation not found.', 'details': None},
            status=status.HTTP_404_NOT_FOUND,
        )
    rec.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# REFERENCE DATA ENDPOINTS
# =============================================================================

def _is_admin_or_debug(request):
    """Check if user is admin or DEBUG mode is enabled."""
    if settings.DEBUG:
        return True
    return request.user.is_staff or request.user.is_superuser


@extend_schema(
    methods=['GET'],
    summary="Get all reference data",
    description=(
        "Return all reference data (dropdown options) in a single response. "
        "In production this endpoint is restricted to staff/superusers."
    ),
    responses={
        200: ReferenceDataAllSerializer,
        403: OpenApiResponse(description="Permission denied"),
    },
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_data_all(request):
    """
    GET /api/reference-data/
    Returns all reference data for dropdowns in a single request.
    
    NOTE: This endpoint is restricted to admin users in production.
    In development (DEBUG=True), it's accessible to all authenticated users.
    Prefer using individual /api/reference-data/{type}/ endpoints.
    """
    # Restrict to admin/staff in production
    if not _is_admin_or_debug(request):
        return Response(
            {
                'code': 'PERMISSION_DENIED',
                'message': 'This endpoint is restricted. Use individual reference-data endpoints.',
                'details': None,
            },
            status=status.HTTP_403_FORBIDDEN
        )
    
    data = {
        'institutions': list(
            Institution.objects.filter(is_active=True).values('id', 'name', 'name_he')
        ),
        'degrees': list(
            Degree.objects.filter(is_active=True).values('id', 'name', 'name_he')
        ),
        'academic_ranks': list(
            AcademicRank.objects.filter(is_active=True).values('id', 'name', 'name_he')
        ),
        'medical_training_stages': list(
            MedicalTrainingStage.objects.filter(is_active=True).values('id', 'name', 'name_he')
        ),
        'specialties': list(
            Specialty.objects.filter(is_active=True).values('id', 'name', 'name_he')
        ),
        'research_interests': list(
            ResearchInterest.objects.filter(is_active=True).values('id', 'name', 'name_he')
        ),
        'work_types': list(
            WorkType.objects.filter(is_active=True).values('id', 'name', 'name_he')
        ),
        'participation_modes': list(
            ParticipationMode.objects.filter(is_active=True).values('id', 'name', 'name_he')
        ),
        'professional_experience_levels': list(
            ProfessionalExperience.objects.filter(is_active=True).values('id', 'name', 'name_he')
        ),
        'compensation_preferences': list(
            CompensationPreference.objects.filter(is_active=True).values('id', 'name', 'name_he')
        ),
    }
    
    return Response(data)


@extend_schema(
    methods=['GET'],
    summary="List institutions",
    description="List all active institutions for dropdowns.",
    responses={200: ReferenceSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_institutions(request):
    """GET /api/reference-data/institutions/"""
    data = Institution.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@extend_schema(
    methods=['GET'],
    summary="List degrees",
    description="List all active degrees for dropdowns.",
    responses={200: ReferenceSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_degrees(request):
    """GET /api/reference-data/degrees/"""
    data = Degree.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@extend_schema(
    methods=['GET'],
    summary="List academic ranks",
    description="List all active academic ranks for dropdowns.",
    responses={200: ReferenceSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_academic_ranks(request):
    """GET /api/reference-data/academic-ranks/"""
    data = AcademicRank.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@extend_schema(
    methods=['GET'],
    summary="List medical training stages",
    description="List all active medical training stages for dropdowns.",
    responses={200: ReferenceSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_medical_training_stages(request):
    """GET /api/reference-data/medical-training-stages/"""
    data = MedicalTrainingStage.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@extend_schema(
    methods=['GET'],
    summary="List specialties",
    description="List all active specialties for dropdowns.",
    responses={200: ReferenceSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_specialties(request):
    """GET /api/reference-data/specialties/"""
    data = Specialty.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@extend_schema(
    methods=['GET'],
    summary="List research interests",
    description="List all active research interests for dropdowns.",
    responses={200: ReferenceSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_research_interests(request):
    """GET /api/reference-data/research-interests/"""
    data = ResearchInterest.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@extend_schema(
    methods=['GET'],
    summary="List work types",
    description="List all active work types for dropdowns.",
    responses={200: ReferenceSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_work_types(request):
    """GET /api/reference-data/work-types/"""
    data = WorkType.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@extend_schema(
    methods=['GET'],
    summary="List participation modes",
    description="List all active participation modes for dropdowns.",
    responses={200: ReferenceSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_participation_modes(request):
    """GET /api/reference-data/participation-modes/"""
    data = ParticipationMode.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@extend_schema(
    methods=['GET'],
    summary="List professional experience levels",
    description="List all active professional experience levels for dropdowns.",
    responses={200: ReferenceSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_professional_experience(request):
    """GET /api/reference-data/professional-experience/"""
    data = ProfessionalExperience.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@extend_schema(
    methods=['GET'],
    summary="List compensation preferences",
    description="List all active compensation preferences for dropdowns.",
    responses={200: ReferenceSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_compensation_preferences(request):
    """GET /api/reference-data/compensation-preferences/"""
    data = CompensationPreference.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


