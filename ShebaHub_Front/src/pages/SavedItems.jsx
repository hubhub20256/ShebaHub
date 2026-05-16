import { useState } from "react";
import "../styles/SavedItems.css";
import ResearchCard from "../components/ResearchCard";
import MentorsCard from "../components/mentorsCard";
import ApprenticesCard from "../components/apprenticeCard";

const SavedItems = () => {
  const [activeTab, setActiveTab] = useState("researches");

  const savedResearches = JSON.parse(
    localStorage.getItem("savedResearches") || "[]"
  );

  const renderItems = () => {
    const savedProfiles = JSON.parse(
      localStorage.getItem("savedProfiles") || "[]"
    );
  
    const savedMentors = savedProfiles.filter((item) => item.type === "mentor");
    const savedApprentices = savedProfiles.filter(
      (item) => item.type === "apprentice"
    );
  
    let items = [];
  
    if (activeTab === "researches") items = savedResearches;
    if (activeTab === "mentors") items = savedMentors;
    if (activeTab === "apprentices") items = savedApprentices;
  
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
            return (
              <ResearchCard
                key={item.id}
                research={{
                  id: item.id,
                  title: item.title,
                  status: item.status,
                  acceptingApplications: item.acceptingApplications ?? true,
                  isFull: item.isFull ?? false,
                  fields: item.fields || [],
                  mentors: item.mentors || [],
                  description: item.description || "",
                  apprenticesCount: item.apprenticesCount || "",
                  startDate: item.startDate || "",
                  hoursScope: item.hoursScope || "",
                  duration: item.duration || "",
                  rewards: item.rewards || "",
                }}
              />
            );
          }
  
          if (activeTab === "mentors") {
            return (
              <MentorsCard
                key={item.id}
                mentor={{
                  id: item.id,
                  name: item.name || item.fullName,
                  profileImage: item.profileImage,
                  specialty: item.specialty,
                  degrees: item.degrees,
                  gender: item.gender,
                }}
              />
            );
          }
  
          return (
            <ApprenticesCard
              key={item.id}
              apprentice={{
                id: item.id,
                name: item.name || item.fullName,
                profileImage: item.profileImage,
                isAvailableForResearch: item.isAvailableForResearch,
                medical_level: item.medical_level || item.apprenticeStage,
                Educational_institution:
                  item.Educational_institution || item.institution,
                school_beginner_year: item.school_beginner_year || item.startYear,
                gender: item.gender,
                department: item.department,
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