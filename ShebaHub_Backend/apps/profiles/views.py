"""
Views for the profiles app.

This module provides API endpoints for:
- Student profile management (create, read, update)
- Reference data endpoints (for dropdowns)
"""

import logging

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse

from .models import (
    StudentProfile,
    MentorProfile,
    ProfileDocument,
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
    ReferenceSerializer,
    PublicMentorSerializer,
    PublicStudentSerializer,
)
from rest_framework.parsers import MultiPartParser, FormParser

# Audit logger for sensitive operations
audit_logger = logging.getLogger('audit')


# =============================================================================
# PUBLIC DIRECTORY ENDPOINTS (Mentors/Students)
# =============================================================================


@api_view(['GET'])
@permission_classes([AllowAny])
def public_mentor_list(request):
    qs = (
        MentorProfile.objects
        .select_related('user', 'specialty', 'institution')
        .prefetch_related('degrees')
        .order_by('-created_at')
    )
    return Response(PublicMentorSerializer(qs, many=True, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_mentor_detail(request, mentor_id):
    try:
        mentor = (
            MentorProfile.objects
            .select_related('user', 'specialty', 'institution')
            .prefetch_related('degrees')
            .get(id=mentor_id)
        )
    except MentorProfile.DoesNotExist:
        return Response({'detail': 'Mentor not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(PublicMentorSerializer(mentor, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_student_list(request):
    qs = (
        StudentProfile.objects
        .select_related('user', 'apprenticeStage', 'institution')
        .order_by('-created_at')
    )
    return Response(PublicStudentSerializer(qs, many=True, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_student_detail(request, student_id):
    try:
        student = (
            StudentProfile.objects
            .select_related('user', 'apprenticeStage', 'institution')
            .get(id=student_id)
        )
    except StudentProfile.DoesNotExist:
        return Response({'detail': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(PublicStudentSerializer(student, context={'request': request}).data)


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
    
    GET /api/v1/profiles/student/me/
    - Returns current user's profile
    - Returns 404 if no profile exists
    
    POST /api/v1/profiles/student/me/
    - Creates profile for authenticated user
    - Returns 409 Conflict if profile already exists
    
    PATCH /api/v1/profiles/student/me/
    - Partial update of current user's profile
    - Returns 404 if no profile exists
    """
    user = request.user
    
    if request.method == 'GET':
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
        
        serializer = StudentProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
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
        
        # Debug: print what was received
        print("=== DEBUG: Received data ===")
        print(request.data)
        for k, v in request.data.items():
            print(f"  {k}: {repr(v)} (type: {type(v).__name__})")
        print("=== END DEBUG ===")
        
        if not serializer.is_valid():
            print("=== DEBUG: Validation errors ===")
            print(serializer.errors)
            print("=== END DEBUG ===")
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
def student_documents(request):
    """
    GET /api/v1/profiles/student/me/documents/
    - List all documents for current user's student profile

    POST /api/v1/profiles/student/me/documents/
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
    DELETE /api/v1/profiles/student/me/documents/<document_id>/
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
    
    GET /api/v1/profiles/mentor/me/
    - Returns current user's mentor profile
    - Returns 404 if no profile exists
    
    POST /api/v1/profiles/mentor/me/
    - Creates mentor profile for authenticated user
    - Returns 409 Conflict if profile already exists
    
    PATCH /api/v1/profiles/mentor/me/
    - Partial update of current user's mentor profile
    - Returns 404 if no profile exists
    """
    user = request.user
    
    if request.method == 'GET':
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
        
        serializer = MentorProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
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
def mentor_documents(request):
    """
    GET /api/v1/profiles/mentor/me/documents/
    - List all documents for current user's mentor profile
    
    POST /api/v1/profiles/mentor/me/documents/
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
    DELETE /api/v1/profiles/mentor/me/documents/<document_id>/
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
# REFERENCE DATA ENDPOINTS
# =============================================================================

def _is_admin_or_debug(request):
    """Check if user is admin or DEBUG mode is enabled."""
    if settings.DEBUG:
        return True
    return request.user.is_staff or request.user.is_superuser


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_data_all(request):
    """
    GET /api/v1/reference-data/
    Returns all reference data for dropdowns in a single request.
    
    NOTE: This endpoint is restricted to admin users in production.
    In development (DEBUG=True), it's accessible to all authenticated users.
    Prefer using individual /api/v1/reference-data/{type}/ endpoints.
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_institutions(request):
    """GET /api/v1/reference-data/institutions/"""
    data = Institution.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_degrees(request):
    """GET /api/v1/reference-data/degrees/"""
    data = Degree.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_academic_ranks(request):
    """GET /api/v1/reference-data/academic-ranks/"""
    data = AcademicRank.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_medical_training_stages(request):
    """GET /api/v1/reference-data/medical-training-stages/"""
    data = MedicalTrainingStage.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_specialties(request):
    """GET /api/v1/reference-data/specialties/"""
    data = Specialty.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_research_interests(request):
    """GET /api/v1/reference-data/research-interests/"""
    data = ResearchInterest.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_work_types(request):
    """GET /api/v1/reference-data/work-types/"""
    data = WorkType.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_participation_modes(request):
    """GET /api/v1/reference-data/participation-modes/"""
    data = ParticipationMode.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_professional_experience(request):
    """GET /api/v1/reference-data/professional-experience/"""
    data = ProfessionalExperience.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reference_compensation_preferences(request):
    """GET /api/v1/reference-data/compensation-preferences/"""
    data = CompensationPreference.objects.filter(is_active=True).values('id', 'name', 'name_he')
    return Response(list(data))
