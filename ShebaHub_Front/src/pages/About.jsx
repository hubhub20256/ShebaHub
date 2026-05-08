import React from "react";
import usePageTitle from "../hooks/usePageTitle";
import "../styles/About.css";

const About = () => {
  usePageTitle("אודות | ShebaHub");

  const problemItems = [
    "חוקרים מקדישים זמן רב למשימות חוזרות שאינן דורשות מומחיות מחקרית.",
    "סטודנטים רבים לרפואה חסרים ניסיון מחקרי משמעותי והזדמנויות להשתלב במחקר.",
    "אין כיום חיבור מספיק יעיל, ממוקד וגמיש בין חוקרים הזקוקים לעזרה לבין סטודנטים המעוניינים להתנסות.",
  ];

  const solutionItems = [
    "התאמה חכמה בין חוקרים לסטודנטים לפי תחומי עניין, זמינות וצרכים מחקריים.",
    "ניהול משימות מחקר מגוונות כמו איסוף נתונים, ניקוי נתונים, ניתוח וכתיבה מדעית.",
    "יצירת תהליך שקוף, מאובטח וגמיש שמחזק גם את המחקר וגם את חוויית הלמידה.",
  ];

  const statsItems = [
    {
      title: "מנחים",
      value: "",
    },
    {
      title: "מתלמדים",
      value: "",
    },
    {
      title: "מחקרים",
      value: "",
    },
  ];

  const values = [
    {
      title: "חיבור מדויק",
      text: "ShebaHub מאפשרת לחוקרים ולסטודנטים למצוא התאמה רלוונטית לפי תחום, זמינות, ניסיון וסוג המשימה.",
    },
    {
      title: "מנטורינג אמיתי",
      text: "המערכת לא מחליפה את הקשר האנושי, אלא מחזקת אותו באמצעות ליווי, הכוונה והתנסות מעשית.",
    },
    {
      title: "מחקר יעיל יותר",
      text: "באמצעות חלוקת משימות חכמה, ניתן לקצר תהליכים, להפחית עומס ולשפר את קצב ההתקדמות המחקרית.",
    },
  ];

  return (
    <main className="about-page" dir="rtl">
      <section className="about-hero">
        <div className="about-hero-content">
          <p className="about-kicker">אודות הפלטפורמה</p>

          <h1 className="about-title">
            מחברים בין חוקרים לסטודנטים,
            <br />
            ומקדמים את דור העתיד של המחקר הרפואי
          </h1>

          <p className="about-hero-text">
            ShebaHub היא פלטפורמה אקדמית חכמה ומאובטחת, שנועדה ליצור חיבור
            מדויק בין חוקרים במרכז הרפואי שיבא לבין סטודנטים המעוניינים לקחת
            חלק במחקר רפואי, לצבור ניסיון משמעותי ולקבל מנטורינג מקצועי.
          </p>
        </div>
      </section>

      <section className="about-stats-section">
          <p className="about-kicker">נתונים מרכזיים</p>

        <div className="about-stats-grid">
          {statsItems.map((item) => (
            <div className="about-stat-card" key={item.title}>
              <span className="about-stat-number">{item.title}</span>
              <p>{item.value}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="about-two-columns">
        <div className="about-card">
          <h2>האתגר</h2>
          <p>
            בעולם המחקר הרפואי קיימות משימות רבות שדורשות זמן, סדר ודיוק, אך
            אינן מחייבות תמיד מומחיות קלינית מתקדמת. במקביל, סטודנטים רבים
            מעוניינים להיחשף למחקר אך מתקשים למצוא הזדמנות מתאימה.
          </p>

          <ul>
            {problemItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="about-card about-card-highlight">
          <h2>הפתרון שלנו</h2>
          <p>
            ShebaHub יוצרת מרחב דיגיטלי שמאפשר התאמה יעילה בין חוקרים
            לסטודנטים, תוך שמירה על גמישות, שקיפות ואיכות מחקרית.
          </p>

          <ul>
            {solutionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="about-values-section">
        <div className="about-section-heading">
          <p className="about-kicker">מה מוביל אותנו</p>
          <h2>הערך של ShebaHub</h2>
        </div>

        <div className="about-values-grid">
          {values.map((value) => (
            <article className="about-value-card" key={value.title}>
              <h3>{value.title}</h3>
              <p>{value.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-partnership-section">
          <h2>שותפות בין רפואה, אקדמיה וטכנולוגיה</h2>

          <p>
            הפרויקט נבנה מתוך שיתוף פעולה בין המרכז הרפואי שיבא, האקסלרטור
            האקדמי של שיבא והמכון הטכנולוגי חולון HIT. השילוב בין ידע קליני,
            הבנה מחקרית ופיתוח טכנולוגי מאפשר לבנות מערכת שמותאמת לצרכים
            אמיתיים מהשטח.
          </p>
      </section>

      <section className="about-vision-section">
        <p className="about-kicker">החזון שלנו</p>

        <h2 className="about-vision-title">
          להפוך את המחקר הרפואי לנגיש, מחובר ויעיל יותר
        </h2>

        <div className="about-vision-points">
          <p>לאפשר לסטודנטים להשתלב בעולם המחקר כבר מהשלבים הראשונים</p>
          <p>לחזק שיתופי פעולה בין חוקרים לדור העתיד</p>
          <p>לקדם מחקר איכותי דרך עשייה, ניסיון ומנטורינג</p>
        </div>
      </section>
    </main>
  );
};

export default About;