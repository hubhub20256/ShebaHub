import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """
    Custom user manager where email is the unique identifier
    for authentication instead of username.
    """
    
    def create_user(self, email, password=None, **extra_fields):
        """
        Create and save a regular user with the given email and password.
        """
        if not email:
            raise ValueError('The Email field must be set')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and save a superuser with the given email and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        # Default values for firstName/lastName for superuser (for testing)
        extra_fields.setdefault('firstName', 'Admin')
        extra_fields.setdefault('lastName', 'User')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model that uses email instead of username.
    
    Important: This model does NOT store a role field.
    User roles are determined by the existence of related profiles:
    - StudentProfile
    - MentorProfile
    A user can have zero, one, or both profiles.
    """
    
    class Gender(models.TextChoices):
        MALE = 'male', 'זכר'
        FEMALE = 'female', 'נקבה'
        OTHER = 'other', 'אחר'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, max_length=255)
    firstName = models.CharField(max_length=150)
    lastName = models.CharField(max_length=150)
    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        blank=True,
        null=True
    )
    
    # Email verification
    email_verified = models.BooleanField(default=False)

    # Account lockout fields
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # firstName/lastName have defaults for superuser
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['email']
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        """
        Return the firstName and lastName, with a space in between.
        """
        return f"{self.firstName} {self.lastName}".strip()
    
    def get_short_name(self):
        """
        Return the short name for the user (first name).
        """
        return self.firstName

    def delete(self, *args, **kwargs):
        if self.is_superuser:
            raise PermissionError("Superuser accounts cannot be deleted.")
        return super().delete(*args, **kwargs)
    
    @property
    def has_student_profile(self):
        """
        Check if the user has a student profile.
        """
        return hasattr(self, 'student_profile')
    
    @property
    def has_mentor_profile(self):
        """
        Check if the user has a mentor profile.
        """
        return hasattr(self, 'mentor_profile')
