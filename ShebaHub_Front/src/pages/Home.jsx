import { useEffect } from "react";
import shebaLogo from "../assets/ShebaNavbarLogo.png";
import hitLogo from "../assets/hitLogo.png";
import research2 from "../assets/homepagepic5.jpeg";

import usePageTitle from "../hooks/usePageTitle";
import "../styles/Home.css";

const Home = () => {
  usePageTitle("דף הבית | ShebaHub");

  useEffect(() => {
    document.body.classList.add("home-body");

    return () => {
      document.body.classList.remove("home-body");
    };
  }, []);

  const visionItems = [
    {
      label: "הבעיה",
      text: "היום, חוקרים מקדישים עד כ־50% מזמנם למשימות חוזרות שאינן דורשות מומחיות מחקרית, בעוד שכ־55% מהסטודנטים לרפואה חסרי ניסיון מחקרי משמעותי וגישה להזדמנויות.",
    },
    {
      label: "הפתרון",
      text: "ShebaHub היא פלטפורמה חכמה ומאובטחת המחברת בין חוקרים לסטודנטים בהתאם לצרכים, תחומי עניין וזמינות, ומאפשרת התאמה מדויקת לביצוע משימות מחקר מגוונות.",
    },
    {
      label: "ההשפעה",
      text: "המערכת משפרת את יעילות המחקר, מקצרת תהליכים, מחזקת שיתופי פעולה ומטפחת את דור העתיד של החוקרים הקליניים באמצעות מנטורינג והתנסות מעשית.",
    },
  ];

  return (
    <main className="home-page" dir="rtl">
      <div className="wave-divider" aria-hidden="true">
        <svg viewBox="0 0 1440 150" preserveAspectRatio="none">
          <path
            d="M0,80 C300,150 1100,0 1440,80 L1440,0 L0,0 Z"
            className="wave-fill"
          />
        </svg>
      </div>

      <div className="home-container">
        <header className="home-header-section">
          <h1 className="home-title">
            <span className="welcome-text">ברוכים הבאים ל־</span>
            <span className="brand-highlight">Sheba</span>
            <span className="hub-highlight">Hub</span>
          </h1>

          <p className="home-combined-subtitle">
            הפלטפורמה האקדמית של המרכז הרפואי שיבא לחיבור בין חוקרים לסטודנטים,
            לקידום מחקר, חדשנות ופיתוח קריירה מדעית וקלינית.
          </p>
        </header>

        <section className="home-main-layout">
          <div className="home-vision-container">
            <div className="home-vision-list">
              {visionItems.map((item) => (
                <article className="home-vision-row" key={item.label}>
                  <h3 className="home-vision-label">{item.label}</h3>
                  <p className="home-vision-text">{item.text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="home-visual-container">
            <div className="home-hero-image">
              <img src={research2} alt="מחקר רפואי במעבדה" />
            </div>

            <div className="home-logos-row">
              <div className="home-logo-box sheba-box">
                <img src={shebaLogo} alt="לוגו שיבא" className="home-logo sheba" />
              </div>

              <div className="home-logo-box hit-box">
                <img src={hitLogo} alt="לוגו HIT" className="home-logo hit" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Home;

