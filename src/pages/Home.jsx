import homePagePic from "../assets/homePagePic.png";

const Home = () => {
  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.left} dir="rtl">
          <h1 style={styles.title}>Welcome to ShebaHub</h1>

          <p style={styles.subtitle}>
            פלטפורמה לחיבור בין חוקרים לסטודנטים ומתמחים לקידום מחקר, חדשנות
            ופיתוח קריירה אקדמית וקלינית.
          </p>

          <div style={styles.visionList}>
            <div style={styles.visionRow}>
              <div style={styles.visionTextBlock}>
                <div style={styles.visionLabel}>הבעיה</div>
                <p style={styles.visionText}>
                  חוקרים מבזבזים עד כ־50% מזמנם על משימות חוזרות, בעוד ש־55%
                  מהסטודנטים לרפואה חסרי ניסיון מחקרי וגישה להזדמנויות.
                </p>
              </div>
              <div style={styles.visionNum}>01</div>
            </div>

            <div style={styles.visionRow}>
              <div style={styles.visionTextBlock}>
                <div style={styles.visionLabel}>הפתרון</div>
                <p style={styles.visionText}>
                  ShebaHub מספקת פלטפורמה מאובטחת להתאמה חכמה בין חוקרים
                  לסטודנטים בעלי מיומנויות מחקר רלוונטיות.
                </p>
              </div>
              <div style={styles.visionNum}>02</div>
            </div>

            <div style={styles.visionRow}>
              <div style={styles.visionTextBlock}>
                <div style={styles.visionLabel}>ההשפעה</div>
                <p style={styles.visionText}>
                  שיפור יעילות מחקרית, טיפוח דור העתיד של חוקרים וחיזוק תרבות של
                  מנטורינג ושיתופי פעולה.
                </p>
              </div>
              <div style={styles.visionNum}>03</div>
            </div>
          </div>
        </div>

        <div style={styles.right}>
          <img
            src={homePagePic}
            alt="צוות מחקר בעבודה משותפת"
            style={styles.image}
          />
        </div>
      </section>
    </main>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
  },

  hero: {
    direction: "ltr",
    maxWidth: 1200,
    margin: "0 auto",
    padding: "56px 20px",
    display: "grid",
    gridTemplateColumns: "1fr 1.15fr",
    gap: 36,
    alignItems: "center",
  },

  left: {},

  right: {
    display: "flex",
    justifyContent: "flex-end",
  },

  title: {
    margin: "0 auto 0 auto",
    textAlign: "center",
    fontSize: 34,
    fontWeight: 700,
    color: "#1e3a8a",
    maxWidth: "100%",
  },

  subtitle: {
    margin: "12px auto 0 auto",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 1.7,
    color: "#334155",
    maxWidth: 600,
  },

  visionList: {
    marginTop: 28,
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },

  visionRow: {
    display: "flex",
    flexDirection: "row-reverse",
    gap: 16,
    alignItems: "flex-start",
  },

  visionTextBlock: {
    maxWidth: 480,
  },

  visionLabel: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
    color: "#0f172a",
  },

  visionText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.8,
    color: "#334155",
  },

  visionNum: {
    width: 44,
    height: 44,
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    fontSize: 13,
    color: "#ffffff",
    background: "#37B9A3",
    borderRadius: 8,
    flexShrink: 0,
  },

  image: {
    width: "100%",
    maxWidth: 700,
    height: 400,
    objectFit: "cover",
    borderRadius: 8,
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.12)",
  },

  /* ✅ התאמות מובייל (Inline media queries) */
  "@media (max-width: 900px)": {
    hero: {
      gridTemplateColumns: "1fr",
      gap: 24,
      padding: "32px 16px",
    },
    right: {
      justifyContent: "center",
    },
    image: {
      maxWidth: 520,
      height: 280,
    },
  },

  "@media (max-width: 600px)": {
    hero: {
      padding: "24px 14px",
    },
    title: {
      fontSize: 26,
    },
    subtitle: {
      fontSize: 13,
      maxWidth: "100%",
    },
    visionList: {
      gap: 16,
      marginTop: 20,
    },
    visionRow: {
      gap: 12,
    },
    visionTextBlock: {
      maxWidth: "100%",
    },
    visionLabel: {
      fontSize: 13,
    },
    visionText: {
      fontSize: 12.5,
      lineHeight: 1.75,
    },
    visionNum: {
      width: 40,
      height: 40,
      fontSize: 12.5,
      borderRadius: 10,
    },
    image: {
      maxWidth: "100%",
      height: 240,
    },
  },
};

export default Home;