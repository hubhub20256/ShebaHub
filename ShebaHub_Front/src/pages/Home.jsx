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
    return () => document.body.classList.remove("home-body");
  }, []);

  const visionItems = [
    {
      title: "הבעיה",
      description: "חוקרים מקדישים עד כ־50% מזמנם למשימות חוזרות, בעוד שסטודנטים רבים חסרים גישה להזדמנויות מחקר מעשיות.",
    },
    {
      title: "הפתרון",
      description: "ShebaHub מחברת בין חוקרים לסטודנטים באמצעות פלטפורמה חכמה, המאפשרת התאמה מדויקת לפי צרכים וזמינות.",
    },
    {
      title: "ההשפעה",
      description: "קידום דור העתיד של החוקרים הקליניים תוך שיפור יעילות המחקר וקיצור תהליכים משמעותי.",
    },
  ];

  return (
    <main className="home-page" dir="rtl">
      {/* Decorative Background Elements */}
      <div className="bg-blob pink-blob"></div>
      <div className="bg-blob blue-blob"></div>

      <div className="home-container">
        <header className="hero-section">
          <div className="hero-content">
          <h1 className="hero-title">
            <span className="brand-wrapper">
              <span className="brand-sheba">Sheba</span>
              <span className="brand-hub">Hub</span>
            </span>

            <span className="hero-title-text">
              פלטפורמת המחקר והחדשנות של שיבא
            </span>
          </h1>
     
            <p className="hero-subtitle">
              פלטפורמה המחברת בין חוקרי שיבא, סטודנטים ומתמחים לקידום מחקר קליני,
              חדשנות ופיתוח הקריירה האקדמית והרפואית.
              <br />
              <span className="subtitle-highlight">
                הבית של המחקר הקליני יוצרים חיבורים בין חוקרי שיבא לבין דור החוקרים הבא.
              </span>
            </p>

            <div className="hero-logos">
              <img src={shebaLogo} alt="Sheba" className="partner-logo sheba-logo" />
              <div className="logo-divider"></div>
              <img src={hitLogo} alt="HIT" className="partner-logo" />
            </div>
          </div>
          
          <div className="hero-image-wrapper">
            <div className="image-border-accent"></div>
            <img src={research2} alt="Medical Research" className="main-hero-img" />
          </div>
        </header>

        <section className="vision-grid">
          {visionItems.map((item, index) => (
            <div className="vision-card" key={index}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
};

export default Home;