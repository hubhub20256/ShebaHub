import logging

from django.db import transaction
from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse

from .serializers import (
    SignupSerializer,
    LoginSerializer,
    AuthResponseSerializer,
    UserSerializer
)

User = get_user_model()

# Audit logger for sensitive operations
audit_logger = logging.getLogger('audit')


@extend_schema(
    summary="Create a new user account",
    description="""
    Register a new user account with email and password.
    
    - Gender options: man, woman, other
    - Returns JWT tokens (access and refresh) along with user data
    """,
    request=SignupSerializer,
    responses={
        201: OpenApiResponse(
            description="User created successfully",
            examples=[
                OpenApiExample(
                    "Success",
                    value={
                        "tokens": {
                            "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                            "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
                        },
                        "user": {
                            "id": "550e8400-e29b-41d4-a716-446655440000",
                            "email": "user@example.com",
                            "firstName": "Yonatan",
                            "lastName": "Elman",
                            "gender": "man",
                            "has_student_profile": False,
                            "has_mentor_profile": False
                        }
                    }
                )
            ]
        ),
        400: OpenApiResponse(
            description="Validation error",
            examples=[
                OpenApiExample(
                    "Validation Error",
                    value={
                        "email": ["A user with this email already exists."],
                        "password": ["This password is too common."],
                        "confirmPassword": ["Passwords do not match."]
                    }
                )
            ]
        )
    },
    examples=[
        OpenApiExample(
            "Signup Request",
            value={
                "email": "user@example.com",
                "password": "StrongPassword123!",
                "confirmPassword": "StrongPassword123!",
                "firstName": "Yonatan",
                "lastName": "Elman",
                "gender": "man"
            },
            request_only=True
        ),
        OpenApiExample(
            "Minimal Signup Request",
            value={
                "email": "user@example.com",
                "password": "StrongPassword123!",
                "confirmPassword": "StrongPassword123!"
            },
            request_only=True
        )
    ]
)
@api_view(['POST'])
@permission_classes([AllowAny])
def signup_view(request):
    """
    Create a new user account.
    
    Request body:
    {
        "email": "user@example.com",
        "password": "StrongPassword123!",
        "confirmPassword": "StrongPassword123!",
        "firstName": "Yonatan",
        "lastName": "Elman",
        "gender": "man"  // optional: man/woman/other
    }
    
    Response:
    {
        "tokens": {
            "access": "...",
            "refresh": "..."
        },
        "user": {
            "id": "...",
            "email": "...",
            "firstName": "...",
            "lastName": "...",
            "has_student_profile": false,
            "has_mentor_profile": false
        }
    }
    """
    serializer = SignupSerializer(data=request.data)
    
    if not serializer.is_valid():
        audit_logger.warning(
            f"Signup validation failed: {serializer.errors}",
            extra={'email': request.data.get('email', 'unknown')}
        )
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Use atomic transaction to ensure data consistency
    with transaction.atomic():
        user = serializer.save()
    
    # Audit log: successful registration
    audit_logger.info(
        f"User registered successfully: {user.email}",
        extra={'user_id': str(user.id), 'email': user.email}
    )
    
    # Generate response with tokens
    response_serializer = AuthResponseSerializer(user)
    
    return Response(
        response_serializer.data,
        status=status.HTTP_201_CREATED
    )


@extend_schema(
    summary="Authenticate user and return tokens",
    description="""
    Login with email and password to receive JWT tokens.
    
    - Returns access token (valid for 1 hour) and refresh token (valid for 7 days)
    - Use the access token in the Authorization header: `Bearer <access_token>`
    - Use refresh token at /api/v1/auth/token/refresh/ to get a new access token
    """,
    request=LoginSerializer,
    responses={
        200: OpenApiResponse(
            description="Login successful",
            examples=[
                OpenApiExample(
                    "Success",
                    value={
                        "tokens": {
                            "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                            "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
                        },
                        "user": {
                            "id": "550e8400-e29b-41d4-a716-446655440000",
                            "email": "user@example.com",
                            "firstName": "Yonatan",
                            "lastName": "Elman",
                            "gender": "man",
                            "has_student_profile": True,
                            "has_mentor_profile": False
                        }
                    }
                )
            ]
        ),
        401: OpenApiResponse(
            description="Authentication failed",
            examples=[
                OpenApiExample(
                    "Invalid Credentials",
                    value={"detail": "Invalid credentials."}
                ),
                OpenApiExample(
                    "Account Disabled",
                    value={"detail": "User account is disabled."}
                )
            ]
        ),
        400: OpenApiResponse(
            description="Validation error",
            examples=[
                OpenApiExample(
                    "Validation Error",
                    value={
                        "email": ["This field is required."],
                        "password": ["This field is required."]
                    }
                )
            ]
        )
    },
    examples=[
        OpenApiExample(
            "Login Request",
            value={
                "email": "user@example.com",
                "password": "StrongPassword123!"
            },
            request_only=True
        )
    ]
)
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Authenticate a user and return tokens.
    
    Request body:
    {
        "email": "user@example.com",
        "password": "StrongPassword123!"
    }
    
    Response:
    {
        "tokens": {
            "access": "...",
            "refresh": "..."
        },
        "user": {
            "id": "...",
            "email": "...",
            "firstName": "...",
            "lastName": "...",
            "has_student_profile": false,
            "has_mentor_profile": false
        }
    }
    """
    serializer = LoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    email = serializer.validated_data['email']
    password = serializer.validated_data['password']
    
    # Authenticate user
    user = authenticate(request, username=email, password=password)
    
    if user is None:
        # Audit log: failed login attempt
        audit_logger.warning(
            f"Failed login attempt for: {email}",
            extra={'email': email, 'reason': 'invalid_credentials'}
        )
        return Response(
            {'detail': 'Invalid credentials.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.is_active:
        # Audit log: disabled account login attempt
        audit_logger.warning(
            f"Login attempt on disabled account: {email}",
            extra={'user_id': str(user.id), 'email': email, 'reason': 'account_disabled'}
        )
        return Response(
            {'detail': 'User account is disabled.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Audit log: successful login
    audit_logger.info(
        f"User logged in successfully: {email}",
        extra={'user_id': str(user.id), 'email': email}
    )
    
    # Generate response with tokens
    response_serializer = AuthResponseSerializer(user)
    
    return Response(
        response_serializer.data,
        status=status.HTTP_200_OK
    )
