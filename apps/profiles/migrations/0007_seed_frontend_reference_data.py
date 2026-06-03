"""
Data migration to seed reference tables with actual data from Frontend.
This replaces placeholder values with real dropdown options.
"""

from django.db import migrations


def seed_frontend_data(apps, schema_editor):
    """Seed all reference tables with Frontend dropdown values."""
    
    # Get all reference models
    Institution = apps.get_model('profiles', 'Institution')
    Degree = apps.get_model('profiles', 'Degree')
    AcademicRank = apps.get_model('profiles', 'AcademicRank')
    MedicalTrainingStage = apps.get_model('profiles', 'MedicalTrainingStage')
    SpecialtyGroup = apps.get_model('profiles', 'SpecialtyGroup')
    Specialty = apps.get_model('profiles', 'Specialty')
    ResearchInterest = apps.get_model('profiles', 'ResearchInterest')
    WorkType = apps.get_model('profiles', 'WorkType')
    ParticipationMode = apps.get_model('profiles', 'ParticipationMode')
    CompensationPreference = apps.get_model('profiles', 'CompensationPreference')
    
    # Clear existing placeholder data
    Institution.objects.filter(name__startswith='PLACEHOLDER').delete()
    Degree.objects.filter(name__startswith='PLACEHOLDER').delete()
    AcademicRank.objects.filter(name__startswith='PLACEHOLDER').delete()
    MedicalTrainingStage.objects.filter(name__startswith='PLACEHOLDER').delete()
    Specialty.objects.filter(name__startswith='PLACEHOLDER').delete()
    ResearchInterest.objects.filter(name__startswith='PLACEHOLDER').delete()
    WorkType.objects.filter(name__startswith='PLACEHOLDER').delete()
    CompensationPreference.objects.filter(name__startswith='PLACEHOLDER').delete()
    
    # =========================================================================
    # INSTITUTIONS (מוסדות לימודים)
    # =========================================================================
    institutions = [
        ("hebrew_university", "האוניברסיטה העברית בירושלים"),
        ("tel_aviv_university", "אוניברסיטת תל אביב"),
        ("technion", "הטכניון"),
        ("ben_gurion_university", "אוניברסיטת בן גוריון"),
        ("bar_ilan_university", "אוניברסיטת בר אילן"),
        ("ariel_university", "אוניברסיטת אריאל"),
    ]
    for i, (name, name_he) in enumerate(institutions, 1):
        Institution.objects.update_or_create(
            name=name,
            defaults={'name_he': name_he, 'is_active': True, 'sort_order': i}
        )
    
    # =========================================================================
    # DEGREES (תארים)
    # =========================================================================
    degrees = ["MD", "PhD", "MSc", "MPH", "MBA"]
    for i, name in enumerate(degrees, 1):
        Degree.objects.update_or_create(
            name=name,
            defaults={'name_he': name, 'is_active': True, 'sort_order': i}
        )
    
    # =========================================================================
    # ACADEMIC RANK (שלב בהכשרה הרפואית - for Mentors)
    # =========================================================================
    academic_ranks = [
        ("staj", "סטאז׳"),
        ("mitmahe", "מתמחה"),
        ("mumhe", "מומחה/ית"),
        ("hitmahtut_al", "התמחות־על / עמית/ת"),
    ]
    for i, (name, name_he) in enumerate(academic_ranks, 1):
        AcademicRank.objects.update_or_create(
            name=name,
            defaults={'name_he': name_he, 'is_active': True, 'sort_order': i}
        )
    
    # =========================================================================
    # MEDICAL TRAINING STAGE (שלב בהכשרה רפואית - for Students/Apprentices)
    # =========================================================================
    training_stages = [
        ("student", "סטודנט"),
        ("pre_staj", "לפני סטאז׳"),
        ("stajer", "סטאז׳ר"),
        ("post_staj", "אחרי סטאז׳"),
        ("mitmahe", "מתמחה"),
        ("doctor_mitmahe", "רופא מתמחה"),
        ("other", "אחר"),
    ]
    for i, (name, name_he) in enumerate(training_stages, 1):
        MedicalTrainingStage.objects.update_or_create(
            name=name,
            defaults={'name_he': name_he, 'is_active': True, 'sort_order': i}
        )
    
    # =========================================================================
    # SPECIALTY GROUPS (קטגוריות התמחות)
    # =========================================================================
    specialty_groups_data = [
        ("base", "מקצועות הבסיס"),
        ("super", "מקצועות העל"),
        ("fellows", "השתלמויות עמיתים"),
    ]
    specialty_groups = {}
    for i, (name, name_he) in enumerate(specialty_groups_data, 1):
        group, _ = SpecialtyGroup.objects.update_or_create(
            name=name,
            defaults={'name_he': name_he, 'is_active': True, 'sort_order': i}
        )
        specialty_groups[name] = group
    
    # =========================================================================
    # SPECIALTIES (התמחויות) - מקצועות הבסיס
    # =========================================================================
    specialties_base = [
        "אונקולוגיה", "ביוכימיה קלינית", "בריאות הציבור", "גריאטריה", "הרדמה",
        "יילוד וגינקולוגיה", "כירורגיה אורולוגית", "כירורגיה אורתופדית", "כירורגיה כללית",
        "כירורגיה פלסטית ואסתטית", "כירורגיה של בית החזה", "כירורגית ילדים",
        "כירורגית כלי-דם", "מחלות א.א.ג וכירורגיה של ראש וצוואר", "מחלות עור ומין",
        "מחלות עיניים", "מיקרוביולוגיה קלינית", "נוירוכירורגיה", "נוירולוגיה",
        "פסיכיאטריה", "פסיכיאטריה של הילד ומתבגר", "פתולוגיה אבחנתית",
        "רדיולוגיה אבחנתית", "רפואה גרעינית", "רפואה דחופה", "רפואה משפטית",
        "רפואה פיזיקלית ושיקום", "רפואה פנימית", "רפואה תעסוקתית", "רפואת ילדים", "רפואת משפחה"
    ]
    for i, name_he in enumerate(specialties_base, 1):
        Specialty.objects.update_or_create(
            name_he=name_he,
            group=specialty_groups['base'],
            defaults={'name': f"base_{i}", 'is_active': True, 'sort_order': i}
        )
    
    # =========================================================================
    # SPECIALTIES (התמחויות) - מקצועות העל
    # =========================================================================
    specialties_super = [
        "אונקולוגיה", "אימונולוגיה ואלרגולוגיה", "אנדוקרינולוגיה", "אנדוקרינולוגית ילדים",
        "גנטיקה רפואית", "גסטרואנטרולוגיה", "גסטרואנטרולוגית ילדים", "גריאטריה",
        "המטו אונקולוגית ילדים", "המטולוגיה", "טיפול נמרץ ילדים", "טיפול נמרץ כללי",
        "כירורגיה של היד", "כירורגית ילדים", "כירורגית כלי-דם", "מחלות זיהומיות",
        "מחלות מטבוליות", "מחלות ריאה", "מחלות ריאה ילדים", "מינהל רפואי",
        "נאונטולוגיה", "נוירו ילדים והתפתחות הילד", "נפרולוגיה", "נפרולוגית ילדים",
        "פרמקולוגיה קלינית", "קרדיולוגיה", "קרדיולוגית ילדים", "ראומטולוגיה",
        "רדיולוגיה אבחנתית", "רפואה גרעינית", "רפואה דחופה", "רפואה לשיכוך כאב",
        "רפואה פיזיקלית ושיקום", "רפואה פליאטיבית"
    ]
    for i, name_he in enumerate(specialties_super, 1):
        Specialty.objects.update_or_create(
            name_he=name_he,
            group=specialty_groups['super'],
            defaults={'name': f"super_{i}", 'is_active': True, 'sort_order': i}
        )
    
    # =========================================================================
    # SPECIALTIES (התמחויות) - השתלמויות עמיתים
    # =========================================================================
    specialties_fellows = [
        "אולטרה סאונד נשים ומיילדות", "אורתופדית ילדים", "אי ספיקת לב",
        "אלקטרופיזיולוגיה קלינית של הלב", "אפילפטולוגיה", "אקוקרדיוגרפיה",
        "דימות בית החזה והלב", "דימות הבטן והאגן", "דימות השד", "דימות ילדים",
        "דימות מערכת השלד והשריר", "דימות קרדיווסקולרית", "החלפות מפרקים",
        "הפרעות תנועה", "הרדמה מיילדותית", "הרדמת ילדים", "טראומה", "השתלת איברים",
        "השתלת מח עצם", "טיפול נמרץ לב", "טראומה אורטופדית", "יתר לחץ דם",
        "כירורגיה דחופה ובטראומה", "כירורגיה מטבולית ובריאטרית", "כירורגיה ראש וצוואר",
        "כירורגיה של דפנות הבטן", "כירורגיה של הכתף", "כירורגיה של השתלת איברי הבטן",
        "כירורגיה של כף רגל וקרסול", "כירורגיה של עמוד השדרה", "כירורגית הקולון והרקטום",
        "כירורגית כבד, לבלב ודרכי מרה", "כירורגית רצפת אגן", "כירורגית שד",
        "מומי לב במבוגרים", "מחלות מטבוליות ילדים", "מניעה ושיקום מחלות לב",
        "נוירו רדיולוגיה", "נוירואימונולוגיה", "נוירולוגיה קוגנטיבית",
        "פסיכיאטריה ומדעי המח", "פסיכיאטריה משפטית", "פסיכיאטריה של הזיקנה",
        "פסיכיאטריה של התמכרויות", "צנתורים במומי לב", "קרדיולוגיה גרעינית",
        "קרדיולוגיה התערבותית", "קרישת דם", "רדיולוגיה פולשנית", "רדיולוגיה פורנזית",
        "רפואת אם ועובר", "רפואת מתבגרים", "רפואת ספורט אורתופדית",
        "רפואת עירויי דם ומוצריו", "רפואת רבייה", "שבץ מח", "שיקום נשימתי", "שיקום ילדים"
    ]
    for i, name_he in enumerate(specialties_fellows, 1):
        Specialty.objects.update_or_create(
            name_he=name_he,
            group=specialty_groups['fellows'],
            defaults={'name': f"fellows_{i}", 'is_active': True, 'sort_order': i}
        )
    
    # =========================================================================
    # RESEARCH INTERESTS (תחומי עניין מחקר)
    # =========================================================================
    research_interests = [
        ("ai_medicine", "AI ברפואה"),
        ("epidemiology", "אפידמיולוגיה"),
        ("emergency_medicine", "רפואה דחופה"),
        ("clinical_research", "מחקר קליני"),
    ]
    for i, (name, name_he) in enumerate(research_interests, 1):
        ResearchInterest.objects.update_or_create(
            name=name,
            defaults={'name_he': name_he, 'is_active': True, 'sort_order': i}
        )
    
    # =========================================================================
    # WORK TYPES (סוג העבודה המבוקשת)
    # =========================================================================
    work_types = [
        ("data_collection", "איסוף נתונים"),
        ("scientific_writing", "כתיבה מדעית"),
        ("statistical_analysis", "ניתוח סטטיסטי"),
    ]
    for i, (name, name_he) in enumerate(work_types, 1):
        WorkType.objects.update_or_create(
            name=name,
            defaults={'name_he': name_he, 'is_active': True, 'sort_order': i}
        )
    
    # =========================================================================
    # PARTICIPATION MODES (אופן ההשתתפות)
    # =========================================================================
    # Update existing entries
    ParticipationMode.objects.filter(name='REMOTE').update(name='remote', name_he='מרחוק')
    ParticipationMode.objects.filter(name='ON_SITE').update(name='frontal', name_he='פרונטלי')
    ParticipationMode.objects.filter(name='HYBRID').update(name='hybrid', name_he='היברידי')
    
    # Ensure all modes exist
    participation_modes = [
        ("frontal", "פרונטלי", 1),
        ("remote", "מרחוק", 2),
        ("hybrid", "היברידי", 3),
    ]
    for name, name_he, order in participation_modes:
        ParticipationMode.objects.update_or_create(
            name=name,
            defaults={'name_he': name_he, 'is_active': True, 'sort_order': order}
        )
    
    # =========================================================================
    # COMPENSATION PREFERENCES (העדפת תגמול)
    # =========================================================================
    compensation_prefs = [
        ("scholarship", "מלגה"),
        ("salary", "שכר"),
        ("academic_credit", "קרדיט אקדמי"),
        ("volunteer", "ללא תגמול / התנדבות"),
    ]
    for i, (name, name_he) in enumerate(compensation_prefs, 1):
        CompensationPreference.objects.update_or_create(
            name=name,
            defaults={'name_he': name_he, 'is_active': True, 'sort_order': i}
        )


def reverse_seed(apps, schema_editor):
    """Reverse the seed - not implemented as it would delete real data."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0006_update_models_to_frontend_naming'),
    ]

    operations = [
        migrations.RunPython(seed_frontend_data, reverse_seed),
    ]
