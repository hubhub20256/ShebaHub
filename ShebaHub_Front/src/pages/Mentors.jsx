import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MentorsCard from "../components/mentorsCard";
import SearchAutocomplete from "../components/SearchAutocomplete";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { profilesAPI } from "../services/api";
import usePageTitle from "../hooks/usePageTitle";
import filterIcon from "../assets/filter.png";

import {
  SPECIALTIES_BASE,
  SPECIALTIES_SUPER,
  SPECIALTIES_FELLOWSHIPS,
} from "../data/specialties";

import "../components/card.css";
import "../styles/Mentors.css";

const SPECIALTY_GROUPS = [
  { key: "מקצועות הבסיס", label: "מקצועות הבסיס", values: SPECIALTIES_BASE },
  { key: "מקצועות העל", label: "מקצועות העל", values: SPECIALTIES_SUPER },
  {
    key: "השתלמויות עמיתים",
    label: "השתלמויות עמיתים",
    values: SPECIALTIES_FELLOWSHIPS,
  },
];

const ACADEMIC_RANK_OPTIONS = ["סטאז׳", "מומחה/ית"];

const DEGREE_OPTIONS = ["MD", "PhD", "MSc", "MPH", "MBA", "ללא תואר קודם"];

const UNIVERSITY_RANK_OPTIONS = [
  "ללא",
  "מדריך",
  "מרצה",
  "מרצה בכיר",
  "פרופסור חבר",
  "פרופסור מן המניין",
];

const UNIVERSITY_AFFILIATION_OPTIONS = [
  "האוניברסיטה העברית בירושלים",
  "אוניברסיטת תל אביב",
  "הטכניון",
  "אוניברסיטת בן גוריון",
  "אוניברסיטת בר אילן",
  "אוניברסיטת אריאל",
  "אוניברסיטת חיפה",
  "מכון ויצמן למדע",
  "אוניברסיטת רייכמן",
  "אחר",
];

const YES_NO_OPTIONS = ["כן", "לא"];

function normalizeYesNo(value) {
  if (value === true || value === "true" || value === "כן") return "כן";
  if (value === false || value === "false" || value === "לא") return "לא";
  return "";
}

export default function Mentors() {
  usePageTitle("מנחים");

  const [searchQuery, setSearchQuery] = useState("");
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(20);

  const [openFilter, setOpenFilter] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeSpecialtyGroup, setActiveSpecialtyGroup] = useState("");

  const [selectedSpecialtyGroups, setSelectedSpecialtyGroups] = useState([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [selectedAcademicRanks, setSelectedAcademicRanks] = useState([]);
  const [selectedDegrees, setSelectedDegrees] = useState([]);
  const [selectedUniversityRanks, setSelectedUniversityRanks] = useState([]);
  const [selectedUniversityAffiliations, setSelectedUniversityAffiliations] = useState([]);
  const [selectedMentoringExperience, setSelectedMentoringExperience] = useState([]);
  

  const filtersRef = useRef(null);

  useEffect(() => {
    setVisibleCount(20);
  }, [
    searchQuery,
    selectedSpecialtyGroups,
    selectedSpecialties,
    selectedAcademicRanks,
    selectedDegrees,
    selectedUniversityRanks,
    selectedUniversityAffiliations,
    selectedMentoringExperience,
  ]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setOpenFilter(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await profilesAPI.listMentors();

        console.log("RAW MENTORS FROM SERVER:", data);
        
        const list = Array.isArray(data) ? data : data?.results || [];
        if (isMounted) setMentors(list);
      } catch (err) {
        if (isMounted) {
          const errorMessage =
            err?.response?.data?.detail || err?.message || "שגיאה בטעינת מנחים";
          setError(errorMessage);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const mappedMentors = useMemo(() => {
    return (Array.isArray(mentors) ? mentors : []).map((m) => {
      const mentorSpecialties = Array.isArray(m.specialties)
        ? m.specialties.filter(Boolean)
        : m.specialty
          ? [m.specialty]
          : [];

      const mentorSpecialtyGroups = Array.isArray(m.specialtyGroups)
        ? m.specialtyGroups.filter(Boolean)
        : m.specialtyGroup
          ? [m.specialtyGroup]
          : [];

      const mentorDegrees = Array.isArray(m.degrees)
        ? m.degrees.filter(Boolean)
        : m.degrees
          ? [m.degrees]
          : [];

          return {
            id: m.id,
            name: m.name || "",
            gender: m.genderDisplay || m.gender || "",
            email: m.email || "",
          
            specialty: mentorSpecialties.join(", "),
            specialties: mentorSpecialties,
            specialtyGroups: mentorSpecialtyGroups,
          
            academicRank: m.academicRank || m.academic_rank || "",
            degrees: mentorDegrees.join(", "),
            degreesList: mentorDegrees,
          
            universityRank: m.universityRank || m.university_rank || "",
            universityAffiliation:
              m.universityAffiliation || m.university_affiliation || "",
          
            hasMentoringExperience: normalizeYesNo(
              m.hasMentoringExperience || m.has_mentoring_experience
            ),
          
            Educational_institution:
              m.institution || m.Educational_institution || m.educational_institution || "",
          
            profileImage: m.avatarUrl || m.avatar_url || null,
          };
    });
  }, [mentors]);

  const extractMentorTerms = useCallback(
    (m) => [
      m.name,
      m.specialty,
      m.academicRank,
      m.degrees,
      m.universityRank,
      m.universityAffiliation,
      m.hasMentoringExperience,
      m.Educational_institution,
    ],
    [],
  );

  function toggleValue(value, setter) {
    setter((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }

      return [...prev, value];
    });
  }

  function toggleSpecialtyGroup(groupKey) {
    setActiveSpecialtyGroup(groupKey);
  }
  
  function clearAdvancedFilters() {
    setSelectedSpecialtyGroups([]);
    setSelectedSpecialties([]);
    setSelectedAcademicRanks([]);
    setSelectedDegrees([]);
    setSelectedUniversityRanks([]);
    setSelectedUniversityAffiliations([]);
    setSelectedMentoringExperience([]);
    setActiveSpecialtyGroup("");
    setOpenFilter(null);
  }

  const activeGroupValues = useMemo(() => {
    const group = SPECIALTY_GROUPS.find(
      (item) => item.key === activeSpecialtyGroup,
    );

    return group?.values || [];
  }, [activeSpecialtyGroup]);

  const shouldShowUniversityAffiliation =
    selectedUniversityRanks.length > 0 &&
    !selectedUniversityRanks.includes("ללא");

  const hasActiveFilters =
    selectedSpecialtyGroups.length > 0 ||
    selectedSpecialties.length > 0 ||
    selectedAcademicRanks.length > 0 ||
    selectedDegrees.length > 0 ||
    selectedUniversityRanks.length > 0 ||
    selectedUniversityAffiliations.length > 0 ||
    selectedMentoringExperience.length > 0;

  const filteredMentors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return mappedMentors.filter((m) => {

      console.log("specialties:", m.specialties);
      console.log("selectedSpecialties:", selectedSpecialties);

      

      const matchesSearch = !q
        ? true
        : [
            m.name,
            m.specialty,
            m.academicRank,
            m.degrees,
            m.universityRank,
            m.universityAffiliation,
            m.hasMentoringExperience,
            m.Educational_institution,
            m.email,
            m.gender,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);

      const matchesSpecialtyGroup =
        selectedSpecialtyGroups.length === 0
          ? true
          : selectedSpecialtyGroups.some((group) =>
              m.specialtyGroups.includes(group),
            );

      const matchesSpecialty =
        selectedSpecialties.length === 0
          ? true
            : selectedSpecialties.some((specialty) =>
              m.specialties.some((mentorSpecialty) =>
                String(mentorSpecialty).trim() === String(specialty).trim()
                )
                );

      const matchesAcademicRank =
        selectedAcademicRanks.length === 0
          ? true
          : selectedAcademicRanks.includes(m.academicRank);

      const matchesDegrees =
        selectedDegrees.length === 0
          ? true
          : selectedDegrees.some((degree) => m.degreesList.includes(degree));

      const matchesUniversityRank =
        selectedUniversityRanks.length === 0
          ? true
          : selectedUniversityRanks.includes(m.universityRank);

      const matchesUniversityAffiliation =
        selectedUniversityAffiliations.length === 0
          ? true
          : selectedUniversityAffiliations.includes(m.universityAffiliation);

      const matchesMentoringExperience =
        selectedMentoringExperience.length === 0
          ? true
          : selectedMentoringExperience.includes(m.hasMentoringExperience);

      return (
        matchesSearch &&
        matchesSpecialtyGroup &&
        matchesSpecialty &&
        matchesAcademicRank &&
        matchesDegrees &&
        matchesUniversityRank &&
        matchesUniversityAffiliation &&
        matchesMentoringExperience
      );
    });
  }, [
    searchQuery,
    mappedMentors,
    selectedSpecialtyGroups,
    selectedSpecialties,
    selectedAcademicRanks,
    selectedDegrees,
    selectedUniversityRanks,
    selectedUniversityAffiliations,
    selectedMentoringExperience,
  ]);

  return (
    <div className="mentors-page" dir="rtl">
      <div className="page-intro-wrapper">
        <div className="page-intro-card">
          <h1 className="page-intro-title">הכירו את המנחים למחקר בשיבא</h1>
          <p className="page-intro-description">
            מאגר המנחים של בית החולים שיבא מאגד רופאות ורופאים המובילים מחקרים
            פעילים ומלווים סטודנטים בתהליכי הכשרה אקדמיים.
          </p>
        </div>
      </div>

      {loading && <LoadingSpinner text="טוען מנחים..." />}
      {error && <p className="mentors-status-msg error">{error}</p>}

      {!loading && !error && (
        <>
         <div className="mentors-search-row">
          <div className="mentors-search-wrapper">
            <SearchAutocomplete
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="חיפוש מנחה..."
              items={mappedMentors}
              extractTerms={extractMentorTerms}
              wrapperClassName=""
              innerClassName=""
              inputClassName="mentors-search-input"
              iconClassName="mentors-search-icon"
            />

            <button
              type="button"
              className={`mentors-inline-filter-btn ${
                showAdvancedFilters ? "active" : ""
              }`}
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
            >
              <img
                src={filterIcon}
                alt="filter"
                className="mentors-inline-filter-icon"
              />
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mentors-active-filters">
            {selectedSpecialties.map((item) => (
              <button
                key={item}
                className="mentors-active-filter-chip"
                onClick={() =>
                  setSelectedSpecialties((prev) =>
                    prev.filter((v) => v !== item)
                  )
                }
              >
                {item}
                <span>×</span>
              </button>
            ))}

            {selectedAcademicRanks.map((item) => (
              <button
                key={item}
                className="mentors-active-filter-chip"
                onClick={() =>
                  setSelectedAcademicRanks((prev) =>
                    prev.filter((v) => v !== item)
                  )
                }
              >
                {item}
                <span>×</span>
              </button>
            ))}

            {selectedDegrees.map((item) => (
              <button
                key={item}
                className="mentors-active-filter-chip"
                onClick={() =>
                  setSelectedDegrees((prev) =>
                    prev.filter((v) => v !== item)
                  )
                }
              >
                {item}
                <span>×</span>
              </button>
            ))}

            {selectedUniversityRanks.map((item) => (
              <button
                key={item}
                className="mentors-active-filter-chip"
                onClick={() =>
                  setSelectedUniversityRanks((prev) =>
                    prev.filter((v) => v !== item)
                  )
                }
              >
                {item}
                <span>×</span>
              </button>
            ))}

            {selectedUniversityAffiliations.map((item) => (
              <button
                key={item}
                className="mentors-active-filter-chip"
                onClick={() =>
                  setSelectedUniversityAffiliations((prev) =>
                    prev.filter((v) => v !== item)
                  )
                }
              >
                {item}
                <span>×</span>
              </button>
            ))}

            {selectedMentoringExperience.map((item) => (
              <button
                key={item}
                className="mentors-active-filter-chip"
                onClick={() =>
                  setSelectedMentoringExperience((prev) =>
                    prev.filter((v) => v !== item)
                  )
                }
              >
                ניסיון בהנחיה: {item}
                <span>×</span>
              </button>
            ))}
          </div>
        )}


        {showAdvancedFilters && (
          <div className="mentors-advanced-filters" ref={filtersRef}>
            <div className="mentors-filter-item">
              <button
                type="button"
                className="mentors-filter-button"
                onClick={() =>
                  setOpenFilter(
                    openFilter === "specialties" ? null : "specialties",
                  )
                }
              >
                סינון לפי קטגוריית התמחות
                <span>{openFilter === "specialties" ? "▲" : "▼"}</span>
              </button>

              {openFilter === "specialties" && (
                <div className="mentors-filter-dropdown mentors-specialty-dropdown">
                  <div className="mentors-specialty-groups">
                    {SPECIALTY_GROUPS.map((group) => (
                      <button
                        key={group.key}
                        type="button"
                        className={`mentors-filter-option ${
                          selectedSpecialtyGroups.includes(group.key)
                            ? "active"
                            : ""
                        }`}
                        onClick={() => toggleSpecialtyGroup(group.key)}
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>

                  {activeSpecialtyGroup && (
                    <div className="mentors-specialty-values">
                      {activeGroupValues.map((specialty) => (
                        <button
                          key={specialty}
                          type="button"
                          className={`mentors-filter-option ${
                            selectedSpecialties.includes(specialty)
                              ? "active"
                              : ""
                          }`}
                          onClick={() =>
                            toggleValue(specialty, setSelectedSpecialties)
                          }
                        >
                          {specialty}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mentors-filter-item">
              <button
                type="button"
                className="mentors-filter-button"
                onClick={() =>
                  setOpenFilter(
                    openFilter === "academic-rank" ? null : "academic-rank",
                  )
                }
              >
                סינון לפי שלב בהכשרה
                <span>{openFilter === "academic-rank" ? "▲" : "▼"}</span>
              </button>

              {openFilter === "academic-rank" && (
                <div className="mentors-filter-dropdown">
                  <div className="mentors-filter-dropdown-column">
                    {ACADEMIC_RANK_OPTIONS.map((rank) => (
                      <button
                        key={rank}
                        type="button"
                        className={`mentors-filter-option ${
                          selectedAcademicRanks.includes(rank) ? "active" : ""
                        }`}
                        onClick={() =>
                          toggleValue(rank, setSelectedAcademicRanks)
                        }
                      >
                        {rank}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mentors-filter-item">
              <button
                type="button"
                className="mentors-filter-button"
                onClick={() =>
                  setOpenFilter(openFilter === "degrees" ? null : "degrees")
                }
              >
                סינון לפי תארים
                <span>{openFilter === "degrees" ? "▲" : "▼"}</span>
              </button>

              {openFilter === "degrees" && (
                <div className="mentors-filter-dropdown">
                  <div className="mentors-filter-dropdown-column">
                    {DEGREE_OPTIONS.map((degree) => (
                      <button
                        key={degree}
                        type="button"
                        className={`mentors-filter-option ${
                          selectedDegrees.includes(degree) ? "active" : ""
                        }`}
                        onClick={() => toggleValue(degree, setSelectedDegrees)}
                      >
                        {degree}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mentors-filter-item">
              <button
                type="button"
                className="mentors-filter-button"
                onClick={() =>
                  setOpenFilter(
                    openFilter === "university-rank" ? null : "university-rank",
                  )
                }
              >
                סינון לפי דרגה אקדמית
                <span>{openFilter === "university-rank" ? "▲" : "▼"}</span>
              </button>

              {openFilter === "university-rank" && (
                <div className="mentors-filter-dropdown">
                  <div className="mentors-filter-dropdown-column">
                    {UNIVERSITY_RANK_OPTIONS.map((rank) => (
                      <button
                        key={rank}
                        type="button"
                        className={`mentors-filter-option ${
                          selectedUniversityRanks.includes(rank) ? "active" : ""
                        }`}
                        onClick={() =>
                          toggleValue(rank, setSelectedUniversityRanks)
                        }
                      >
                        {rank}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {shouldShowUniversityAffiliation && (
              <div className="mentors-filter-item">
                <button
                  type="button"
                  className="mentors-filter-button"
                  onClick={() =>
                    setOpenFilter(
                      openFilter === "university-affiliation"
                        ? null
                        : "university-affiliation",
                    )
                  }
                >
                  סינון לפי שיוך אקדמי
                  <span>
                    {openFilter === "university-affiliation" ? "▲" : "▼"}
                  </span>
                </button>

                {openFilter === "university-affiliation" && (
                  <div className="mentors-filter-dropdown">
                    <div className="mentors-filter-dropdown-column">
                      {UNIVERSITY_AFFILIATION_OPTIONS.map((institution) => (
                        <button
                          key={institution}
                          type="button"
                          className={`mentors-filter-option ${
                            selectedUniversityAffiliations.includes(institution)
                              ? "active"
                              : ""
                          }`}
                          onClick={() =>
                            toggleValue(
                              institution,
                              setSelectedUniversityAffiliations,
                            )
                          }
                        >
                          {institution}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mentors-filter-item">
              <button
                type="button"
                className="mentors-filter-button"
                onClick={() =>
                  setOpenFilter(
                    openFilter === "mentoring-experience"
                      ? null
                      : "mentoring-experience",
                  )
                }
              >
                סינון לפי ניסיון בהנחיה
                <span>
                  {openFilter === "mentoring-experience" ? "▲" : "▼"}
                </span>
              </button>

              {openFilter === "mentoring-experience" && (
                <div className="mentors-filter-dropdown">
                  <div className="mentors-filter-dropdown-column">
                    {YES_NO_OPTIONS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`mentors-filter-option ${
                          selectedMentoringExperience.includes(value)
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          toggleValue(value, setSelectedMentoringExperience)
                        }
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="mentors-clear-filters"
                onClick={clearAdvancedFilters}
              >
                ניקוי סינון
              </button>
            )}
          </div>
        )}

          <div className="cards-grid mentors-layout">
            {filteredMentors.slice(0, visibleCount).map((m) => (
              <MentorsCard key={m.id || m.email} mentor={m} />
            ))}
          </div>

          {visibleCount < filteredMentors.length && (
            <div className="mentors-load-more-wrap">
              <button
                type="button"
                className="mentors-load-more-btn"
                onClick={() => setVisibleCount((prev) => prev + 20)}
              >
                הצג עוד מנחים
              </button>
            </div>
          )}

          {filteredMentors.length === 0 && (
            <EmptyState message="לא נמצאו תוצאות לחיפוש הנוכחי." />
          )}
        </>
      )}
    </div>
  );
}