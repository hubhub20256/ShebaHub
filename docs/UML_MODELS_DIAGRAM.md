# ShebaHub Backend - UML Class Diagram
## Last Updated: January 1, 2026

```mermaid
classDiagram
    direction TB
    
    %% ==================== USER ====================
    class User {
        +UUID id
        +EmailField email
        +CharField firstName
        +CharField lastName
        +CharField gender
        +BooleanField is_active
        +BooleanField is_staff
        +BooleanField is_superuser
        +DateTimeField date_joined
        --
        +get_full_name()
        +has_student_profile
        +has_mentor_profile
    }
    
    %% ==================== STUDENT PROFILE ====================
    class StudentProfile {
        +UUID id
        +FK user
        +FK apprenticeStage
        +Int startYear
        +Char yearOfStudy
        +FK institution
        +M2M degrees
        +FK specialtyGroup
        +FK specialty
        +Char workplace
        +Bool isShebaEmployee
        +Bool hasResearchExperience
        +Text researchExperienceDetails
        +FK workType
        +FK compensationPreference
        +FK participationMode
        +Bool isAvailableForResearch
        +Int weeklyHours
        +Date startDate
        +Text softwareSkills
        +Text professionalExperience
        +Text personalAcademicDescription
        +Text recommendationRequest
        +DateTime created_at
        +DateTime updated_at
    }
    
    %% ==================== MENTOR PROFILE ====================
    class MentorProfile {
        +UUID id
        +FK user
        +FK academicRank
        +FK specialtyGroup
        +FK specialty
        +FK institution
        +M2M degrees
        +Char workplace
        +Bool hasMentoringExperience
        +Text mentoringExperienceDetails
        +FK researchInterests
        +Text previousResearchDescription
        +Text personalAcademicDescription
        +Text recommendationRequest
        +DateTime created_at
        +DateTime updated_at
    }
    
    %% ==================== REFERENCE TABLES ====================
    class Institution {
        +Int id
        +Char name
        +Char name_he
        +Bool is_active
        +Int sort_order
    }
    
    class Degree {
        +Int id
        +Char name
        +Char name_he
        +Bool is_active
    }
    
    class AcademicRank {
        +Int id
        +Char name
        +Char name_he
        +Bool is_active
    }
    
    class MedicalTrainingStage {
        +Int id
        +Char name
        +Char name_he
        +Bool is_active
    }
    
    class SpecialtyGroup {
        +Int id
        +Char name
        +Char name_he
        +Bool is_active
    }
    
    class Specialty {
        +Int id
        +FK group
        +Char name
        +Char name_he
        +Bool is_active
    }
    
    class WorkType {
        +Int id
        +Char name
        +Char name_he
        +Bool is_active
    }
    
    class ParticipationMode {
        +Int id
        +Char name
        +Char name_he
        +Bool is_active
    }
    
    class CompensationPreference {
        +Int id
        +Char name
        +Char name_he
        +Bool is_active
    }
    
    class ResearchInterest {
        +Int id
        +Char name
        +Char name_he
        +Bool is_active
    }
    
    %% ==================== SUPPORTING MODELS ====================
    class ProfileDocument {
        +UUID id
        +FK student_profile
        +FK mentor_profile
        +FileField file
        +Char original_filename
        +Choice document_type
        +Char description
        +DateTime uploaded_at
    }
    
    class ProfessionalRecommendation {
        +UUID id
        +FK student_profile
        +FK mentor_profile
        +Char recommender_name
        +Email recommender_email
        +Char recommender_title
        +Char recommender_institution
        +Char relationship
        +DateTime created_at
    }
    
    %% ==================== RELATIONSHIPS ====================
    User "1" --> "0..1" StudentProfile : has
    User "1" --> "0..1" MentorProfile : has
    
    StudentProfile "*" --> "1" Institution : institution
    StudentProfile "*" --> "1" MedicalTrainingStage : apprenticeStage
    StudentProfile "*" --> "1" SpecialtyGroup : specialtyGroup
    StudentProfile "*" --> "1" Specialty : specialty
    StudentProfile "*" --> "1" WorkType : workType
    StudentProfile "*" --> "1" ParticipationMode : participationMode
    StudentProfile "*" --> "1" CompensationPreference : compensationPreference
    StudentProfile "*" --> "*" Degree : degrees
    
    MentorProfile "*" --> "1" Institution : institution
    MentorProfile "*" --> "1" AcademicRank : academicRank
    MentorProfile "*" --> "1" SpecialtyGroup : specialtyGroup
    MentorProfile "*" --> "1" Specialty : specialty
    MentorProfile "*" --> "1" ResearchInterest : researchInterests
    MentorProfile "*" --> "*" Degree : degrees
    
    SpecialtyGroup "1" --> "*" Specialty : specialties
    
    StudentProfile "1" --> "*" ProfileDocument : documents
    MentorProfile "1" --> "*" ProfileDocument : documents
    StudentProfile "1" --> "*" ProfessionalRecommendation : recommendations
    MentorProfile "1" --> "*" ProfessionalRecommendation : recommendations
```

---

## Reference Data Values (Seeded from Frontend)

### Institution (6 items)
| ID | name | name_he |
|----|------|---------|
| 1 | Hebrew University | האוניברסיטה העברית בירושלים |
| 2 | Tel Aviv University | אוניברסיטת תל אביב |
| 3 | Technion | הטכניון |
| 4 | Ben Gurion University | אוניברסיטת בן גוריון |
| 5 | Bar Ilan University | אוניברסיטת בר אילן |
| 6 | Ariel University | אוניברסיטת אריאל |

### Degree (5 items)
| name |
|------|
| MD |
| PhD |
| MSc |
| MPH |
| MBA |

### MedicalTrainingStage - For Students (7 items)
| name_he |
|---------|
| סטודנט |
| לפני סטאז׳ |
| סטאז׳ר |
| אחרי סטאז׳ |
| מתמחה |
| רופא מתמחה |
| אחר |

### AcademicRank - For Mentors (4 items)
| name_he |
|---------|
| סטאז׳ |
| מתמחה |
| מומחה/ית |
| התמחות-על |

### SpecialtyGroup (3 groups)
| name | Count |
|------|-------|
| base | 31 specialties |
| super | 34 specialties |
| fellows | 59 specialties |

### WorkType (3 items)
| name_he |
|---------|
| איסוף נתונים |
| כתיבה מדעית |
| ניתוח סטטיסטי |

### ParticipationMode (3 items)
| name_he |
|---------|
| פרונטלי |
| מרחוק |
| היברידי |

### CompensationPreference (4 items)
| name_he |
|---------|
| מלגה |
| שכר |
| קרדיט אקדמי |
| התנדבות |

### ResearchInterest (4 items)
| name_he |
|---------|
| AI ברפואה |
| אפידמיולוגיה |
| רפואה דחופה |
| מחקר קליני |

---

## Gender Values (User model)
| value | label |
|-------|-------|
| man | גבר |
| woman | אישה |
| other | אחר |

---

## Document Types (ProfileDocument)
| value | description |
|-------|-------------|
| CV | Curriculum Vitae |
| TRANSCRIPT | Academic Transcript |
| CERTIFICATE | Certificate |
| RECOMMENDATION | Recommendation Letter |
| OTHER | Other |
