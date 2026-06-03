import logging
from datetime import timedelta

from django.db import transaction
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from apps.common.email_service import EmailService
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from apps.common.throttles import LoginRateThrottle, RegisterRateThrottle, PasswordResetRateThrottle
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse

from .serializers import (
    SignupSerializer,
    LoginSerializer,
    AuthResponseSerializer,
    UserSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
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
        201: AuthResponseSerializer,
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
        ),
        409: OpenApiResponse(
            description="Conflict – a user with this email already exists",
            examples=[
                OpenApiExample(
                    "Email Conflict",
                    value={
                        "code": "CONFLICT",
                        "message": "A user with this email already exists.",
                    }
                )
            ]
        ),
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
                "gender": "male"
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
@throttle_classes([RegisterRateThrottle])
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
        "gender": "male"  // optional: male/female/other
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
    from apps.admin_panel.models import SiteSetting
    site = SiteSetting.load()
    if not site.registration_enabled:
        return Response(
            {"detail": "הרשמה מושבתת כרגע."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = SignupSerializer(data=request.data)

    if not serializer.is_valid():
        audit_logger.warning(
            f"Signup validation failed: {serializer.errors}",
            extra={'email': request.data.get('email', 'unknown')}
        )
        # Return 409 for duplicate email, 400 for other validation errors
        email_errors = serializer.errors.get('email', [])
        is_duplicate = any('already exists' in str(e).lower() or 'unique' in str(e).lower() for e in email_errors)
        if is_duplicate:
            return Response(
                {
                    'code': 'CONFLICT',
                    'message': 'A user with this email already exists.',
                    'details': serializer.errors,
                },
                status=status.HTTP_409_CONFLICT,
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

    # Send verification email
    EmailService.send_verification_email(user)

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
    - Use refresh token at /api/auth/token/refresh/ to get a new access token
    """,
    request=LoginSerializer,
    responses={
        200: AuthResponseSerializer,
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
@throttle_classes([LoginRateThrottle])
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

    # Check account lockout before attempting authentication
    MAX_FAILED_ATTEMPTS = 5
    LOCKOUT_DURATION = timedelta(minutes=15)

    try:
        target_user = User.objects.get(email=email)
    except User.DoesNotExist:
        target_user = None

    if target_user and target_user.locked_until and target_user.locked_until > timezone.now():
        remaining = int((target_user.locked_until - timezone.now()).total_seconds())
        audit_logger.warning(
            f"Login attempt on locked account: {email}",
            extra={'email': email, 'reason': 'account_locked'}
        )
        return Response(
            {
                'detail': 'Account temporarily locked due to too many failed login attempts. Try again later.',
                'retry_after': remaining,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # Authenticate user
    # Authenticate user
    user = authenticate(request, username=email, password=password)

    if user is None:
        # Atomic increment of failed attempts to prevent race conditions
        if target_user:
            from django.db.models import F
            User.objects.filter(pk=target_user.pk).update(
                failed_login_attempts=F('failed_login_attempts') + 1
            )
            target_user.refresh_from_db()
            if target_user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                target_user.locked_until = timezone.now() + LOCKOUT_DURATION
                target_user.save(update_fields=['locked_until'])
                audit_logger.warning(
                    f"Account locked after {MAX_FAILED_ATTEMPTS} failed attempts: {email}",
                    extra={'email': email, 'reason': 'account_locked'}
                )

        audit_logger.warning(
            f"Failed login attempt for: {email}",
            extra={'email': email, 'reason': 'invalid_credentials'}
        )
        return Response(
            {'detail': 'Invalid credentials.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Successful login — reset lockout fields
    if user.failed_login_attempts > 0 or user.locked_until is not None:
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=['failed_login_attempts', 'locked_until'])

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


@extend_schema(
    summary="Request a password reset email",
    description="Send a password reset link to the given email. Always returns 200 to avoid leaking whether the email exists.",
    request=PasswordResetRequestSerializer,
    responses={
        200: OpenApiResponse(description="Password reset email sent (if account exists)"),
    },
)
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_request(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        user = None

    if user:
        EmailService.send_password_reset_email(user)
        audit_logger.info(
            f"Password reset requested for: {email}",
            extra={'email': email}
        )

    # Always 200 — don't reveal whether the email exists
    return Response(
        {'detail': 'If an account with that email exists, a password reset link has been sent.'},
        status=status.HTTP_200_OK,
    )


@extend_schema(
    summary="Confirm password reset with new password",
    description="Validate the reset token and set a new password.",
    request=PasswordResetConfirmSerializer,
    responses={
        200: OpenApiResponse(description="Password has been reset successfully"),
        400: OpenApiResponse(description="Invalid token, uid, or password validation failure"),
    },
)
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_confirm(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.validated_data['user']
    user.set_password(serializer.validated_data['password'])
    # Reset lockout fields on password reset
    user.failed_login_attempts = 0
    user.locked_until = None
    user.save(update_fields=['password', 'failed_login_attempts', 'locked_until'])

    audit_logger.info(
        f"Password reset completed for: {user.email}",
        extra={'user_id': str(user.id), 'email': user.email}
    )

    return Response(
        {'detail': 'Password has been reset successfully.'},
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Blacklist the refresh token to perform server-side logout."""
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh_token = request.data.get('refresh')
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass
    return Response({'detail': 'Logged out.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Return the current authenticated user's data."""
    from apps.admin_panel.models import SiteSetting
    data = UserSerializer(request.user).data
    data['require_email_verification'] = SiteSetting.load().require_email_verification_to_apply
    return Response(data)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def verify_email(request):
    """Verify a user's email address using uid and token."""
    uid_str = request.data.get('uid')
    token = request.data.get('token')

    if not uid_str or not token:
        return Response(
            {'detail': 'uid and token are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        uid = force_str(urlsafe_base64_decode(uid_str))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response(
            {'detail': 'Invalid verification link.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not default_token_generator.check_token(user, token):
        return Response(
            {'detail': 'Invalid or expired verification token.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.email_verified = True
    user.save(update_fields=['email_verified'])

    audit_logger.info(
        f"Email verified: {user.email}",
        extra={'user_id': str(user.id), 'email': user.email},
    )

    return Response({'detail': 'Email verified successfully.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([PasswordResetRateThrottle])
def resend_verification(request):
    """Resend verification email to the authenticated user."""
    user = request.user

    if user.email_verified:
        return Response(
            {'detail': 'Email is already verified.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not EmailService.send_verification_email(user):
        return Response(
            {'detail': 'Failed to send verification email. Please try again later.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    audit_logger.info(
        f"Verification email resent: {user.email}",
        extra={'user_id': str(user.id), 'email': user.email},
    )

    return Response({'detail': 'Verification email sent.'}, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_settings(request):
    user = request.user
    email = request.data.get('email')
    topics = request.data.get('notification_topics')

    if email and email != user.email:
        if User.objects.filter(email=email).exists():
            return Response({'detail': 'Email already in use.'}, status=status.HTTP_400_BAD_REQUEST)
        user.email = email
    
    if topics is not None:
        user.notification_topics = topics

    user.save()
    return Response({
        'detail': 'Settings updated successfully.',
        'email': user.email,
        'notification_topics': user.notification_topics
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    user = request.user
    old_password = request.data.get('oldPassword')
    new_password = request.data.get('newPassword')

    if not old_password or not new_password:
        return Response({'detail': 'Please provide both old and new passwords.'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(old_password):
        return Response({'detail': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(new_password) < 8:
        return Response({'detail': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    return Response({'detail': 'Password changed successfully.'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account_view(request):
    user = request.user
    user.delete()
    return Response({'detail': 'Account deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
