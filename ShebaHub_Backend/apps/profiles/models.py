"""
Profile models for the Sheba mentorship platform.

This module contains:
- Reference tables (dropdowns with placeholder values)
- StudentProfile with all required fields
- MentorProfile (existing)
- ProfileDocument for file uploads
- ProfessionalRecommendation for recommendations
"""

import uuid
from django.db import models
from django.conf import settings


# =============================================================================
# REFERENCE TABLES (Dropdowns with placeholders)
# =============================================================================

class BaseReferenceModel(models.Model):
    """
    Abstract base class for all reference/lookup tables.
    Provides consistent structure for dropdown options.
    """
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)
    name_he = models.CharField(max_length=255, blank=True, help_text="Hebrew name for display")
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    
    class Meta:
        abstract = True
        ordering = ['sort_order', 'name']
    
    def __str__(self):
        return self.name


class Institution(BaseReferenceModel):
    """Educational institutions (universities, colleges, etc.)"""
    class Meta(BaseReferenceModel.Meta):
        db_table = 'ref_institutions'
        verbose_name = 'Institution'
        verbose_name_plural = 'Institutions'


class Degree(BaseReferenceModel):
    """Academic degrees (BSc, MSc, PhD, MD, etc.)"""
    class Meta(BaseReferenceModel.Meta):
        db_table = 'ref_degrees'
        verbose_name = 'Degree'
        verbose_name_plural = 'Degrees'


class AcademicRank(BaseReferenceModel):
    """Academic ranks/positions"""
    class Meta(BaseReferenceModel.Meta):
        db_table = 'ref_academic_ranks'
        verbose_name = 'Academic Rank'
        verbose_name_plural = 'Academic Ranks'


class MedicalTrainingStage(BaseReferenceModel):
    """Stages of medical training (intern, resident, etc.)"""
    class Meta(BaseReferenceModel.Meta):
        db_table = 'ref_medical_training_stages'
        verbose_name = 'Medical Training Stage'
        verbose_name_plural = 'Medical Training Stages'


# =============================================================================
# SPECIALTY WITH GROUP
# =============================================================================

class SpecialtyGroup(BaseReferenceModel):
    """Specialty categories/groups (מקצועות הבסיס, מקצועות העל, השתלמויות)"""
    class Meta(BaseReferenceModel.Meta):
        db_table = 'ref_specialty_groups'
        verbose_name = 'Specialty Group'
        verbose_name_plural = 'Specialty Groups'


class Specialty(BaseReferenceModel):
    """Medical/academic specialties"""
    group = models.ForeignKey(
        SpecialtyGroup,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='specialties'
    )
    
    class Meta(BaseReferenceModel.Meta):
        db_table = 'ref_specialties'
        verbose_name = 'Specialty'
        verbose_name_plural = 'Specialties'


class ResearchInterest(BaseReferenceModel):
    """Research interest areas/fields"""
    class Meta(BaseReferenceModel.Meta):
        db_table = 'ref_research_interests'
        verbose_name = 'Research Interest'
        verbose_name_plural = 'Research Interests'


class WorkType(BaseReferenceModel):
    """Types of work/positions (full-time research, part-time, etc.)"""
    class Meta(BaseReferenceModel.Meta):
        db_table = 'ref_work_types'
        verbose_name = 'Work Type'
        verbose_name_plural = 'Work Types'


class ParticipationMode(BaseReferenceModel):
    """Participation modes (remote, on-site, hybrid)"""
    class Meta(BaseReferenceModel.Meta):
        db_table = 'ref_participation_modes'
        verbose_name = 'Participation Mode'
        verbose_name_plural = 'Participation Modes'


class ProfessionalExperience(BaseReferenceModel):
    """Professional experience levels"""
    class Meta(BaseReferenceModel.Meta):
        db_table = 'ref_professional_experience'
        verbose_name = 'Professional Experience Level'
        verbose_name_plural = 'Professional Experience Levels'


class CompensationPreference(BaseReferenceModel):
    """Compensation/reward preferences"""
    class Meta(BaseReferenceModel.Meta):
        db_table = 'ref_compensation_preferences'
        verbose_name = 'Compensation Preference'
        verbose_name_plural = 'Compensation Preferences'


# =============================================================================
# STUDENT PROFILE
# =============================================================================

def student_avatar_path(instance, filename):
    """Generate upload path for student avatar images"""
    ext = filename.split('.')[-1]
    return f'avatars/students/{instance.id}.{ext}'

def mentor_avatar_path(instance, filename):
    """Generate upload path for mentor avatar images"""
    ext = filename.split('.')[-1]
    return f'avatars/mentors/{instance.id}.{ext}'


class StudentProfile(models.Model):
    """
    Student profile for users seeking research/project opportunities.
    OneToOne relationship with User - each user can have at most one StudentProfile.
    Field names match Frontend (camelCase where applicable).
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='student_profile'
    )
    
    # FE: avatarUrl - תמונת פרופיל
    avatar = models.ImageField(
        upload_to=student_avatar_path,
        null=True,
        blank=True,
        help_text="Profile picture"
    )
    
    # -------------------------------------------------------------------------
    # Basic Study Information (שלב הכשרה)
    # -------------------------------------------------------------------------
    # FE: apprenticeStage - שלב בהכשרה רפואית
    apprenticeStage = models.ForeignKey(
        MedicalTrainingStage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='student_profiles',
        db_column='apprentice_stage_id'
    )
    
    # FE: startYear - שנת תחילת הלימודים
    startYear = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_column='start_year',
        help_text="Year when studies began (e.g., 2020)"
    )
    
    # FE: yearOfStudy - שנת לימודים (א', ב', ג'...)
    yearOfStudy = models.CharField(
        max_length=10,
        blank=True,
        db_column='year_of_study',
        help_text="Current year of study displayed as א/ב/ג/ד..."
    )
    
    # FE: institution - מוסד לימודים
    institution = models.ForeignKey(
        Institution,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='student_profiles'
    )
    
    # FE: degrees - תארים (M2M)
    degrees = models.ManyToManyField(
        Degree,
        blank=True,
        related_name='student_profiles'
    )
    
    # FE: specialtyGroup - קטגוריית התמחות
    specialtyGroup = models.ForeignKey(
        SpecialtyGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='student_profiles',
        db_column='specialty_group_id'
    )

    # FE: specialtyGroups - קטגוריות התמחות (M2M for multi-select)
    specialtyGroups = models.ManyToManyField(
        SpecialtyGroup,
        blank=True,
        related_name='student_profiles_multi',
        help_text="Multiple specialty groups (e.g. מקצועות הבסיס, מקצועות העל)"
    )

    # FE: specialty - התמחות / תחום מרכזי (legacy FK – kept for data migration)
    specialty = models.ForeignKey(
        Specialty,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='student_profiles'
    )

    # FE: specialties - התמחויות (M2M for multi-selection)
    specialties = models.ManyToManyField(
        Specialty,
        blank=True,
        related_name='student_profiles_multi',
        help_text="Multiple specialties (replaces single specialty FK)"
    )

    # FE: workplace - מקום עבודה
    workplace = models.CharField(
        max_length=255,
        blank=True,
        help_text="Current workplace (free text)"
    )
    
    # FE: isShebaEmployee - האם מועסק בשיבא
    isShebaEmployee = models.BooleanField(
        default=False,
        db_column='is_sheba_employee',
        help_text="Whether student is employed at Sheba"
    )
    
    # -------------------------------------------------------------------------
    # Research Experience (ניסיון במחקר)
    # -------------------------------------------------------------------------
    # FE: hasResearchExperience - ניסיון במחקר
    hasResearchExperience = models.BooleanField(
        default=False,
        db_column='has_research_experience',
        help_text="Whether student has prior research experience"
    )
    
    # FE: researchExperienceDetails - פירוט ניסיון מחקרי
    researchExperienceDetails = models.TextField(
        blank=True,
        db_column='research_experience_details',
        help_text="Details about research experience"
    )
    
    # -------------------------------------------------------------------------
    # Research & Availability (מחקר וזמינות)
    # -------------------------------------------------------------------------
    # FE: workType - סוג העבודה המבוקשת
    workType = models.ForeignKey(
        WorkType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='student_profiles',
        db_column='work_type_id'
    )
    
    # FE: compensationPreference - העדפת תגמול (multi-select, stored as JSON list)
    compensationPreference = models.JSONField(
        default=list, blank=True,
        help_text='Compensation preferences, e.g. ["מלגה", "שכר"]'
    )
    
    # FE: participationMode - אופן ההשתתפות
    participationMode = models.ForeignKey(
        ParticipationMode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='student_profiles',
        db_column='participation_mode_id'
    )
    
    # FE: isAvailableForResearch - זמינות למחקר
    isAvailableForResearch = models.BooleanField(
        default=True,
        db_column='is_available_for_research',
        help_text="Whether student is currently available for research"
    )
    
    # FE: weeklyHours - היקף שעות שבועי
    weeklyHours = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        db_column='weekly_hours',
        help_text="Number of hours per week available"
    )
    
    # FE: startDate - זמינות להתחלה
    startDate = models.DateField(
        null=True,
        blank=True,
        db_column='start_date',
        help_text="Date when student can start"
    )
    
    # FE: softwareSkills - מיומנויות וכלים
    softwareSkills = models.TextField(
        blank=True,
        db_column='software_skills',
        help_text="Software skills and tools (SPSS, Python, etc.)"
    )
    
    # FE: professionalExperience - ניסיון מקצועי קודם
    professionalExperience = models.TextField(
        blank=True,
        db_column='professional_experience',
        help_text="Previous professional experience"
    )
    
    # -------------------------------------------------------------------------
    # Additional Details (פרטים נוספים)
    # -------------------------------------------------------------------------
    # FE: personalAcademicDescription - תיאור רקע אישי ואקדמי
    personalAcademicDescription = models.TextField(
        blank=True,
        db_column='personal_academic_description',
        help_text="Personal and academic background description"
    )
    
    # FE: recommenders - פרטי ממליצים (array of {name, email, phone})
    recommenders = models.JSONField(
        default=list,
        blank=True,
        db_column='recommenders',
        help_text="List of recommenders [{name, email, phone}, ...]"
    )

    # FE: linkedinUrl - קישור לפרופיל לינקדאין
    linkedinUrl = models.URLField(
        max_length=500,
        blank=True,
        db_column='linkedin_url',
        help_text="LinkedIn profile URL"
    )

    # -------------------------------------------------------------------------
    # Metadata
    # -------------------------------------------------------------------------
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_profiles'
        verbose_name = 'Student Profile'
        verbose_name_plural = 'Student Profiles'
    
    def __str__(self):
        return f"Student Profile: {self.user.email}"


# =============================================================================
# MENTOR PROFILE
# =============================================================================

class MentorProfile(models.Model):
    """
    Mentor profile for users offering research/mentoring opportunities.
    OneToOne relationship with User - each user can have at most one MentorProfile.
    Field names match Frontend (camelCase where applicable).
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mentor_profile'
    )
    
    # FE: avatarUrl - תמונת פרופיל
    avatar = models.ImageField(
        upload_to=mentor_avatar_path,
        null=True,
        blank=True,
        help_text="Profile picture"
    )
    
    # -------------------------------------------------------------------------
    # Basic Information (פרטים כלליים ושלב הכשרה)
    # -------------------------------------------------------------------------
    # FE: specialtyGroup - קטגוריית התמחות
    specialtyGroup = models.ForeignKey(
        SpecialtyGroup,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='mentor_profiles',
        db_column='specialty_group_id'
    )

    # FE: specialtyGroups - קטגוריות התמחות (M2M for multi-select)
    specialtyGroups = models.ManyToManyField(
        SpecialtyGroup,
        blank=True,
        related_name='mentor_profiles_multi',
        help_text="Multiple specialty groups (e.g. מקצועות הבסיס, מקצועות העל)"
    )

    # FE: specialty - התמחות / תחום מרכזי (legacy FK – kept for data migration)
    specialty = models.ForeignKey(
        Specialty,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='mentor_profiles'
    )

    # FE: specialties - התמחויות (M2M for multi-selection)
    specialties = models.ManyToManyField(
        Specialty,
        blank=True,
        related_name='mentor_profiles_multi',
        help_text="Multiple specialties (replaces single specialty FK)"
    )

    # FE: institution - מוסד לימודים
    institution = models.ForeignKey(
        Institution,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='mentor_profiles'
    )
    
    # FE: academicRank - שלב בהכשרה הרפואית (for mentor: סטאז׳, מתמחה, מומחה, התמחות-על)
    academicRank = models.ForeignKey(
        AcademicRank,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='mentor_profiles',
        db_column='academic_rank_id'
    )
    
    # FE: degrees - תארים (M2M)
    degrees = models.ManyToManyField(
        Degree,
        blank=True,
        related_name='mentor_profiles'
    )
    
    # -------------------------------------------------------------------------
    # Experience & Workplace (ניסיון ומקום עבודה)
    # -------------------------------------------------------------------------
    # FE: workplace - מקום עבודה
    workplace = models.CharField(
        max_length=255,
        blank=True,
        help_text="Current workplace"
    )
    
    # FE: hasMentoringExperience - ניסיון בהנחיה
    hasMentoringExperience = models.BooleanField(
        default=False,
        db_column='has_mentoring_experience',
        help_text="Whether mentor has prior mentoring experience"
    )
    
    # FE: mentoringExperienceDetails - פירוט ניסיון בהנחיה
    mentoringExperienceDetails = models.TextField(
        blank=True,
        db_column='mentoring_experience_details',
        help_text="Details about mentoring experience"
    )
    
    # -------------------------------------------------------------------------
    # Research Background (רקע מחקרי ותחומי עניין)
    # -------------------------------------------------------------------------
    # FE: researchInterests - תחומי עניין מחקר
    researchInterests = models.ForeignKey(
        ResearchInterest,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='mentor_profiles',
        db_column='research_interests_id',
        help_text="Research interest area"
    )
    
    # FE: previousResearchDescription - תיאור מחקרים קודמים
    previousResearchDescription = models.TextField(
        blank=True,
        db_column='previous_research_description',
        help_text="Description of previous research"
    )
    
    # -------------------------------------------------------------------------
    # Additional Details (פרטים נוספים)
    # -------------------------------------------------------------------------
    # FE: personalAcademicDescription - תיאור רקע אישי ואקדמי
    personalAcademicDescription = models.TextField(
        blank=True,
        db_column='personal_academic_description',
        help_text="Personal and academic background description"
    )
    
    # FE: recommenders - פרטי ממליצים (array of {name, email, phone})
    recommenders = models.JSONField(
        default=list,
        blank=True,
        db_column='recommenders',
        help_text="List of recommenders [{name, email, phone}, ...]"
    )

    # FE: linkedinUrl - קישור לפרופיל לינקדאין
    linkedinUrl = models.URLField(
        max_length=500,
        blank=True,
        db_column='linkedin_url',
        help_text="LinkedIn profile URL"
    )

    # FE: universityRank - דרגה אקדמית (מרצה, מרצה בכיר, פרופסור חבר, פרופסור מן המניין)
    universityRank = models.CharField(
        max_length=255,
        blank=True,
        db_column='university_rank',
        help_text="Academic university rank"
    )

    # FE: universityAffiliation - שיוך אוניברסיטאי (אוניברסיטת תל אביב, etc.)
    universityAffiliation = models.CharField(
        max_length=255,
        blank=True,
        db_column='university_affiliation',
        help_text="University affiliation"
    )

    # -------------------------------------------------------------------------
    # Metadata
    # -------------------------------------------------------------------------
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mentor_profiles'
        verbose_name = 'Mentor Profile'
        verbose_name_plural = 'Mentor Profiles'
    
    def __str__(self):
        return f"Mentor Profile: {self.user.email}"


# =============================================================================
# PROFILE DOCUMENTS (File Uploads)
# =============================================================================

def profile_document_upload_path(instance, filename):
    """
    Generate upload path with UUID for uniqueness.
    Format: profile_documents/<user_id>/<uuid>_<filename>
    """
    import os
    
    # Determine user from whichever profile is set
    if instance.student_profile:
        user_id = instance.student_profile.user.id
    elif instance.mentor_profile:
        user_id = instance.mentor_profile.user.id
    else:
        user_id = 'unknown'
    
    # Generate unique filename with UUID prefix
    ext = os.path.splitext(filename)[1].lower()
    unique_filename = f"{uuid.uuid4()}{ext}"
    
    return f"profile_documents/{user_id}/{unique_filename}"


class ProfileDocument(models.Model):
    """
    Documents uploaded by users for their profiles.
    Supports both StudentProfile and MentorProfile.
    Exactly one of student_profile or mentor_profile must be set.
    """
    
    class DocumentType(models.TextChoices):
        CV = 'CV', 'Curriculum Vitae'
        TRANSCRIPT = 'TRANSCRIPT', 'Academic Transcript'
        CERTIFICATE = 'CERTIFICATE', 'Certificate'
        RECOMMENDATION = 'RECOMMENDATION', 'Recommendation Letter'
        OTHER = 'OTHER', 'Other'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Support both profile types (exactly one must be set)
    student_profile = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='documents'
    )
    mentor_profile = models.ForeignKey(
        MentorProfile,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='documents'
    )
    
    file = models.FileField(upload_to=profile_document_upload_path)
    original_filename = models.CharField(
        max_length=255,
        blank=True,
        help_text="Original filename before UUID prefix was added"
    )
    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices,
        default=DocumentType.OTHER
    )
    description = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'profile_documents'
        verbose_name = 'Profile Document'
        verbose_name_plural = 'Profile Documents'
        ordering = ['-uploaded_at']
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(student_profile__isnull=False, mentor_profile__isnull=True) |
                    models.Q(student_profile__isnull=True, mentor_profile__isnull=False)
                ),
                name='document_exactly_one_profile',
            ),
        ]
    
    def clean(self):
        """Ensure exactly one of student_profile or mentor_profile is set."""
        from django.core.exceptions import ValidationError
        
        if self.student_profile and self.mentor_profile:
            raise ValidationError(
                'A document cannot belong to both a student and mentor profile.'
            )
        if not self.student_profile and not self.mentor_profile:
            raise ValidationError(
                'A document must belong to either a student or mentor profile.'
            )
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def profile(self):
        """Return the associated profile (student or mentor)."""
        return self.student_profile or self.mentor_profile
    
    def __str__(self):
        profile = self.profile
        if profile:
            return f"{self.document_type}: {profile.user.email}"
        return f"{self.document_type}: (no profile)"


# =============================================================================
# PROFESSIONAL RECOMMENDATIONS
# =============================================================================

class ProfessionalRecommendation(models.Model):
    """
    Professional recommendations/references for profiles.
    Supports both StudentProfile and MentorProfile.
    Exactly one of student_profile or mentor_profile must be set.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Support both profile types (exactly one must be set)
    student_profile = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='recommendations'
    )
    mentor_profile = models.ForeignKey(
        MentorProfile,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='recommendations'
    )
    
    recommender_name = models.CharField(max_length=255)
    recommender_email = models.EmailField()
    recommender_title = models.CharField(
        max_length=255,
        blank=True,
        help_text="Professional title or position"
    )
    recommender_institution = models.CharField(
        max_length=255,
        blank=True,
        help_text="Institution or organization"
    )
    relationship = models.CharField(
        max_length=255,
        blank=True,
        help_text="Relationship to the profile owner (e.g., 'Research Supervisor')"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'professional_recommendations'
        verbose_name = 'Professional Recommendation'
        verbose_name_plural = 'Professional Recommendations'
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(student_profile__isnull=False, mentor_profile__isnull=True) |
                    models.Q(student_profile__isnull=True, mentor_profile__isnull=False)
                ),
                name='recommendation_exactly_one_profile',
            ),
        ]
    
    def clean(self):
        """Ensure exactly one of student_profile or mentor_profile is set."""
        from django.core.exceptions import ValidationError
        
        if self.student_profile and self.mentor_profile:
            raise ValidationError(
                'A recommendation cannot belong to both a student and mentor profile.'
            )
        if not self.student_profile and not self.mentor_profile:
            raise ValidationError(
                'A recommendation must belong to either a student or mentor profile.'
            )
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def profile(self):
        """Return the associated profile (student or mentor)."""
        return self.student_profile or self.mentor_profile
    
    def __str__(self):
        profile = self.profile
        if profile:
            return f"Recommendation from {self.recommender_name} for {profile.user.email}"
        return f"Recommendation from {self.recommender_name} (no profile)"
