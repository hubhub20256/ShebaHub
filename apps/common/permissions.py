"""
Custom permissions for role-based and object-level access control.

Role-based permissions:
- IsStudent: User must have a StudentProfile
- IsMentor: User must have a MentorProfile
- IsAdmin: User must be staff/superuser

Object-level permissions:
- IsOwner: User can only access their own objects
- IsProfileOwner: User can only modify their own profile
"""

from rest_framework import permissions


class IsStudent(permissions.BasePermission):
    """
    Permission check for users with a StudentProfile.
    """
    message = 'You must be a registered student to perform this action.'
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, 'has_student_profile', False)


class IsMentor(permissions.BasePermission):
    """
    Permission check for users with a MentorProfile.
    """
    message = 'You must be a registered mentor to perform this action.'
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, 'has_mentor_profile', False)


class IsAdminUser(permissions.BasePermission):
    """
    Permission check for admin users (staff or superuser).
    """
    message = 'Admin privileges required.'
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_staff or request.user.is_superuser


class IsOwner(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to access it.
    Assumes the model instance has a `user` attribute.
    """
    message = 'You can only access your own resources.'
    
    def has_object_permission(self, request, view, obj):
        # Check if object has a user attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user
        # If the object IS the user
        if hasattr(obj, 'email'):  # It's a User object
            return obj == request.user
        return False


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission that allows read access to anyone,
    but only allows write access to the owner.
    """
    message = 'You can only modify your own resources.'
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'email'):  # It's a User object
            return obj == request.user
        return False


class IsProfileOwner(permissions.BasePermission):
    """
    Permission for profile access - users can only view/edit their own profiles.
    """
    message = 'You can only access your own profile.'
    
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class IsStudentOrMentor(permissions.BasePermission):
    """
    Permission check for users who are either students or mentors.
    Useful for features accessible to both roles.
    """
    message = 'You must be a registered student or mentor to perform this action.'
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            getattr(request.user, 'has_student_profile', False) or
            getattr(request.user, 'has_mentor_profile', False)
        )


class IsEmailVerified(permissions.BasePermission):
    """
    Deny access unless the user's email is verified.
    Staff and superusers are exempt.
    Also skipped when the admin toggle require_email_verification_to_apply is off.
    """
    message = 'You must verify your email address before performing this action.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        from apps.admin_panel.models import SiteSetting
        site = SiteSetting.load()
        if not site.require_email_verification_to_apply:
            return True
        return getattr(request.user, 'email_verified', False)


class ReadOnly(permissions.BasePermission):
    """
    Allow read-only access (GET, HEAD, OPTIONS).
    """
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS


class RequireProfile(permissions.BasePermission):
    """
    Deny access to users who have no profile (student or mentor).
    Allows: create-profile endpoints, auth endpoints, reference-data.
    """
    message = 'You must create a profile before accessing this resource.'

    EXEMPT_PREFIXES = [
        '/api/auth/',
        '/api/profiles/student/me/',
        '/api/profiles/mentor/me/',
        '/api/reference-data/',
        '/api/admin-panel/',
    ]

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return True  # Let IsAuthenticated handle this
        # Staff and superusers are exempt from profile requirement
        if request.user.is_staff or request.user.is_superuser:
            return True
        for prefix in self.EXEMPT_PREFIXES:
            if request.path.startswith(prefix):
                return True
        if getattr(request.user, 'has_student_profile', False) or getattr(request.user, 'has_mentor_profile', False):
            return True
        return False
