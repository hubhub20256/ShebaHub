import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { profilesAPI, researchAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

// --- Theme Constants ---
const THEME_COLOR = "#2C2C6C";
const ACCENT_TEAL = "#6cd5bf";
const ACCENT_PINK = "#ef67a0";
const BG_GRAY = "#f8f9fa";

// --- Mock Data ---
const researchData = {
  id: 1,
  researchName: "שימוש בבינה מלאכותית לזיהוי מוקדם של מחלות לב",
  description:
    'מחקר זה מתמקד בפיתוח אלגוריתמים מתקדמים של למידת מכונה (Machine Learning) לצורך ניתוח נתוני אקג.',
  researchArea: "קרדיולוגיה, מדעי הנתונים",
  mentors: 'פרופ\' דניאל כהן, ד"ר רונית לוי',
  teamSize: 4,
  startDate: "2023-11-01",
  weeklyHours: 10,
  durationWeeks: 12,
  compensation: "מלגה",
  workMode: "היברידי",
  requirements:
    "ידע ב-Python, רקע בסיסי בביולוגיה/רפואה, יכולת קריאת מאמרים באנגלית.",
  skillsAndTools: "PyTorch, TensorFlow, Pandas, SQL",
  output: "מאמר אקדמי ופיתוח אב-טיפוס",
  location: "תל אביב-יפו (שיבא תל השומר)",
  status: "מגייס",
  helsinkiApproval: "H-2023-9988",
  dataType: "רטרוספקטיבי",
  contractFileName: "Research_Contract_v2.pdf",
};

export default function Research() {
  const { user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isRealFromNav = location?.state?.source === "real";
  const [useReal, setUseReal] = useState(isRealFromNav);
  const isReal = useReal;
  const [realResearch, setRealResearch] = useState(null);
  const [myResearches, setMyResearches] = useState([]);
  const [realLoading, setRealLoading] = useState(false);
  const [realError, setRealError] = useState(null);
  const [isMentor, setIsMentor] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Prefer local auth flags (fast + works even if backend is temporarily down).
      if (user && typeof user.has_mentor_profile === "boolean") {
        if (!cancelled) {
          setIsMentor(user.has_mentor_profile);
          setRoleChecked(true);
        }
        return;
      }

      // Fallback: ask backend.
      if (!user) {
        if (!cancelled) {
          setIsMentor(false);
          setRoleChecked(true);
        }
        return;
      }

      try {
        await profilesAPI.getMyMentorProfile();
        if (!cancelled) setIsMentor(true);
      } catch {
        if (!cancelled) setIsMentor(false);
      } finally {
        if (!cancelled) setRoleChecked(true);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Keep students on real mode (they should not see mock as their default).
  useEffect(() => {
    if (!roleChecked) return;
    if (!isMentor) setUseReal(true);
  }, [isMentor, roleChecked]);

  // If navigation explicitly says "real", switch to real (e.g., coming from lists).
  // This runs when route params or nav state changes, but won't override manual toggles on the same page.
  useEffect(() => {
    if (isRealFromNav) setUseReal(true);
  }, [id, isRealFromNav]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isReal) return;
      if (!id) return;

      setRealError(null);
      setRealLoading(true);
      try {
        const data = await researchAPI.getResearch(id);
        if (!cancelled) setRealResearch(data);
      } catch (err) {
        if (!cancelled) setRealError(err?.data?.detail || "לא הצלחתי לטעון את המחקר");
      } finally {
        if (!cancelled) setRealLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, isReal]);

  useEffect(() => {
    let cancelled = false;

    const loadList = async () => {
      if (!isReal) return;
      if (!isMentor) return;
      try {
        const data = await researchAPI.listMyResearches();
        if (cancelled) return;
        setMyResearches(Array.isArray(data) ? data : []);
      } catch {
        // Non-blocking: details view can still work without list.
      }
    };

    loadList();
    return () => {
      cancelled = true;
    };
  }, [isReal, isMentor]);

  const data = useMemo(() => {
    if (!isReal) return researchData;
    return realResearch || null;
  }, [isReal, realResearch]);

  const skills = useMemo(() => {
    const s = data?.skillsAndTools;
    if (!s) return [];
    return String(s)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [data]);

  const handleEditClick = () => {
    if (isReal && id && myResearches.some((r) => String(r.id) === String(id))) {
      navigate(`/research/${id}/edit`, { state: { source: "real" } });
      return;
    }
    if (isMentor) navigate("/create-research");
  };

  const handleToggleReal = () => {
    setUseReal((v) => !v);
    setRealError(null);
  };

  const handleDownloadContract = async () => {
    const url = data?.contractUrl;
    if (!url) return;
    const fileName = data?.contractFileName || "contract";

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback: open the file in a new tab (works even if CORS blocks fetch-to-blob)
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleSelectMyResearch = (e) => {
    const nextId = e.target.value;
    if (!nextId) return;
    navigate(`/research/${nextId}`, { state: { source: "real" } });
  };

  const canEditThis = isReal && myResearches.some((r) => String(r.id) === String(id));
  const showEditButton = isMentor && (!isReal || canEditThis);
  const showMockToggle = isMentor;

  if (isReal && realLoading) {
    return (
      <div style={styles.page} dir="rtl">
        <div style={styles.header}>
          <div style={styles.title}>טוען מחקר...</div>
        </div>
      </div>
    );
  }

  if (isReal && realError) {
    return (
      <div style={styles.page} dir="rtl">
        <div style={styles.header}>
          <div style={styles.title}>שגיאה</div>
          <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700 }}>{realError}</div>
        </div>
      </div>
    );
  }

  if (isReal && !data) {
    return (
      <div style={styles.page} dir="rtl">
        <div style={styles.header}>
          <div style={styles.title}>לא נמצא מחקר</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page} dir="rtl">
      <div style={styles.header}>
        <div style={styles.title}>{data.researchName}</div>
        <div style={styles.titleUnderline}></div>
      </div>

      <div className="main-card" style={styles.card}>
        <div className="action-bar" style={styles.actionBar}>
          <div
            className="status-group"
            style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
          >
            <span style={styles.statusBadge}>{data.status}</span>
            <span style={styles.idBadge}>ID: {data.helsinkiApproval}</span>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {isMentor && isReal && myResearches.length > 0 && (
              <select
                value={String(id || "")}
                onChange={handleSelectMyResearch}
                style={{
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontWeight: 700,
                  color: THEME_COLOR,
                  background: "white",
                  maxWidth: 260,
                }}
                title="בחר מחקר שלך"
              >
                <option value="" disabled>
                  בחר מחקר...
                </option>
                {myResearches.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.researchName}
                  </option>
                ))}
              </select>
            )}

            {showMockToggle && (
              <button
                onClick={handleToggleReal}
                style={{
                  ...styles.editButton,
                  background: isReal ? "#111827" : "white",
                  color: isReal ? "white" : THEME_COLOR,
                }}
                title="כפתור זמני: החלפה בין מוק למחקר אמיתי"
              >
                {isReal ? "מציג אמיתי (לחץ למוק)" : "הצג אמיתי (זמני)"}
              </button>
            )}

            {showEditButton && (
              <button onClick={handleEditClick} style={styles.editButton}>
                <EditIcon />
                עריכה
              </button>
            )}
          </div>
        </div>

        <div className="research-layout">
          <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
            <Section title="תיאור המחקר">
              <p style={styles.text}>{data.description}</p>
            </Section>

            <Section title="דרישות ומיומנויות">
              <div style={styles.infoBox}>
                <h4 style={styles.infoTitle}>דרישות סף:</h4>
                <p style={styles.text}>{data.requirements}</p>

                <div style={styles.divider}></div>

                <h4 style={styles.infoTitle}>כלים וטכנולוגיות:</h4>
                <div style={styles.tagsContainer}>
                  {skills.map((skill, idx) => (
                    <span key={idx} style={styles.skillTag}>
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="תוצרים ותגמול">
              <div className="details-grid">
                <DetailItem label="סוג תגמול" value={data.compensation} />
                <DetailItem label="תוצרי מחקר מצופים" value={data.output} />
              </div>
            </Section>

            {data.contractFileName && (
              <div className="file-card" style={styles.fileCard}>
                <div style={styles.fileIcon}>📄</div>
                <div style={styles.fileInfo}>
                  <div style={styles.fileName}>{data.contractFileName}</div>
                  <div style={styles.fileAction}>לחץ להורדת חוזה</div>
                </div>
                {data.contractUrl ? (
                  <button onClick={handleDownloadContract} style={styles.downloadBtn}>
                    הורדה
                  </button>
                ) : (
                  <button style={styles.downloadBtn} disabled>
                    הורדה
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={styles.sidebar}>
            <h3 style={styles.sidebarHeaderTitle}>לוגיסטיקה וצוות</h3>

            <SidebarItem label="מיקום" value={data.location} />
            <SidebarItem label="תחום" value={data.researchArea} />
            <SidebarItem label="אופן עבודה" value={data.workMode} />
            <div style={styles.divider}></div>
            <SidebarItem label="מנחים" value={data.mentors} />
            <SidebarItem
              label="תאריך התחלה"
              value={data.startDate ? new Date(data.startDate).toLocaleDateString("he-IL") : ""}
            />
            <SidebarItem label="משך המחקר" value={data.durationWeeks ? `${data.durationWeeks} שבועות` : ""} />
            <SidebarItem label="שעות שבועיות" value={data.weeklyHours ? `${data.weeklyHours} שעות` : ""} />
            <SidebarItem label="גודל צוות" value={data.teamSize ? `${data.teamSize} מתלמדים` : ""} />
            <SidebarItem label="סוג נתונים" value={data.dataType} />

            <div style={{ marginTop: 24 }}>
              <button style={styles.primaryBtn}>הגש מועמדות למחקר</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .research-layout { 
          display: grid; 
          gap: 32px; 
          grid-template-columns: 1fr; 
        }
        .main-card {
          padding: 20px !important;
        }
        .action-bar {
          flex-wrap: wrap;
          gap: 16px;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .research-layout { 
            grid-template-columns: 2fr 1fr; 
            align-items: start;
          }
          .main-card {
            padding: 32px !important;
          }
          .details-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// --- Sub Components ---

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <h3 style={styles.sectionTitle}>{title}</h3>
    {children}
  </div>
);

const DetailItem = ({ label, value }) => (
  <div>
    <div style={styles.label}>{label}</div>
    <div style={styles.value}>{value}</div>
  </div>
);

const SidebarItem = ({ label, value }) => (
  <div style={styles.sidebarItem}>
    <div style={styles.sidebarLabel}>{label}</div>
    <div style={styles.sidebarValue}>{value}</div>
  </div>
);

const EditIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginLeft: 6 }}
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

// --- Styles ---

const styles = {
  page: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "24px 12px",
    fontFamily: "Rubik, system-ui, sans-serif",
    color: THEME_COLOR,
  },
  header: { textAlign: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 800, marginBottom: 8, lineHeight: 1.2 },
  titleUnderline: { width: 50, height: 4, background: ACCENT_TEAL, margin: "0 auto", borderRadius: 2 },

  card: {
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    background: "white",
    boxShadow: "0 12px 40px rgba(0,0,0,0.03)",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: THEME_COLOR,
    marginBottom: 16,
    borderRight: `4px solid ${ACCENT_PINK}`,
    paddingRight: 8,
    lineHeight: "1",
  },

  actionBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "1px solid #eee",
  },
  statusBadge: {
    background: "#e6fffa",
    color: "#0d9488",
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },
  idBadge: {
    background: "#f1f5f9",
    color: "#64748b",
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  editButton: {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: 20,
    border: "1px solid #ddd",
    background: "white",
    color: "#666",
    fontSize: 13,
    cursor: "pointer",
    transition: "0.2s",
    whiteSpace: "nowrap",
  },

  text: { lineHeight: 1.6, color: "#444", fontSize: 15, margin: 0 },
  infoBox: { background: BG_GRAY, padding: 16, borderRadius: 12, border: "1px solid #eee" },
  infoTitle: { fontSize: 14, fontWeight: 700, margin: "0 0 8px 0", color: THEME_COLOR },
  divider: { height: 1, background: "#ddd", margin: "16px 0" },

  tagsContainer: { display: "flex", flexWrap: "wrap", gap: 8 },
  skillTag: { background: "white", border: "1px solid #ddd", padding: "4px 12px", borderRadius: 20, fontSize: 13, color: "#555" },

  sidebar: { background: "#fdfdfd", padding: 20, borderRadius: 12, border: "1px solid #eee" },
  sidebarHeaderTitle: { fontSize: 16, fontWeight: 700, marginBottom: 16, color: THEME_COLOR },
  sidebarItem: { display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14, gap: 10 },
  sidebarLabel: { color: "#666", flexShrink: 0 },
  sidebarValue: { fontWeight: 600, color: THEME_COLOR, textAlign: "left" },

  label: { fontSize: 13, fontWeight: 600, color: "#4a4a8a", marginBottom: 4 },
  value: { fontSize: 15, color: "#333" },

  fileCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    border: `1px dashed ${ACCENT_TEAL}`,
    borderRadius: 8,
    background: "#fafffe",
    marginTop: 10,
    flexWrap: "wrap",
  },
  fileIcon: { fontSize: 20 },
  fileInfo: { flex: 1, minWidth: "150px" },
  fileName: { fontWeight: 600, fontSize: 13, color: THEME_COLOR, wordBreak: "break-all" },
  fileAction: { fontSize: 11, color: ACCENT_TEAL },
  downloadBtn: {
    padding: "6px 12px",
    borderRadius: 6,
    background: "white",
    border: "1px solid #bee3f8",
    color: "#0369a1",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 600,
    marginLeft: "auto",
  },

  primaryBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: 30,
    background: THEME_COLOR,
    color: "white",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 700,
    border: "none",
    boxShadow: "0 4px 12px rgba(44, 44, 108, 0.2)",
    transition: "0.2s",
  },
};
