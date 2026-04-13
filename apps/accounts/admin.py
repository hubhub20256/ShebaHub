from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model

User = get_user_model()


class StudentProfileInline(admin.StackedInline):
    """
    Inline admin for StudentProfile within User admin.
    """
    from apps.profiles.models import StudentProfile
    model = StudentProfile
    can_delete = True
    verbose_name_plural = 'Student Profile'
    extra = 0
    fields = [
        'apprenticeStage',
        'startYear',
        'yearOfStudy',
        'institution',
        'specialtyGroup',
        'specialty',
        'workplace',
        'isShebaEmployee',
        'hasResearchExperience',
        'isAvailableForResearch',
    ]


class MentorProfileInline(admin.StackedInline):
    """
    Inline admin for MentorProfile within User admin.
    """
    from apps.profiles.models import MentorProfile
    model = MentorProfile
    can_delete = True
    verbose_name_plural = 'Mentor Profile'
    extra = 0
    fields = [
        'academicRank',
        'specialtyGroup',
        'specialty',
        'institution',
        'workplace',
        'hasMentoringExperience',
        'researchInterests',
    ]


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin interface for User model.
    """
    list_display = ['email', 'firstName', 'lastName', 'is_active', 'is_staff', 'date_joined']
    list_filter = ['is_active', 'is_staff', 'is_superuser', 'gender']
    search_fields = ['email', 'firstName', 'lastName']
    ordering = ['email']
    
    fieldsets = (
        (None, {'fields': ('id', 'email', 'password')}),
        ('Personal Info', {'fields': ('firstName', 'lastName', 'gender')}),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'firstName', 'lastName', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ['id', 'date_joined', 'last_login']
    
    inlines = [StudentProfileInline, MentorProfileInline]
