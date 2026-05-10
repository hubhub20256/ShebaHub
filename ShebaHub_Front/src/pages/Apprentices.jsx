import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ApprenticeCard from "../components/apprenticeCard";
import SearchAutocomplete from "../components/SearchAutocomplete";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { profilesAPI } from "../services/api";
import usePageTitle from "../hooks/usePageTitle";

import "../components/card.css";
import "../styles/Apprentices.css";

import AdvancedFilters from "../components/AdvancedFilters";
import filterIcon from "../assets/filter.png";


const currentYear = new Date().getFullYear();

const APPRENTICE_STAGE_OPTIONS = [
  "סטודנט",
  "לפני סטאז׳",
  "סטאז׳ר",
  "אחרי סטאז׳",
  "מתמחה",
  "רופא מתמחה",
  "אחר",
];

const YEAR_OF_STUDY_OPTIONS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ז'"];

const START_YEAR_OPTIONS = Array.from(
  { length: currentYear - 1940 + 1 },
  (_, i) => String(currentYear - i),
);

const INSTITUTION_OPTIONS = [
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

const DEGREE_OPTIONS = [
  "MD",
  "PhD",
  "MSc",
  "MPH",
  "MBA",
  "BSc",
  "ללא תואר קודם",
];

const COMPENSATION_OPTIONS = [
  "מלגה",
  "שכר",
  "קרדיט אקדמי",
  "ללא תגמול / התנדבות",
  "גמיש",
];

const YES_NO_OPTIONS = ["כן", "לא"];

const WEEKLY_HOURS_OPTIONS = Array.from({ length: 168 }, (_, i) =>
  String(i + 1),
);

const INITIAL_FILTERS = {
  medical_level: [],
  yearOfStudy: [],
  Educational_institution: [],
  school_beginner_year: [],
  degrees: [],
  isShebaEmployee: [],
  isAvailableForResearch: [],
  compensationPreference: [],
  weeklyHours: [],
  startDate: "",
};

function normalizeYesNo(value) {
  if (value === true || value === "true" || value === "כן") return "כן";
  if (value === false || value === "false" || value === "לא") return "לא";
  return "";
}

function normalizeWeeklyHours(value) {
  if (value === undefined || value === null || value === "") return "";
  return String(value).match(/\d+/)?.[0] || "";
}

export default function Apprentices() {
  usePageTitle("מתלמדים");

  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(20);

  const [openFilter, setOpenFilter] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState(INITIAL_FILTERS);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const filtersRef = useRef(null);

  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, selectedFilters]);

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
        const data = await profilesAPI.listStudents();
        const list = Array.isArray(data) ? data : data?.results || [];

        if (!isMounted) return;
        setStudents(list);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.data?.detail || "שגיאה בטעינת מתלמדים");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const mappedApprentices = useMemo(() => {
    return (students || []).map((s) => {
      const rawWeeklyHours =
        s.weeklyHours ??
        s.weekly_hours ??
        s.weeklyHoursPerWeek ??
        s.weekly_hours_per_week ??
        s.weeklyHoursDisplay ??
        "";

      return {
        id: s.id,
        name: s.name || "",
        gender: s.genderDisplay || s.gender || "",
        email: s.email || "",

        medical_level: s.apprenticeStage || "",
        school_beginner_year: s.startYear ? String(s.startYear) : "",
        yearOfStudy: s.yearOfStudy || "",

        Educational_institution:
          s.institution === "__other__" ? "אחר" : s.institution || "",

        degrees: Array.isArray(s.degrees) ? s.degrees : [],

        isShebaEmployee: normalizeYesNo(s.isShebaEmployee),
        isAvailableForResearch: normalizeYesNo(s.isAvailableForResearch),

        compensationPreference: Array.isArray(s.compensationPreference)
          ? s.compensationPreference
          : [],

        weeklyHours: normalizeWeeklyHours(rawWeeklyHours),
        startDate: s.startDate || "",
        profileImage: s.avatarUrl || null,
      };
    });
  }, [students]);

  const extractApprenticeTerms = useCallback(
    (a) => [
      a.name,
      a.medical_level,
      a.yearOfStudy,
      a.Educational_institution,
      a.school_beginner_year,
    ],
    [],
  );

  function toggleFilterValue(fieldName, value) {
    setSelectedFilters((prev) => {
      const currentValues = prev[fieldName] || [];

      if (currentValues.includes(value)) {
        return {
          ...prev,
          [fieldName]: currentValues.filter((item) => item !== value),
        };
      }

      return {
        ...prev,
        [fieldName]: [...currentValues, value],
      };
    });
  }

  function clearFilters() {
    setSelectedFilters(INITIAL_FILTERS);
    setOpenFilter(null);
  }

  const filterGroups = useMemo(() => {
    const groups = [
      {
        key: "medical_level",
        title: "סינון לפי שלב הכשרה",
        values: APPRENTICE_STAGE_OPTIONS,
      },
    ];

    if (selectedFilters.medical_level.includes("סטודנט")) {
      groups.push({
        key: "yearOfStudy",
        title: "סינון לפי שנה בתואר",
        values: YEAR_OF_STUDY_OPTIONS,
      });
    }

    groups.push(
      {
        key: "school_beginner_year",
        title: "סינון לפי שנת תחילת לימודים",
        values: START_YEAR_OPTIONS,
      },
      {
        key: "Educational_institution",
        title: "סינון לפי מוסד לימודים",
        values: INSTITUTION_OPTIONS,
      },
      {
        key: "isShebaEmployee",
        title: "סינון לפי מועסק/ת בשיבא",
        values: YES_NO_OPTIONS,
      },
      {
        key: "degrees",
        title: "סינון לפי תארים",
        values: DEGREE_OPTIONS,
      },
      {
        key: "isAvailableForResearch",
        title: "סינון לפי זמינות למחקר",
        values: YES_NO_OPTIONS,
      },
      {
        key: "compensationPreference",
        title: "סינון לפי העדפת תגמול",
        values: COMPENSATION_OPTIONS,
      },
      {
        key: "weeklyHours",
        title: "סינון לפי היקף שעות שבועי",
        values: WEEKLY_HOURS_OPTIONS,
      },
    );

    return groups;
  }, [selectedFilters.medical_level]);

  const hasActiveFilters = Object.entries(selectedFilters).some(
    ([, value]) => Array.isArray(value) ? value.length > 0 : value !== "",
  );

  const filtersConfig = filterGroups.map((group) => ({
    key: group.key,
    label: group.title,
    options: group.values,
    selectedValues: selectedFilters[group.key] || [],
    onToggle: (value) => toggleFilterValue(group.key, value),
  }));

  const filteredApprentices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return mappedApprentices.filter((a) => {
      const matchesSearch = !q
        ? true
        : [
            a.name,
            a.medical_level,
            a.yearOfStudy,
            a.Educational_institution,
            a.school_beginner_year,
            a.gender,
            a.email,
            a.isShebaEmployee,
            a.isAvailableForResearch,
            a.weeklyHours,
            a.startDate,
            ...(a.degrees || []),
            ...(a.compensationPreference || []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);

      const matchesAdvancedFilters = Object.entries(selectedFilters).every(
        ([fieldName, selectedValues]) => {
          if (fieldName === "startDate") {
            if (!selectedValues) return true;
            return a.startDate && a.startDate >= selectedValues;
          }

          if (!selectedValues || selectedValues.length === 0) return true;

          if (fieldName === "weeklyHours") {
            const apprenticeHours = Number(a.weeklyHours);

            return selectedValues.some(
              (selectedHour) => Number(selectedHour) === apprenticeHours,
            );
          }

          const apprenticeValue = a[fieldName];

          if (Array.isArray(apprenticeValue)) {
            return apprenticeValue.some((value) =>
              selectedValues.includes(value),
            );
          }

          return selectedValues.includes(apprenticeValue);
        },
      );

      return matchesSearch && matchesAdvancedFilters;
    });
  }, [searchQuery, mappedApprentices, selectedFilters]);

  return (
    <div className="apprentices-page" dir="rtl">
      <div className="page-intro-wrapper">
        <div className="page-intro-card">
          <h1 className="page-intro-title">הכירו את שותפי המחקר הבאים שלכם</h1>
          <p className="page-intro-description">
            כאן תוכלו למצוא את דור העתיד של החוקרים בשיבא. המאגר מציג סטודנטים
            לרפואה ומתלמדים המשתלבים בפרויקטים מחקריים במחלקות השונות.
          </p>
        </div>
      </div>

      {loading && <LoadingSpinner text="טוען מתלמדים..." />}

      {error && (
        <p className="apprentices-no-results" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="mentors-search-row">
          <div className="mentors-search-wrapper">
            <SearchAutocomplete
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="חיפוש לפי שם מתלמד/ת, תחומי עניין מחקרי, זמינות למחקר ועוד.."
              items={mappedApprentices}
              extractTerms={extractApprenticeTerms}
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
            {Object.entries(selectedFilters).map(([fieldName, value]) => {
              if (Array.isArray(value)) {
                return value.map((item) => (
                  <button
                    key={`${fieldName}-${item}`}
                    type="button"
                    className="mentors-active-filter-chip"
                    onClick={() => toggleFilterValue(fieldName, item)}
                  >
                    {item}
                    <span>×</span>
                  </button>
                ));
              }

              if (!value) return null;

              return (
                <button
                  key={fieldName}
                  type="button"
                  className="mentors-active-filter-chip"
                  onClick={() =>
                    setSelectedFilters((prev) => ({
                      ...prev,
                      [fieldName]: "",
                    }))
                  }
                >
                  זמינות להתחלה: {value}
                  <span>×</span>
                </button>
              );
            })}
          </div>
        )}

        {showAdvancedFilters && (        
          <AdvancedFilters
            filtersRef={filtersRef}
            openFilter={openFilter}
            setOpenFilter={setOpenFilter}
            filtersConfig={filtersConfig}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
            classPrefix="mentors"
          />
        )}

          <div className="cards-grid apprentices-layout">
            {filteredApprentices.slice(0, visibleCount).map((a) => (
              <ApprenticeCard key={a.id} apprentice={a} />
            ))}
          </div>

          {visibleCount < filteredApprentices.length && (
            <div className="apprentices-load-more-wrap">
              <button
                type="button"
                className="apprentices-load-more-btn"
                onClick={() => setVisibleCount((prev) => prev + 20)}
              >
                הצג עוד מתלמדים
              </button>
            </div>
          )}

          {filteredApprentices.length === 0 && (
            <EmptyState message="לא נמצאו תוצאות." />
          )}
        </>
      )}
    </div>
  );
}