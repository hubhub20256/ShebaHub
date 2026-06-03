"""
Data migration to update reference tables with proper English names.
"""

from django.db import migrations


def update_english_names(apps, schema_editor):
    """Update all reference tables with proper English names."""
    
    AcademicRank = apps.get_model('profiles', 'AcademicRank')
    SpecialtyGroup = apps.get_model('profiles', 'SpecialtyGroup')
    Specialty = apps.get_model('profiles', 'Specialty')
    
    # =========================================================================
    # ACADEMIC RANK - Update to proper English names
    # =========================================================================
    academic_rank_updates = {
        'staj': 'intern',
        'mitmahe': 'resident',
        'mumhe': 'specialist',
        'hitmahtut_al': 'fellow',
    }
    for old_name, new_name in academic_rank_updates.items():
        AcademicRank.objects.filter(name=old_name).update(name=new_name)
    
    # =========================================================================
    # SPECIALTY GROUPS - Update to proper English names
    # =========================================================================
    specialty_group_updates = {
        'base': 'basic_specialties',
        'super': 'super_specialties',
        'fellows': 'fellowships',
    }
    for old_name, new_name in specialty_group_updates.items():
        SpecialtyGroup.objects.filter(name=old_name).update(name=new_name)
    
    # =========================================================================
    # SPECIALTIES - Update to proper English names
    # =========================================================================
    
    # Basic Specialties (מקצועות הבסיס)
    basic_specialties_mapping = {
        'base_1': 'oncology',
        'base_2': 'clinical_biochemistry',
        'base_3': 'public_health',
        'base_4': 'geriatrics',
        'base_5': 'anesthesiology',
        'base_6': 'obstetrics_gynecology',
        'base_7': 'urology',
        'base_8': 'orthopedic_surgery',
        'base_9': 'general_surgery',
        'base_10': 'plastic_surgery',
        'base_11': 'thoracic_surgery',
        'base_12': 'pediatric_surgery',
        'base_13': 'vascular_surgery',
        'base_14': 'otolaryngology',
        'base_15': 'dermatology',
        'base_16': 'ophthalmology',
        'base_17': 'clinical_microbiology',
        'base_18': 'neurosurgery',
        'base_19': 'neurology',
        'base_20': 'psychiatry',
        'base_21': 'child_psychiatry',
        'base_22': 'diagnostic_pathology',
        'base_23': 'diagnostic_radiology',
        'base_24': 'nuclear_medicine',
        'base_25': 'emergency_medicine',
        'base_26': 'forensic_medicine',
        'base_27': 'physical_rehabilitation',
        'base_28': 'internal_medicine',
        'base_29': 'occupational_medicine',
        'base_30': 'pediatrics',
        'base_31': 'family_medicine',
    }
    
    # Super Specialties (מקצועות העל)
    super_specialties_mapping = {
        'super_1': 'oncology_super',
        'super_2': 'immunology_allergy',
        'super_3': 'endocrinology',
        'super_4': 'pediatric_endocrinology',
        'super_5': 'medical_genetics',
        'super_6': 'gastroenterology',
        'super_7': 'pediatric_gastroenterology',
        'super_8': 'geriatrics_super',
        'super_9': 'pediatric_hemato_oncology',
        'super_10': 'hematology',
        'super_11': 'pediatric_intensive_care',
        'super_12': 'general_intensive_care',
        'super_13': 'hand_surgery',
        'super_14': 'pediatric_surgery_super',
        'super_15': 'vascular_surgery_super',
        'super_16': 'infectious_diseases',
        'super_17': 'metabolic_diseases',
        'super_18': 'pulmonology',
        'super_19': 'pediatric_pulmonology',
        'super_20': 'medical_administration',
        'super_21': 'neonatology',
        'super_22': 'pediatric_neurology',
        'super_23': 'nephrology',
        'super_24': 'pediatric_nephrology',
        'super_25': 'clinical_pharmacology',
        'super_26': 'cardiology',
        'super_27': 'pediatric_cardiology',
        'super_28': 'rheumatology',
        'super_29': 'diagnostic_radiology_super',
        'super_30': 'nuclear_medicine_super',
        'super_31': 'emergency_medicine_super',
        'super_32': 'pain_medicine',
        'super_33': 'physical_rehabilitation_super',
        'super_34': 'palliative_medicine',
    }
    
    # Fellowships (השתלמויות עמיתים)
    fellowships_mapping = {
        'fellows_1': 'obgyn_ultrasound',
        'fellows_2': 'pediatric_orthopedics',
        'fellows_3': 'heart_failure',
        'fellows_4': 'cardiac_electrophysiology',
        'fellows_5': 'epileptology',
        'fellows_6': 'echocardiography',
        'fellows_7': 'chest_heart_imaging',
        'fellows_8': 'abdominal_pelvic_imaging',
        'fellows_9': 'breast_imaging',
        'fellows_10': 'pediatric_imaging',
        'fellows_11': 'musculoskeletal_imaging',
        'fellows_12': 'cardiovascular_imaging',
        'fellows_13': 'joint_replacement',
        'fellows_14': 'movement_disorders',
        'fellows_15': 'obstetric_anesthesia',
        'fellows_16': 'pediatric_anesthesia',
        'fellows_17': 'trauma',
        'fellows_18': 'organ_transplant',
        'fellows_19': 'bone_marrow_transplant',
        'fellows_20': 'cardiac_intensive_care',
        'fellows_21': 'orthopedic_trauma',
        'fellows_22': 'hypertension',
        'fellows_23': 'emergency_trauma_surgery',
        'fellows_24': 'bariatric_surgery',
        'fellows_25': 'head_neck_surgery',
        'fellows_26': 'abdominal_wall_surgery',
        'fellows_27': 'shoulder_surgery',
        'fellows_28': 'abdominal_transplant_surgery',
        'fellows_29': 'foot_ankle_surgery',
        'fellows_30': 'spine_surgery',
        'fellows_31': 'colorectal_surgery',
        'fellows_32': 'hepatobiliary_surgery',
        'fellows_33': 'pelvic_floor_surgery',
        'fellows_34': 'breast_surgery',
        'fellows_35': 'adult_congenital_heart',
        'fellows_36': 'pediatric_metabolic',
        'fellows_37': 'cardiac_prevention_rehab',
        'fellows_38': 'neuroradiology',
        'fellows_39': 'neuroimmunology',
        'fellows_40': 'cognitive_neurology',
        'fellows_41': 'neuropsychiatry',
        'fellows_42': 'forensic_psychiatry',
        'fellows_43': 'geriatric_psychiatry',
        'fellows_44': 'addiction_psychiatry',
        'fellows_45': 'congenital_heart_catheterization',
        'fellows_46': 'nuclear_cardiology',
        'fellows_47': 'interventional_cardiology',
        'fellows_48': 'coagulation',
        'fellows_49': 'interventional_radiology',
        'fellows_50': 'forensic_radiology',
        'fellows_51': 'maternal_fetal_medicine',
        'fellows_52': 'adolescent_medicine',
        'fellows_53': 'orthopedic_sports_medicine',
        'fellows_54': 'transfusion_medicine',
        'fellows_55': 'reproductive_medicine',
        'fellows_56': 'stroke',
        'fellows_57': 'pulmonary_rehabilitation',
        'fellows_58': 'pediatric_rehabilitation',
    }
    
    # Apply all specialty updates
    for old_name, new_name in basic_specialties_mapping.items():
        Specialty.objects.filter(name=old_name).update(name=new_name)
    
    for old_name, new_name in super_specialties_mapping.items():
        Specialty.objects.filter(name=old_name).update(name=new_name)
    
    for old_name, new_name in fellowships_mapping.items():
        Specialty.objects.filter(name=old_name).update(name=new_name)


def reverse_english_names(apps, schema_editor):
    """Reverse the changes (restore old names)."""
    
    AcademicRank = apps.get_model('profiles', 'AcademicRank')
    SpecialtyGroup = apps.get_model('profiles', 'SpecialtyGroup')
    Specialty = apps.get_model('profiles', 'Specialty')
    
    # Reverse Academic Ranks
    academic_rank_reverse = {
        'intern': 'staj',
        'resident': 'mitmahe',
        'specialist': 'mumhe',
        'fellow': 'hitmahtut_al',
    }
    for new_name, old_name in academic_rank_reverse.items():
        AcademicRank.objects.filter(name=new_name).update(name=old_name)
    
    # Reverse Specialty Groups
    specialty_group_reverse = {
        'basic_specialties': 'base',
        'super_specialties': 'super',
        'fellowships': 'fellows',
    }
    for new_name, old_name in specialty_group_reverse.items():
        SpecialtyGroup.objects.filter(name=new_name).update(name=old_name)


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0008_alter_mentorprofile_hasmentoringexperience_and_more'),
    ]

    operations = [
        migrations.RunPython(update_english_names, reverse_english_names),
    ]
