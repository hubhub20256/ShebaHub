"""
Migration to update models to match Frontend naming conventions (camelCase).
Also adds SpecialtyGroup model and updates StudentProfile/MentorProfile fields.
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0005_add_original_filename_to_document'),
    ]

    operations = [
        # Create SpecialtyGroup table
        migrations.CreateModel(
            name='SpecialtyGroup',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255, unique=True)),
                ('name_he', models.CharField(blank=True, help_text='Hebrew name for display', max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('sort_order', models.PositiveIntegerField(default=0)),
            ],
            options={
                'verbose_name': 'Specialty Group',
                'verbose_name_plural': 'Specialty Groups',
                'db_table': 'ref_specialty_groups',
                'ordering': ['sort_order', 'name'],
                'abstract': False,
            },
        ),
        
        # Add group FK to Specialty
        migrations.AddField(
            model_name='specialty',
            name='group',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='specialties',
                to='profiles.specialtygroup'
            ),
        ),
        
        # =========================================================================
        # STUDENT PROFILE - Rename and add fields
        # =========================================================================
        
        # Rename study_start_year -> startYear
        migrations.RenameField(
            model_name='studentprofile',
            old_name='study_start_year',
            new_name='startYear',
        ),
        migrations.AlterField(
            model_name='studentprofile',
            name='startYear',
            field=models.PositiveIntegerField(blank=True, db_column='start_year', null=True),
        ),
        
        # Remove study_year and add yearOfStudy as CharField
        migrations.RemoveField(
            model_name='studentprofile',
            name='study_year',
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='yearOfStudy',
            field=models.CharField(blank=True, db_column='year_of_study', max_length=10),
        ),
        
        # Rename medical_training_stage -> apprenticeStage
        migrations.RenameField(
            model_name='studentprofile',
            old_name='medical_training_stage',
            new_name='apprenticeStage',
        ),
        migrations.AlterField(
            model_name='studentprofile',
            name='apprenticeStage',
            field=models.ForeignKey(
                blank=True,
                db_column='apprentice_stage_id',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='student_profiles',
                to='profiles.medicaltrainingstage'
            ),
        ),
        
        # Add specialtyGroup
        migrations.AddField(
            model_name='studentprofile',
            name='specialtyGroup',
            field=models.ForeignKey(
                blank=True,
                db_column='specialty_group_id',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='student_profiles',
                to='profiles.specialtygroup'
            ),
        ),
        
        # Remove academic_rank from StudentProfile (not in FE for apprentice)
        migrations.RemoveField(
            model_name='studentprofile',
            name='academic_rank',
        ),
        
        # Add isShebaEmployee
        migrations.AddField(
            model_name='studentprofile',
            name='isShebaEmployee',
            field=models.BooleanField(db_column='is_sheba_employee', default=False),
        ),
        
        # Rename has_research_experience -> hasResearchExperience
        migrations.RenameField(
            model_name='studentprofile',
            old_name='has_research_experience',
            new_name='hasResearchExperience',
        ),
        migrations.AlterField(
            model_name='studentprofile',
            name='hasResearchExperience',
            field=models.BooleanField(db_column='has_research_experience', default=False),
        ),
        
        # Rename research_experience_details -> researchExperienceDetails
        migrations.RenameField(
            model_name='studentprofile',
            old_name='research_experience_details',
            new_name='researchExperienceDetails',
        ),
        migrations.AlterField(
            model_name='studentprofile',
            name='researchExperienceDetails',
            field=models.TextField(blank=True, db_column='research_experience_details'),
        ),
        
        # Remove research_interest_field (using specialtyGroup instead)
        migrations.RemoveField(
            model_name='studentprofile',
            name='research_interest_field',
        ),
        
        # Rename desired_work_type -> workType
        migrations.RenameField(
            model_name='studentprofile',
            old_name='desired_work_type',
            new_name='workType',
        ),
        migrations.AlterField(
            model_name='studentprofile',
            name='workType',
            field=models.ForeignKey(
                blank=True,
                db_column='work_type_id',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='student_profiles',
                to='profiles.worktype'
            ),
        ),
        
        # Rename participation_mode -> participationMode
        migrations.RenameField(
            model_name='studentprofile',
            old_name='participation_mode',
            new_name='participationMode',
        ),
        migrations.AlterField(
            model_name='studentprofile',
            name='participationMode',
            field=models.ForeignKey(
                blank=True,
                db_column='participation_mode_id',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='student_profiles',
                to='profiles.participationmode'
            ),
        ),
        
        # Rename weekly_hours_commitment -> weeklyHours
        migrations.RenameField(
            model_name='studentprofile',
            old_name='weekly_hours_commitment',
            new_name='weeklyHours',
        ),
        migrations.AlterField(
            model_name='studentprofile',
            name='weeklyHours',
            field=models.PositiveSmallIntegerField(blank=True, db_column='weekly_hours', null=True),
        ),
        
        # Rename available_start_date -> startDate
        migrations.RenameField(
            model_name='studentprofile',
            old_name='available_start_date',
            new_name='startDate',
        ),
        migrations.AlterField(
            model_name='studentprofile',
            name='startDate',
            field=models.DateField(blank=True, db_column='start_date', null=True),
        ),
        
        # Rename is_available_for_research -> isAvailableForResearch
        migrations.RenameField(
            model_name='studentprofile',
            old_name='is_available_for_research',
            new_name='isAvailableForResearch',
        ),
        migrations.AlterField(
            model_name='studentprofile',
            name='isAvailableForResearch',
            field=models.BooleanField(db_column='is_available_for_research', default=True),
        ),
        
        # Remove professional_experience_level FK, add professionalExperience TextField
        migrations.RemoveField(
            model_name='studentprofile',
            name='professional_experience_level',
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='professionalExperience',
            field=models.TextField(blank=True, db_column='professional_experience'),
        ),
        
        # Rename compensation_preference -> compensationPreference
        migrations.RenameField(
            model_name='studentprofile',
            old_name='compensation_preference',
            new_name='compensationPreference',
        ),
        migrations.AlterField(
            model_name='studentprofile',
            name='compensationPreference',
            field=models.ForeignKey(
                blank=True,
                db_column='compensation_preference_id',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='student_profiles',
                to='profiles.compensationpreference'
            ),
        ),
        
        # Add softwareSkills
        migrations.AddField(
            model_name='studentprofile',
            name='softwareSkills',
            field=models.TextField(blank=True, db_column='software_skills'),
        ),
        
        # Rename background_description -> personalAcademicDescription
        migrations.RenameField(
            model_name='studentprofile',
            old_name='background_description',
            new_name='personalAcademicDescription',
        ),
        migrations.AlterField(
            model_name='studentprofile',
            name='personalAcademicDescription',
            field=models.TextField(blank=True, db_column='personal_academic_description'),
        ),
        
        # Add recommendationRequest
        migrations.AddField(
            model_name='studentprofile',
            name='recommendationRequest',
            field=models.TextField(blank=True, db_column='recommendation_request'),
        ),
        
        # =========================================================================
        # MENTOR PROFILE - Rename and add fields
        # =========================================================================
        
        # Remove medical_training_stage (using academicRank instead for mentors)
        migrations.RemoveField(
            model_name='mentorprofile',
            name='medical_training_stage',
        ),
        
        # Rename academic_rank -> academicRank
        migrations.RenameField(
            model_name='mentorprofile',
            old_name='academic_rank',
            new_name='academicRank',
        ),
        migrations.AlterField(
            model_name='mentorprofile',
            name='academicRank',
            field=models.ForeignKey(
                blank=True,
                db_column='academic_rank_id',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='mentor_profiles',
                to='profiles.academicrank'
            ),
        ),
        
        # Add specialtyGroup
        migrations.AddField(
            model_name='mentorprofile',
            name='specialtyGroup',
            field=models.ForeignKey(
                blank=True,
                db_column='specialty_group_id',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='mentor_profiles',
                to='profiles.specialtygroup'
            ),
        ),
        
        # Rename research_interest_field -> researchInterests
        migrations.RenameField(
            model_name='mentorprofile',
            old_name='research_interest_field',
            new_name='researchInterests',
        ),
        migrations.AlterField(
            model_name='mentorprofile',
            name='researchInterests',
            field=models.ForeignKey(
                blank=True,
                db_column='research_interests_id',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='mentor_profiles',
                to='profiles.researchinterest'
            ),
        ),
        
        # Rename has_mentoring_experience -> hasMentoringExperience
        migrations.RenameField(
            model_name='mentorprofile',
            old_name='has_mentoring_experience',
            new_name='hasMentoringExperience',
        ),
        migrations.AlterField(
            model_name='mentorprofile',
            name='hasMentoringExperience',
            field=models.BooleanField(db_column='has_mentoring_experience', default=False),
        ),
        
        # Rename mentoring_experience_details -> mentoringExperienceDetails
        migrations.RenameField(
            model_name='mentorprofile',
            old_name='mentoring_experience_details',
            new_name='mentoringExperienceDetails',
        ),
        migrations.AlterField(
            model_name='mentorprofile',
            name='mentoringExperienceDetails',
            field=models.TextField(blank=True, db_column='mentoring_experience_details'),
        ),
        
        # Rename previous_research_description -> previousResearchDescription
        migrations.RenameField(
            model_name='mentorprofile',
            old_name='previous_research_description',
            new_name='previousResearchDescription',
        ),
        migrations.AlterField(
            model_name='mentorprofile',
            name='previousResearchDescription',
            field=models.TextField(blank=True, db_column='previous_research_description'),
        ),
        
        # Rename background_description -> personalAcademicDescription
        migrations.RenameField(
            model_name='mentorprofile',
            old_name='background_description',
            new_name='personalAcademicDescription',
        ),
        migrations.AlterField(
            model_name='mentorprofile',
            name='personalAcademicDescription',
            field=models.TextField(blank=True, db_column='personal_academic_description'),
        ),
        
        # Add recommendationRequest
        migrations.AddField(
            model_name='mentorprofile',
            name='recommendationRequest',
            field=models.TextField(blank=True, db_column='recommendation_request'),
        ),
    ]
