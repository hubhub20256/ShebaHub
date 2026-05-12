import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ResearchCard from "../components/researchCard";
import SearchAutocomplete from "../components/SearchAutocomplete";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { researchAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import usePageTitle from "../hooks/usePageTitle";
import "../components/card.css";
import "../styles/Researches.css";
import AdvancedFilters from "../components/AdvancedFilters";
import filterIcon from "../assets/filter.png";


const WORK_MODE_OPTIONS = ["פרונטלי", "היברידי", "מרחוק"];
const STATUS_OPTIONS = ["פעיל", "מגייס", "הסתיים", "בהקפאה", "טיוטה"];
const YES_NO_OPTIONS = ["כן", "לא"];
const DATA_TYPE_OPTIONS = ["רטרוספקטיבי", "פרוספקטיבי"];
const TEAM_SIZE_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8+"];
const WEEKLY_HOURS_OPTIONS = ["1-5", "6-10", "11-15", "16-20", "21-30", "31-40", "40+"];
const DURATION_OPTIONS = ["1-3 חודשים", "4-6 חודשים", "7-12 חודשים", "13-24 חודשים", "25-36 חודשים", "37-48 חודשים", "49-60 חודשים"];
const COMPENSATION_OPTIONS = ["מלגה", "שכר", "קרדיט אקדמי", "ללא תגמול / התנדבות", "גמיש"];
const ACADEMIC_TRACK_OPTIONS = ["עבודת גמר", "תזה", "PhD", "מדעי יסוד"];
const LOCATION_OPTIONS = [];

const STATUS_LABELS = {
  open: "פעיל",
  in_progress: "מגייס",
  completed: "הסתיים",
  closed: "בהקפאה",
  draft: "טיוטה",
};

export default function Researches() {
  usePageTitle("מחקרים");
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [researches, setResearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [joinedIds, setJoinedIds] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(20);

  const [openFilter, setOpenFilter] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [selectedWorkModes, setSelectedWorkModes] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedHelsinkiApproval, setSelectedHelsinkiApproval] = useState([]);
  const [selectedDataTypes, setSelectedDataTypes] = useState([]);
  const [selectedTeamSizes, setSelectedTeamSizes] = useState([]);
  const [selectedWeeklyHours, setSelectedWeeklyHours] = useState([]);
  const [selectedDurations, setSelectedDurations] = useState([]);
  const [selectedCompensations, setSelectedCompensations] = useState([]);
  const [selectedAcademicTracks, setSelectedAcademicTracks] = useState([]);

  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [selectedLocations, setSelectedLocations] = useState([]);


  const filtersRef = useRef(null);
    
  
  
  useEffect(() => {
    setVisibleCount(20);
  }, [
    searchQuery,
    selectedWorkModes,
    selectedStatuses,
    selectedHelsinkiApproval,
    selectedDataTypes,
    selectedTeamSizes,
    selectedWeeklyHours,
    selectedDurations,
    selectedCompensations,
    selectedAcademicTracks,
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


  const splitList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value)
      .split(/[\n,;|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const mapApiResearchToCard = (r) => ({
    id: r.id,
    title: r.researchName,
    description: r.description,
    fields: splitList(r.researchArea),
    mentors: splitList(r.mentors),
    apprenticesCount: r.teamSize ?? "",
    startDate: r.startDate,
    hoursScope: r.weeklyHours ? `${r.weeklyHours} שעות בשבוע` : "",
    duration: r.durationMonths ? `${r.durationMonths} חודשים` : "",
    rewards: Array.isArray(r.compensation)
      ? r.compensation.join(", ")
      : r.compensation || "",
    status: r.status || "",
    statusLabel: STATUS_LABELS[r.status] || r.status || "",
    acceptingApplications: r.accepting_applications,
    isFull: r.isFull || false,
    location: r.location || "",

    workMode: r.workMode || r.work_mode || "",
    helsinkiApproval: r.helsinkiApproval || r.helsinki_approval || "",
    dataType: r.dataType || r.data_type || "",
    teamSize: Number(r.teamSize || r.team_size || 0),
    weeklyHours: Number(r.weeklyHours || r.weekly_hours || 0),
    durationMonths: Number(r.durationMonths || r.duration_months || 0),
    compensationList: splitList(r.compensation),
    academicTracks: splitList(r.academicTracks || r.academic_tracks),
    estimatedCompletionDate:
      r.estimatedCompletionDate || r.estimated_completion_date || "",
      
  });

  const loadResearches = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await researchAPI.listResearches();
      setResearches(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.data?.detail || "שגיאה בטעינת מחקרים");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadJoinedIds = useCallback(async () => {
    if (!user) return;
    try {
      const data = await researchAPI.listJoinedResearches();
      if (Array.isArray(data)) {
        setJoinedIds(new Set(data.map((r) => r.id)));
      }
    } catch {
      /* non-blocking */
    }
  }, [user]);

  useEffect(() => {
    loadResearches();
  }, [loadResearches]);

  useEffect(() => {
    loadJoinedIds();
  }, [loadJoinedIds]);

  // Re-fetch when page regains focus (throttled to once per 30s)
  const lastFocusRef = useRef(0);
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusRef.current < 30000) return;
      lastFocusRef.current = now;
      loadResearches();
      loadJoinedIds();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadResearches, loadJoinedIds]);

  const activeList = useMemo(
    () => researches.map(mapApiResearchToCard),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [researches],
  );

  const extractResearchTerms = useCallback(
    (r) => [
      r.title,
      ...r.fields,
      ...r.mentors,
      r.rewards,
      r.hoursScope,
      r.duration,
    ],
    [],
  );

  function toggleValue(value, setter) {
    setter((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  }
  
  function clearAdvancedFilters() {
    setSelectedWorkModes([]);
    setSelectedStatuses([]);
    setSelectedHelsinkiApproval([]);
    setSelectedDataTypes([]);
    setSelectedTeamSizes([]);
    setSelectedWeeklyHours([]);
    setSelectedDurations([]);
    setSelectedCompensations([]);
    setSelectedAcademicTracks([]);
    setSelectedLocations([]);
    setOpenFilter(null);
    setSelectedStartDate("");
    setSelectedEndDate("");
  }
  
  function matchesNumberRange(value, selectedRanges) {
    if (selectedRanges.length === 0) return true;
  
    const numericValue = Number(value);
    if (!numericValue) return false;
  
    return selectedRanges.some((range) => {
      if (String(range).includes("+")) {
        const min = Number(String(range).replace("+", ""));
        return numericValue >= min;
      }
  
      if (String(range).includes("-")) {
        const [min, max] = String(range).split("-").map(Number);
        return numericValue >= min && numericValue <= max;
      }
  
      return numericValue === Number(range);
    });
  }
  
  const hasActiveFilters =
    selectedStartDate ||
    selectedEndDate ||
    selectedLocations.length > 0 ||
    selectedWorkModes.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedHelsinkiApproval.length > 0 ||
    selectedDataTypes.length > 0 ||
    selectedTeamSizes.length > 0 ||
    selectedWeeklyHours.length > 0 ||
    selectedDurations.length > 0 ||
    selectedCompensations.length > 0 ||
    selectedAcademicTracks.length > 0
    ;
  
  const filtersConfig = [
    {
      key: "workMode",
      label: "סינון לפי אופן עבודה",
      options: WORK_MODE_OPTIONS,
      selectedValues: selectedWorkModes,
      onToggle: (value) => toggleValue(value, setSelectedWorkModes),
    },
    {
      key: "status",
      label: "סינון לפי סטטוס מחקר",
      options: STATUS_OPTIONS,
      selectedValues: selectedStatuses,
      onToggle: (value) => toggleValue(value, setSelectedStatuses),
    },
    {
      key: "helsinkiApproval",
      label: "סינון לפי אישור הלסינקי",
      options: YES_NO_OPTIONS,
      selectedValues: selectedHelsinkiApproval,
      onToggle: (value) => toggleValue(value, setSelectedHelsinkiApproval),
    },
    {
      key: "dataType",
      label: "סינון לפי סוג נתונים",
      options: DATA_TYPE_OPTIONS,
      selectedValues: selectedDataTypes,
      onToggle: (value) => toggleValue(value, setSelectedDataTypes),
    },
    {
      key: "teamSize",
      label: "סינון לפי גודל צוות",
      options: TEAM_SIZE_OPTIONS,
      selectedValues: selectedTeamSizes,
      onToggle: (value) => toggleValue(value, setSelectedTeamSizes),
    },
    {
      key: "weeklyHours",
      label: "סינון לפי שעות שבועיות",
      options: WEEKLY_HOURS_OPTIONS,
      selectedValues: selectedWeeklyHours,
      onToggle: (value) => toggleValue(value, setSelectedWeeklyHours),
    },
    {
      key: "duration",
      label: "סינון לפי משך מחקר",
      options: DURATION_OPTIONS,
      selectedValues: selectedDurations,
      onToggle: (value) => toggleValue(value, setSelectedDurations),
    },
    {
      key: "compensation",
      label: "סינון לפי סוג תגמול",
      options: COMPENSATION_OPTIONS,
      selectedValues: selectedCompensations,
      onToggle: (value) => toggleValue(value, setSelectedCompensations),
    },
    {
      key: "academicTracks",
      label: "סינון לפי מסלול אקדמי",
      options: ACADEMIC_TRACK_OPTIONS,
      selectedValues: selectedAcademicTracks,
      onToggle: (value) => toggleValue(value, setSelectedAcademicTracks),
    },
    {
      key: "dates",
      label: "סינון לפי תאריכים",
      customContent: (
        <div className="researches-date-filter">
          <label>
            תאריך התחלה
            <input
              type="date"
              value={selectedStartDate}
              onChange={(e) => setSelectedStartDate(e.target.value)}
            />
          </label>
    
          <label>
            תאריך סיום
            <input
              type="date"
              value={selectedEndDate}
              onChange={(e) => setSelectedEndDate(e.target.value)}
            />
          </label>
        </div>
      ),
    },
    {
      key: "location",
      label: "סינון לפי מיקום",
      options: LOCATION_OPTIONS,
      selectedValues: selectedLocations,
      onToggle: (value) => toggleValue(value, setSelectedLocations),
    },
  ];

  const filteredResearches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    
    return activeList.filter((r) => {
      const matchesSearch = !q
        ? true
        : [
            r.title,
            r.description,
            r.fields.join(" "),
            r.mentors.join(" "),
            String(r.apprenticesCount),
            r.startDate,
            r.hoursScope,
            r.duration,
            r.rewards,
            r.statusLabel,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);

      const matchesStartDate =
      !selectedStartDate ||
      new Date(r.startDate) >= new Date(selectedStartDate);

      const matchesEndDate =
      !selectedEndDate ||
      new Date(r.estimatedCompletionDate) <= new Date(selectedEndDate);

  
      const matchesWorkMode =
        selectedWorkModes.length === 0 ||
        selectedWorkModes.includes(r.workMode);
  
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(r.statusLabel);
  
      const matchesHelsinki =
        selectedHelsinkiApproval.length === 0 ||
        selectedHelsinkiApproval.includes(r.helsinkiApproval);
  
      const matchesDataType =
        selectedDataTypes.length === 0 ||
        selectedDataTypes.includes(r.dataType);
  
      const matchesTeamSize = matchesNumberRange(
        r.teamSize,
        selectedTeamSizes,
      );
  
      const matchesWeeklyHours = matchesNumberRange(
        r.weeklyHours,
        selectedWeeklyHours,
      );
  
      const matchesDuration = matchesNumberRange(
        r.durationMonths,
        selectedDurations,
      );
  
      const matchesCompensation =
        selectedCompensations.length === 0 ||
        selectedCompensations.some((item) =>
          r.compensationList.includes(item),
        );
  
      const matchesAcademicTracks =
        selectedAcademicTracks.length === 0 ||
        selectedAcademicTracks.some((item) =>
          r.academicTracks.includes(item),
        );

      const matchesLocation =
        selectedLocations.length === 0 ||
        selectedLocations.includes(r.location);
  
      return (
        matchesStartDate &&
        matchesEndDate &&
        matchesSearch &&
        matchesWorkMode &&
        matchesStatus &&
        matchesHelsinki &&
        matchesDataType &&
        matchesTeamSize &&
        matchesWeeklyHours &&
        matchesDuration &&
        matchesCompensation &&
        matchesAcademicTracks &&
        matchesLocation
      ); 
    });
  }, [
    searchQuery,
    activeList,
    selectedWorkModes,
    selectedStatuses,
    selectedHelsinkiApproval,
    selectedDataTypes,
    selectedTeamSizes,
    selectedWeeklyHours,
    selectedDurations,
    selectedCompensations,
    selectedAcademicTracks,
    selectedStartDate,
    selectedEndDate,
    selectedLocations,
  ]);

  return (
    <div className="researches-page" dir="rtl">
      <div className="page-intro-wrapper">  
        <div className="page-intro-card">
          <h1 className="page-intro-title">
            זירת המחקר של שיבא: פרויקטים, מחקרים והזדמנויות
          </h1>

          <div className="page-intro-separator"></div>

          <p className="page-intro-description">
            לפניכם מאגר המחקרים הפעילים והעתידיים בבית החולים. כאן תוכלו להיחשף
            לחזית העשייה המדעית, לעיין בפרטי המחקרים במחלקות השונות ולמצוא
            פרויקטים המחפשים שותפים או ליווי מחקרי.
          </p>
        </div>
      </div>

      {loading && <LoadingSpinner text="טוען מחקרים..." />}
      {error && (
        <p className="researches-no-results" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="researches-search-row">
            <div className="researches-search-wrapper">
              <SearchAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="חיפוש לפי שם, תחום, מנחה, שעות, משך, גמולים"
                items={activeList}
                extractTerms={extractResearchTerms}
                wrapperClassName=""
                innerClassName=""
                inputClassName="researches-search-input"
                iconClassName="researches-search-icon"
              />

              <button
                type="button"
                className={`researches-inline-filter-btn ${
                  showAdvancedFilters ? "active" : ""
                }`}
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
              >
                <img
                  src={filterIcon}
                  alt="filter"
                  className="researches-inline-filter-icon"
                />
              </button>
            </div>
          </div>

{showAdvancedFilters && (
  <AdvancedFilters
    filtersRef={filtersRef}
    openFilter={openFilter}
    setOpenFilter={setOpenFilter}
    filtersConfig={filtersConfig}
    hasActiveFilters={hasActiveFilters}
    clearFilters={clearAdvancedFilters}
    classPrefix="researches"
  />
)}

          <div className="cards-grid researches-layout">
            {filteredResearches.slice(0, visibleCount).map((r) => (
              <ResearchCard
                key={r.id}
                research={r}
                joined={joinedIds.has(r.id)}
              />
            ))}
          </div>

          {visibleCount < filteredResearches.length && (
            <div className="researches-load-more-wrap">
              <button
                type="button"
                className="researches-load-more-btn"
                onClick={() => setVisibleCount((prev) => prev + 20)}
              >
                הצג עוד מחקרים
              </button>
            </div>
          )}

          {filteredResearches.length === 0 && (
            <EmptyState message="לא נמצאו מחקרים תואמים." />
          )}
        </>
      )}
    </div>
  );
}
