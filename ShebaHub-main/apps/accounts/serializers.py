from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema_field

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model with profile status flags.
    """
    has_student_profile = serializers.BooleanField(read_only=True)
    has_mentor_profile = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'firstName',
            'lastName',
            'gender',
            'email_verified',
            'is_staff',
            'has_student_profile',
            'has_mentor_profile',
        ]
        read_only_fields = ['id', 'is_staff']


class SignupSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Creates a User without requiring profiles.
    Requires password confirmation.
    
    Fields:
        - email: Required, must be unique (case-insensitive)
        - password: Required, must pass Django password validators
        - confirmPassword: Required, must match password
        - firstName: Optional
        - lastName: Optional
        - gender: Optional (male/female/other)
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    confirmPassword = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text='Password confirmation'
    )
    
    class Meta:
        model = User
        fields = [
            'email',
            'password',
            'confirmPassword',
            'firstName',
            'lastName',
            'gender',
        ]
    
    def validate_email(self, value):
        """
        Normalize email and check that it is not already registered (case-insensitive).
        """
        normalized_email = value.strip().lower()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return normalized_email
    
    def validate_password(self, value):
        """
        Validate password using Django's password validators.
        """
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """
        Validate that password and confirmPassword match.
        """
        if attrs.get('password') != attrs.get('confirmPassword'):
            raise serializers.ValidationError({'confirmPassword': 'Passwords do not match.'})
        return attrs
    
    def create(self, validated_data):
        """
        Create a new user using UserManager.create_user() for proper normalization.
        """
        # Remove confirmPassword as it's not a model field
        validated_data.pop('confirmPassword')
        password = validated_data.pop('password')
        
        # Use UserManager.create_user for proper password hashing and normalization
        user = User.objects.create_user(
            email=validated_data.pop('email'),
            password=password,
            **validated_data
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate_email(self, value):
        """
        Normalize email for case-insensitive lookup.
        """
        return value.strip().lower()


class TokensSerializer(serializers.Serializer):
    """Schema helper for JWT token pair."""
    refresh = serializers.CharField(help_text="JWT refresh token")
    access = serializers.CharField(help_text="JWT access token")


class AuthResponseSerializer(serializers.Serializer):
    """
    Serializer for authentication response with tokens and user data.
    """
    tokens = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    @extend_schema_field(TokensSerializer)
    def get_tokens(self, obj):
        """
        Generate JWT tokens for the user.
        """
        refresh = RefreshToken.for_user(obj)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

    @extend_schema_field(UserSerializer)
    def get_user(self, obj):
        """
        Serialize the user object.
        """
        return UserSerializer(obj).data


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting a password reset email."""
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.strip().lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for confirming a password reset with a new password."""
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
    )
    confirmPassword = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
    )

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['confirmPassword']:
            raise serializers.ValidationError({'confirmPassword': 'Passwords do not match.'})

        # Decode uid and validate token
        try:
            uid = force_str(urlsafe_base64_decode(attrs['uid']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({'uid': 'Invalid reset link.'})

        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({'token': 'Invalid or expired reset token.'})

        attrs['user'] = user
        return attrs
