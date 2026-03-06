"""
Admin configuration for the profiles app.
Updated to match camelCase field names.
"""

from django.contrib import admin
from .models import (
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
    # Profile models
    StudentProfile,
    MentorProfile,
    ProfileDocument,
    ProfessionalRecommendation,
)


# =============================================================================
# REFERENCE TABLE ADMINS
# =============================================================================

class BaseReferenceAdmin(admin.ModelAdmin):
    """Base admin for all reference tables."""
    list_display = ['id', 'name', 'name_he', 'is_active', 'sort_order']
    list_filter = ['is_active']
    search_fields = ['name', 'name_he']
    ordering = ['sort_order', 'name']
    list_editable = ['is_active', 'sort_order']


@admin.register(Institution)
class InstitutionAdmin(BaseReferenceAdmin):
    pass


@admin.register(Degree)
class DegreeAdmin(BaseReferenceAdmin):
    pass


@admin.register(AcademicRank)
class AcademicRankAdmin(BaseReferenceAdmin):
    pass


@admin.register(MedicalTrainingStage)
class MedicalTrainingStageAdmin(BaseReferenceAdmin):
    pass


@admin.register(SpecialtyGroup)
class SpecialtyGroupAdmin(BaseReferenceAdmin):
    pass


@admin.register(Specialty)
class SpecialtyAdmin(BaseReferenceAdmin):
    list_display = ['id', 'name', 'name_he', 'group', 'is_active', 'sort_order']
    list_filter = ['is_active', 'group']


@admin.register(ResearchInterest)
class ResearchInterestAdmin(BaseReferenceAdmin):
    pass


@admin.register(WorkType)
class WorkTypeAdmin(BaseReferenceAdmin):
    pass


@admin.register(ParticipationMode)
class ParticipationModeAdmin(BaseReferenceAdmin):
    pass


@admin.register(ProfessionalExperience)
class ProfessionalExperienceAdmin(BaseReferenceAdmin):
    pass


@admin.register(CompensationPreference)
class CompensationPreferenceAdmin(BaseReferenceAdmin):
    pass


# =============================================================================
# STUDENT PROFILE ADMIN
# =============================================================================

class StudentProfileDocumentInline(admin.TabularInline):
    """Inline for student profile documents."""
    model = ProfileDocument
    fk_name = 'student_profile'
    extra = 0
    readonly_fields = ['id', 'uploaded_at']


class StudentRecommendationInline(admin.TabularInline):
    """Inline for student professional recommendations."""
    model = ProfessionalRecommendation
    fk_name = 'student_profile'
    extra = 0
    readonly_fields = ['id', 'created_at']


class MentorProfileDocumentInline(admin.TabularInline):
    """Inline for mentor profile documents."""
    model = ProfileDocument
    fk_name = 'mentor_profile'
    extra = 0
    readonly_fields = ['id', 'uploaded_at']


class MentorRecommendationInline(admin.TabularInline):
    """Inline for mentor professional recommendations."""
    model = ProfessionalRecommendation
    fk_name = 'mentor_profile'
    extra = 0
    readonly_fields = ['id', 'created_at']


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    """Admin interface for StudentProfile model."""
    
    list_display = [
        'user',
        'institution',
        'apprenticeStage',
        'specialty',
        'hasResearchExperience',
        'isAvailableForResearch',
        'created_at',
    ]
    list_filter = [
        'hasResearchExperience',
        'isAvailableForResearch',
        'institution',
        'apprenticeStage',
        'specialty',
        'participationMode',
    ]
    search_fields = [
        'user__email',
        'user__firstName',
        'user__lastName',
        'workplace',
        'personalAcademicDescription',
    ]
    ordering = ['-created_at']
    
    filter_horizontal = ['degrees']
    
    inlines = [StudentProfileDocumentInline, StudentRecommendationInline]
    
    fieldsets = (
        ('User', {
            'fields': ('id', 'user'),
        }),
        ('Basic Study Information', {
            'fields': (
                'apprenticeStage',
                'startYear',
                'yearOfStudy',
                'institution',
                'degrees',
                'specialtyGroup',
                'specialty',
                'workplace',
                'isShebaEmployee',
            ),
        }),
        ('Research Experience', {
            'fields': (
                'hasResearchExperience',
                'researchExperienceDetails',
            ),
        }),
        ('Research & Availability', {
            'fields': (
                'workType',
                'compensationPreference',
                'participationMode',
                'isAvailableForResearch',
                'weeklyHours',
                'startDate',
                'softwareSkills',
                'professionalExperience',
            ),
        }),
        ('Additional Details', {
            'fields': (
                'personalAcademicDescription',
                'recommenders',
            ),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    readonly_fields = ['id', 'created_at', 'updated_at']


# =============================================================================
# MENTOR PROFILE ADMIN
# =============================================================================

@admin.register(MentorProfile)
class MentorProfileAdmin(admin.ModelAdmin):
    """Admin interface for MentorProfile model."""
    
    list_display = [
        'user',
        'institution',
        'academicRank',
        'specialty',
        'hasMentoringExperience',
        'created_at',
    ]
    list_filter = [
        'academicRank',
        'institution',
        'specialty',
        'hasMentoringExperience',
    ]
    search_fields = [
        'user__email',
        'user__firstName',
        'user__lastName',
        'workplace',
        'personalAcademicDescription',
    ]
    ordering = ['-created_at']
    
    filter_horizontal = ['degrees']
    
    inlines = [MentorProfileDocumentInline, MentorRecommendationInline]
    
    fieldsets = (
        ('User', {
            'fields': ('id', 'user'),
        }),
        ('Academic / Professional Information', {
            'fields': (
                'academicRank',
                'institution',
                'degrees',
                'specialtyGroup',
                'specialty',
                'workplace',
            ),
        }),
        ('Research', {
            'fields': (
                'researchInterests',
                'previousResearchDescription',
            ),
        }),
        ('Mentoring Experience', {
            'fields': (
                'hasMentoringExperience',
                'mentoringExperienceDetails',
            ),
        }),
        ('Additional Details', {
            'fields': (
                'personalAcademicDescription',
                'recommenders',
            ),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    readonly_fields = ['id', 'created_at', 'updated_at']


# =============================================================================
# DOCUMENT AND RECOMMENDATION ADMINS
# =============================================================================

@admin.register(ProfileDocument)
class ProfileDocumentAdmin(admin.ModelAdmin):
    """Admin interface for ProfileDocument model."""
    list_display = ['id', 'get_profile_user', 'document_type', 'uploaded_at']
    list_filter = ['document_type', 'uploaded_at']
    search_fields = [
        'student_profile__user__email',
        'mentor_profile__user__email',
        'description',
    ]
    ordering = ['-uploaded_at']
    readonly_fields = ['id', 'uploaded_at']
    
    @admin.display(description='Profile User')
    def get_profile_user(self, obj):
        profile = obj.profile
        return profile.user.email if profile else '-'


@admin.register(ProfessionalRecommendation)
class ProfessionalRecommendationAdmin(admin.ModelAdmin):
    """Admin interface for ProfessionalRecommendation model."""
    list_display = ['id', 'get_profile_user', 'recommender_name', 'recommender_email', 'created_at']
    list_filter = ['created_at']
    search_fields = [
        'student_profile__user__email',
        'mentor_profile__user__email',
        'recommender_name',
        'recommender_email',
    ]
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at']
    
    @admin.display(description='Profile User')
    def get_profile_user(self, obj):
        profile = obj.profile
        return profile.user.email if profile else '-'
