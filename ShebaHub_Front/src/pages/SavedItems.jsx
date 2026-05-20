import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { savedItemsAPI, researchAPI, profilesAPI } from "../services/api";
import "../styles/SavedItems.css";
import ResearchCard from "../components/researchCard";
import MentorsCard from "../components/mentorsCard";
import ApprenticesCard from "../components/apprenticeCard";

const splitList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(/[\n,;|]+/).map((s) => s.trim()).filter(Boolean);
};

const mapResearchToCard = (r) => ({
  id: r.id,
  title: r.researchName,
  description: r.description || "",
  fields: splitList(r.researchArea),
  mentors: splitList(r.mentors),
  apprenticesCount: r.teamSize ?? "",
  startDate: r.startDate || "",
  hoursScope: r.weeklyHours ? `${r.weeklyHours} שעות בשבוע` : "",
  duration: r.durationMonths ? `${r.durationMonths} חודשים` : "",
  rewards: Array.isArray(r.compensation) ? r.compensation.join(", ") : r.compensation || "",
  status: r.status || "",
  acceptingApplications: r.accepting_applications ?? true,
  isFull: r.isFull ?? false,
});

const SavedItems = () => {
  const [activeTab, setActiveTab] = useState("researches");
  const { user } = useAuth();

  const [researches, setResearches] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [apprentices, setApprentices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSavedItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const savedItems = await savedItemsAPI.list();

      const researchIds = savedItems
        .filter((s) => s.contentType === "research")
        .map((s) => s.objectId);
      const mentorIds = savedItems
        .filter((s) => s.contentType === "mentor_profile")
        .map((s) => s.objectId);
      const studentIds = savedItems
        .filter((s) => s.contentType === "student_profile")
        .map((s) => s.objectId);

      // Resolve full details in parallel; skip deleted/missing items
      const [researchResults, mentorResults, studentResults] = await Promise.all([
        Promise.all(researchIds.map((id) => researchAPI.getResearch(id).catch(() => null))),
        Promise.all(mentorIds.map((id) => profilesAPI.getMentor(id).catch(() => null))),
        Promise.all(studentIds.map((id) => profilesAPI.getStudent(id).catch(() => null))),
      ]);

      setResearches(researchResults.filter(Boolean).map(mapResearchToCard));
      setMentors(mentorResults.filter(Boolean));
      setApprentices(studentResults.filter(Boolean));
    } catch {
      setError("שגיאה בטעינת הפריטים השמורים");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSavedItems();
  }, [fetchSavedItems]);

  const renderItems = () => {
    if (loading) {
      return <div className="saved-empty-state">טוען...</div>;
    }
    if (error) {
      return <div className="saved-empty-state">{error}</div>;
    }

    let items = [];
    if (activeTab === "researches") items = researches;
    if (activeTab === "mentors") items = mentors;
    if (activeTab === "apprentices") items = apprentices;

    if (items.length === 0) {
      return <div className="saved-empty-state">לא נמצאו פריטים שמורים</div>;
    }

    return (
      <div
        className={`saved-grid ${
          activeTab === "researches" ? "research-layout" : ""
        } ${activeTab === "mentors" ? "mentors-layout" : ""} ${
          activeTab === "apprentices" ? "apprentices-layout" : ""
        }`}
      >
        {items.map((item) => {
          if (activeTab === "researches") {
            return <ResearchCard key={item.id} research={item} />;
          }

          if (activeTab === "mentors") {
            return (
              <MentorsCard
                key={item.id}
                mentor={{
                  id: item.id,
                  name: item.name,
                  profileImage: item.avatarUrl,
                  specialty: item.specialty,
                  specialties: item.specialties,
                  degrees: item.degrees,
                  gender: item.genderDisplay || item.gender,
                }}
              />
            );
          }

          return (
            <ApprenticesCard
              key={item.id}
              apprentice={{
                id: item.id,
                name: item.name,
                profileImage: item.avatarUrl,
                isAvailableForResearch: item.isAvailableForResearch,
                medical_level: item.apprenticeStage,
                Educational_institution: item.institution,
                school_beginner_year: item.startYear,
                gender: item.genderDisplay || item.gender,
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="saved-page">
      <div className="saved-header">
        <h1>השמורים שלי</h1>
        <p>
          כל המחקרים, המנחים והמתלמדים ששמרת במקום אחד
        </p>
      </div>

      <div className="saved-tabs">
        <button
          className={activeTab === "researches" ? "active" : ""}
          onClick={() => setActiveTab("researches")}
        >
          מחקרים
        </button>

        <button
          className={activeTab === "mentors" ? "active" : ""}
          onClick={() => setActiveTab("mentors")}
        >
          מנחים
        </button>

        <button
          className={activeTab === "apprentices" ? "active" : ""}
          onClick={() => setActiveTab("apprentices")}
        >
          מתלמדים
        </button>
      </div>

      {renderItems()}
    </div>
  );
};

export default SavedItems;
