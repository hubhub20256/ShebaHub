import { useState } from "react";
import "../styles/SavedItems.css";
import { Link } from "react-router-dom";
import ResearchCard from "../components/ResearchCard";

const SavedItems = () => {
  const [activeTab, setActiveTab] = useState("researches");

  const savedResearches = JSON.parse(
    localStorage.getItem("savedResearches") || "[]"
  );

  const savedMentors = [
    {
      id: 1,
      title: 'ד"ר כהן',
      subtitle: "אונקולוגיה",
    },
  ];

  const savedApprentices = [
    {
      id: 1,
      title: "נועה ישראלי",
      subtitle: "סטודנטית לרפואה",
    },
  ];

  const renderItems = () => {
    let items = [];

    if (activeTab === "researches") {
      items = savedResearches;
    }

    if (activeTab === "mentors") {
      items = savedMentors;
    }

    if (activeTab === "apprentices") {
      items = savedApprentices;
    }

    if (items.length === 0) {
      return (
        <div className="saved-empty-state">
          לא נמצאו פריטים שמורים
        </div>
      );
    }

    return (
      <div className="saved-grid">
        {items.map((item) => (
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
        ))}
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