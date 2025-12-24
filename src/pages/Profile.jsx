import React, { useState } from "react";
import "./Profile.css";
import defaultAvatar from "../assets/avatar.jpg";

const Profile = () => {
  // --- הגדרת הנתונים (Mock Data) ---
  const mockData = {
    mentor: {
      name: "ישראל ישראלי",
      title: 'ד"ר',
      role: "mentor",
      values: {
        gender: "זכר",
        email: "israel@sheba.gov.il",
        specialization: "קרדיולוגיה",
        degrees: "MD, PhD",
        institution: "הטכניון",
        rank: "פרופסור חבר",
        stage: "מומחה בכיר",
        workplace: "שיבא תל השומר",
        mentoringExp: "כן, 10 שנים",
        mentoringDetails: "הנחיית סטודנטים לתארים מתקדמים במחקר קליני",
        interests: "אי ספיקת לב, קרדיו-אונקולוגיה",
        reviews: "מנחה קשובה ומקצועית מאוד",
        background: "מנהלת יחידה עם ניסיון רב במחקר אפידמיולוגי",
        prevResearch: "מחקר על השפעת תרופות חדשות לאחר אוטם שריר הלב",
      },
    },
    apprentice: {
      name: "טלי מרקוביץ'",
      title: "גברת",
      role: "apprentice",
      values: {
        gender: "נקבה",
        email: "tali.student@example.com",
        startYear: "2021",
        institution: "אוניברסיטת תל אביב",
        stage: "סטודנט לרפואה",
        specialization: "רפואה פנימית",
        workplace: "מרכז רפואי שיבא",
        studyYear: "ה'",
        degrees: "B.Sc",
        rank: "אין",
        researchExp: "כן, סיוע במחקר מעבדתי",
        researchDetails: "איסוף נתונים וניתוח סטטיסטי בסיסי",
        interests: "מחקר קליני, טכנולוגיות רפואיות",
        jobType: "משרת סטודנט / מחקר",
        skills: "Python, SPSS, Excel, מערכות ניהול תיק רפואי",
        hours: "15-20 שעות בשבוע",
        availabilityDate: "01/01/2026",
        background: "סטודנטית מצטיינת המעוניינת להשתלב בעולם המחקר הקליני",
        reviews: "חוות דעת חיובית מהמעבדה בטכניון",
        researchAvailability: "זמינה מיידית",
        participationType: "נוכחות פיזית ומרחוק",
        proExperience: "עוזרת מחקר במחלקת פנימית ג'",
        compensation: "מלגת מחקר או תשלום לפי שעה",
      },
    },
  };

  // --- טעינת נתוני המנחה (ישראל ישראלי) כברירת מחדל ---
  const [userData] = useState(mockData.mentor);
  const [profileImage] = useState(defaultAvatar);

  // תיקון הלוגיקה: האם התפקיד שנבחר ב-userData הוא של מתמחה?
  const isApprentice = userData.role === "mentor";
  const getVal = (fieldName) => userData.values[fieldName] || "";

  // רשימות השדות של המנחה
  const mentorFieldsRight = [
    { label: "מין", value: getVal("gender") },
    { label: "דואר אלקטרוני", value: getVal("email") },
    { label: "התמחות", value: getVal("specialization") },
    { label: "תארים", value: getVal("degrees") },
    { label: "מוסד לימודים", value: getVal("institution") },
    { label: "דרגה אקדמית", value: getVal("rank") },
    { label: "שלב בהכשרה רפואית", value: getVal("stage") },
    { label: "מקום עבודה", value: getVal("workplace") },
  ];

  const mentorFieldsLeft = [
    { label: "ניסיון בהנחייה", value: getVal("mentoringExp") },
    { label: "פירוט ניסיון בהנחיה", value: getVal("mentoringDetails") },
    { label: "תחומי עניין מחקרי", value: getVal("interests") },
    { label: "חוות דעת ממנחים ומתלמדים", value: getVal("reviews") },
    { label: "תיאור רקע אישי ואקדמי", value: getVal("background") },
    { label: "תיאור מחקרים קודמים", value: getVal("prevResearch") },
  ];

  // רשימות השדות של המתמחה
  const apprenticeFieldsRight = [
    { label: "מין", value: getVal("gender") },
    { label: "דואר אלקטרוני", value: getVal("email") },
    { label: "שנת תחילת הלימודים", value: getVal("startYear") },
    { label: "מוסד לימודים", value: getVal("institution") },
    { label: "שלב בהכשרה רפואית", value: getVal("stage") },
    { label: "התמחות", value: getVal("specialization") },
    { label: "מקום עבודה", value: getVal("workplace") },
    { label: "שנת לימודים", value: getVal("studyYear") },
    { label: "תארים", value: getVal("degrees") },
    { label: "דרגה אקדמית", value: getVal("rank") },
    { label: "ניסיון במחקר", value: getVal("researchExp") },
    { label: "פירוט ניסיון מחקרי", value: getVal("researchDetails") },
  ];

  const apprenticeFieldsLeft = [
    { label: "תחומי עניין מחקרי", value: getVal("interests") },
    { label: "סוג העבודה המבוקשת", value: getVal("jobType") },
    { label: "מיומנויות בתוכנות וכלי עבודה", value: getVal("skills") },
    { label: "היקף שעות זמינות שבועי", value: getVal("hours") },
    { label: "זמינות להתחלת העבודה", value: getVal("availabilityDate") },
    { label: "תיאור רקע אישי ואקדמי", value: getVal("background") },
    { label: "חוות דעת מאנשי מקצוע", value: getVal("reviews") },
    { label: "זמינות למחקר", value: getVal("researchAvailability") },
    { label: "אופן ההשתתפות במחקר", value: getVal("participationType") },
    { label: "ניסיון מקצועי", value: getVal("proExperience") },
    { label: "העדפת תגמול במסגרת המחקר", value: getVal("compensation") },
  ];

  // בחירת רשימת השדות להצגה על פי התפקיד
  const fieldsRight = isApprentice ? apprenticeFieldsRight : mentorFieldsRight;
  const fieldsLeft = isApprentice ? apprenticeFieldsLeft : mentorFieldsLeft;

  return (
    <div className="profile-container">
      <h1 className="profile-title">הפרופיל שלי</h1>

      <div className="profile-header">
        <div className="profile-avatar-wrapper">
          <img
            src={profileImage}
            alt="User Avatar"
            className="profile-avatar-img"
          />
        </div>
        <div className="user-greeting">
          <h2>
            שלום {userData.title} {userData.name}
          </h2>
          <span className="role-tag">
            {isApprentice ? "פרופיל מתמחה" : "פרופיל מנחה"}
          </span>
        </div>
      </div>

      <div className="profile-card">
        <div className="edit-icon-wrapper">
          <span className="edit-icon">✎</span>
        </div>

        <div className="fields-grid">
          <div className="grid-column">
            {fieldsRight.map((f, i) => (
              <div key={i} className="input-group">
                <label>{f.label}:</label>
                <input
                  type="text"
                  value={f.value}
                  className="profile-input readonly-field"
                  readOnly
                />
              </div>
            ))}
          </div>

          <div className="grid-column">
            {fieldsLeft.map((f, i) => (
              <div key={i} className="input-group">
                <label>{f.label}:</label>
                <input
                  type="text"
                  value={f.value}
                  className="profile-input readonly-field"
                  readOnly
                />
              </div>
            ))}

            <div className="input-group">
              <label>קבצים:</label>
              <div className="files-icons-container">
                <span>📄</span>
                <span>📄</span>
                <span>📄</span>
              </div>
            </div>
          </div>
        </div>
        <div className="button-container">
          <button className="submit-button">אישור</button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
