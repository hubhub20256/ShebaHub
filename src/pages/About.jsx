import React from 'react';
// שים לב לנתיב המעודכן: יוצאים מ-pages ונכנסים ל-styles
import '../styles/About.css'; 

const About = () => {
  return (
    <div className="about-container">
      <h1 className="about-header">אודות Sheba-Hub</h1>

      <section className="about-section">
        <h2 className="about-subtitle">החזון שלנו</h2>
        <p className="about-text">
          ברוכים הבאים ל-<span className="highlight-brand">Sheba-Hub</span>, הפלטפורמה המובילה לחיבור בין עולם המחקר הרפואי לדור העתיד של החוקרים. 
          המערכת נולדה מתוך צורך ממשי בשטח: גישור על הפער הקיים במציאת התאמה מדויקת בין מנחים מקצועיים לבין סטודנטים ומתלמדים המבקשים להשתלב בחזית המחקר.
        </p>
      </section>

      <section className="about-section">
        <h2 className="about-subtitle">שותפות של מצוינות</h2>
        <p className="about-text">
          הפרויקט הוא פרי שיתוף פעולה אסטרטגי בין <span className="highlight-brand">המרכז הרפואי שיבא</span>, בהובלת צוות רופאות וחוקרות מובילות, לבין <span className="highlight-brand">המכון הטכנולוגי חולון (HIT)</span>. 
          החיבור בין הניסיון הקליני העשיר לבין החדשנות הטכנולוגית הוא הלב הפועם של הפלטפורמה, ומבטיח סטנדרט גבוה של איכות ויעילות.
        </p>
      </section>
  
    </div>
  );
};

export default About;