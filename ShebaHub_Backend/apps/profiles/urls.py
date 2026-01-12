"""
URL configuration for the profiles app.

All endpoints are under /api/v1/profiles/ or /api/v1/reference-data/
"""

from django.urls import path

from .views import (
    # Public directory endpoints
    public_mentor_list,
    public_mentor_detail,
    public_student_list,
    public_student_detail,
    # Student profile endpoints
    student_profile_me,
    student_avatar,
    student_documents,
    student_document_detail,
    # Mentor profile endpoints
    mentor_profile_me,
    mentor_avatar,
    # Document upload endpoints
    mentor_documents,
    mentor_document_detail,
    # Reference data endpoints
    reference_data_all,
    reference_institutions,
    reference_degrees,
    reference_academic_ranks,
    reference_medical_training_stages,
    reference_specialties,
    reference_research_interests,
    reference_work_types,
    reference_participation_modes,
    reference_professional_experience,
    reference_compensation_preferences,
)

urlpatterns = [
    # Public directory endpoints (used by FE /mentors and /apprentices)
    path('mentors/', public_mentor_list, name='public-mentor-list'),
    path('mentors/<uuid:mentor_id>/', public_mentor_detail, name='public-mentor-detail'),
    path('students/', public_student_list, name='public-student-list'),
    path('students/<uuid:student_id>/', public_student_detail, name='public-student-detail'),

    # Student profile endpoints
    # GET + POST + PATCH at same URL (standard REST pattern for "me" resource)
    path('student/me/', student_profile_me, name='student-profile-me'),
    path('student/me/avatar/', student_avatar, name='student-avatar'),
    path('student/me/documents/', student_documents, name='student-documents'),
    path('student/me/documents/<uuid:document_id>/', student_document_detail, name='student-document-detail'),
    
    # Mentor profile endpoints
    # GET + POST + PATCH at same URL (standard REST pattern for "me" resource)
    path('mentor/me/', mentor_profile_me, name='mentor-profile-me'),
    path('mentor/me/avatar/', mentor_avatar, name='mentor-avatar'),
    
    # Mentor document upload endpoints
    path('mentor/me/documents/', mentor_documents, name='mentor-documents'),
    path('mentor/me/documents/<uuid:document_id>/', mentor_document_detail, name='mentor-document-detail'),
]

# Reference data URL patterns (separate for clarity)
reference_urlpatterns = [
    # All reference data in one request (admin/dev only)
    path('', reference_data_all, name='reference-data-all'),
    # Individual reference data endpoints (primary contract for FE)
    path('institutions/', reference_institutions, name='reference-institutions'),
    path('degrees/', reference_degrees, name='reference-degrees'),
    path('academic-ranks/', reference_academic_ranks, name='reference-academic-ranks'),
    path('medical-training-stages/', reference_medical_training_stages, name='reference-medical-training-stages'),
    path('specialties/', reference_specialties, name='reference-specialties'),
    path('research-interests/', reference_research_interests, name='reference-research-interests'),
    path('work-types/', reference_work_types, name='reference-work-types'),
    path('participation-modes/', reference_participation_modes, name='reference-participation-modes'),
    path('professional-experience/', reference_professional_experience, name='reference-professional-experience'),
    path('compensation-preferences/', reference_compensation_preferences, name='reference-compensation-preferences'),
]
