from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework_simplejwt.tokens import RefreshToken

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
            'has_student_profile',
            'has_mentor_profile',
        ]
        read_only_fields = ['id']


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
        - gender: Optional (man/woman/other)
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


class AuthResponseSerializer(serializers.Serializer):
    """
    Serializer for authentication response with tokens and user data.
    """
    tokens = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    
    def get_tokens(self, obj):
        """
        Generate JWT tokens for the user.
        """
        refresh = RefreshToken.for_user(obj)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
    
    def get_user(self, obj):
        """
        Serialize the user object.
        """
        return UserSerializer(obj).data
