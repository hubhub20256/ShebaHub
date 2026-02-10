import { useEffect } from "react";
import homePagePic from "../assets/homePagePic.png";
import "../styles/Home.css";

const Home = () => {
  useEffect(() => {
    document.body.classList.add("home-body");
    return () => document.body.classList.remove("home-body");
  }, []);

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-left" dir="rtl">
          <h1 className="home-title"> ברוכים הבאים ל-ShebaHub</h1>

          <p className="home-subtitle">
            פלטפורמה לחיבור בין חוקרים לסטודנטים ומתמחים לקידום מחקר, חדשנות
            ופיתוח קריירה אקדמית וקלינית.
          </p>

          <div className="home-vision-list">
            <div className="home-vision-row">
              <div className="home-vision-text-block">
                <div className="home-vision-label">הבעיה</div>
                <p className="home-vision-text">
                  חוקרים מבזבזים עד כ־50% מזמנם על משימות חוזרות, בעוד ש־55%
                  מהסטודנטים לרפואה חסרי ניסיון מחקרי וגישה להזדמנויות.
                </p>
              </div>
              <div className="home-vision-num">01</div>
            </div>

            <div className="home-vision-row">
              <div className="home-vision-text-block">
                <div className="home-vision-label">הפתרון</div>
                <p className="home-vision-text">
                  ShebaHub מספקת פלטפורמה מאובטחת להתאמה חכמה בין חוקרים
                  לסטודנטים בעלי מיומנויות מחקר רלוונטיות.
                </p>
              </div>
              <div className="home-vision-num">02</div>
            </div>

            <div className="home-vision-row">
              <div className="home-vision-text-block">
                <div className="home-vision-label">ההשפעה</div>
                <p className="home-vision-text">
                  שיפור יעילות מחקרית, טיפוח דור העתיד של חוקרים וחיזוק תרבות של
                  מנטורינג ושיתופי פעולה.
                </p>
              </div>
              <div className="home-vision-num">03</div>
            </div>
          </div>
        </div>

        <div className="home-right">
          <img
            src={homePagePic}
            alt="צוות מחקר בעבודה משותפת"
            className="home-image"
          />
        </div>
      </section>
    </main>
  );
};

export default Home;
