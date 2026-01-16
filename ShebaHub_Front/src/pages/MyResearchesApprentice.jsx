import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ResearchCard from "../components/researchCard";
import { researchAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function MyResearchesApprentice() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // =========================
  // MOCKS (כמו שהיה בקוד המקורי שלך)
  // =========================
  const MOCK_APPROVED_RESEARCHES = [
    {
      id: 101,
      researchName: "מחקר על שיפור שינה",
      description: "מחקר קצר על איכות שינה והרגלים.",
      researchArea: "רפואה, שינה",
      mentors: "ד״ר כהן",
      teamSize: 5,
      startDate: "2026-01-10",
      weeklyHours: 4,
      durationWeeks: 8,
      compensation: "מלגה",
    },
  ];

  const MOCK_APPLICATIONS = [
    {
      id: 9001,
      researchId: 101,
      researchName: "מחקר על שיפור שינה",
      mentors: "ד״ר כהן",
      researchArea: "רפואה, שינה",
      submittedAt: "2026-01-12",
      status: "approved", // pending | approved | rejected | withdrawn
    },
    {
      id: 9002,
      researchId: 202,
      researchName: "מחקר על כאב כרוני",
      mentors: "פרופ׳ לוי",
      researchArea: "נוירולוגיה",
      submittedAt: "2026-01-15",
      status: "pending",
    },
  ];

  const [apprLoading, setApprLoading] = useState(false);
  const [apprError, setApprError] = useState(null);
  const [approvedItems, setApprovedItems] = useState([]);
  const [applications, setApplications] = useState([]);

  const splitList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value)
      .split(/[\n,;|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const approvedCards = useMemo(() => {
    return (Array.isArray(approvedItems) ? approvedItems : []).map((r) => ({
      id: r.id,
      title: r.researchName,
      description: r.description,
      fields: splitList(r.researchArea),
      mentors: splitList(r.mentors),
      apprenticesCount: r.teamSize ?? "",
      startDate: r.startDate,
      hoursScope: r.weeklyHours ? `${r.weeklyHours} שעות בשבוע` : "",
      duration: r.durationWeeks ? `${r.durationWeeks} שבועות` : "",
      rewards: r.compensation || "",
    }));
  }, [approvedItems]);

  const statusLabel = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "pending") return "ממתין לאישור";
    if (s === "approved") return "אושר";
    if (s === "rejected") return "נדחה";
    if (s === "withdrawn") return "בוטל";
    return status || "לא ידוע";
  };

  const statusColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "approved") return "#16a34a";
    if (s === "pending") return "#f59e0b";
    if (s === "rejected") return "#dc2626";
    if (s === "withdrawn") return "#64748b";
    return "#334155";
  };

  useEffect(() => {
    let cancelled = false;

    const loadApprentice = async () => {
      if (!user) return;

      setApprLoading(true);
      setApprError(null);

      try {
        // 1) Approved researches
        let approved = null;
        if (typeof researchAPI.listMyApprovedResearches === "function") {
          approved = await researchAPI.listMyApprovedResearches();
        }

        // 2) Applications
        let apps = null;
        if (typeof researchAPI.listMyApplications === "function") {
          apps = await researchAPI.listMyApplications();
        }

        if (cancelled) return;

        // fallback to mocks if missing/invalid
        setApprovedItems(Array.isArray(approved) ? approved : MOCK_APPROVED_RESEARCHES);
        setApplications(Array.isArray(apps) ? apps : MOCK_APPLICATIONS);
      } catch (err) {
        if (cancelled) return;

        // fallback to mocks on error too
        setApprovedItems(MOCK_APPROVED_RESEARCHES);
        setApplications(MOCK_APPLICATIONS);

        setApprError(
          err?.data?.detail ||
            "לא הצלחתי לטעון נתונים מהשרת — מוצג מידע לדוגמה (MOCK) בינתיים."
        );
      } finally {
        if (!cancelled) setApprLoading(false);
      }
    };

    loadApprentice();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return <p className="researches-no-results">יש להתחבר כדי לראות את המחקרים שלך.</p>;
  }

  if (apprLoading) {
    return (
      <p className="researches-no-results">טוען את המחקרים והמועמדויות שלך...</p>
    );
  }

  return (
    <>
      {apprError && <p className="researches-no-results">{apprError}</p>}

      {/* 1) Approved */}
      <h2 style={{ marginTop: "18px", marginBottom: "10px" }}>
        מחקרים שאושרו לי להשתתף בהם
      </h2>

      {approvedCards.length === 0 ? (
        <p className="researches-no-results">אין לך מחקרים מאושרים כרגע.</p>
      ) : (
        <div className="cards-grid">
          {approvedCards.map((r) => (
            <ResearchCard key={r.id} research={r} isReal={true} />
          ))}
        </div>
      )}

      {/* 2) Applications */}
      <h2 style={{ marginTop: "28px", marginBottom: "10px" }}>
        סטטוס המועמדויות שלי
      </h2>

      {!Array.isArray(applications) || applications.length === 0 ? (
        <p className="researches-no-results">לא הגשת מועמדויות עדיין.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "14px",
          }}
        >
          {applications.map((a) => (
            <div
              key={a.id || `${a.researchId}-${a.submittedAt}`}
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "14px",
                padding: "14px 16px",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div style={{ fontWeight: 800, color: "var(--text-color)" }}>
                  {a.researchName || "מחקר"}
                </div>

                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#fff",
                    background: statusColor(a.status),
                    padding: "6px 10px",
                    borderRadius: "999px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {statusLabel(a.status)}
                </span>
              </div>

              <div
                style={{
                  marginTop: "8px",
                  color: "var(--muted-text, #64748b)",
                  fontSize: "13px",
                }}
              >
                {a.mentors ? `מנחה: ${a.mentors}` : null}
                {a.mentors && a.researchArea ? " • " : null}
                {a.researchArea ? `תחום: ${a.researchArea}` : null}
              </div>

              <div
                style={{
                  marginTop: "6px",
                  color: "var(--muted-text, #64748b)",
                  fontSize: "13px",
                }}
              >
                {a.submittedAt ? `הוגש בתאריך: ${a.submittedAt}` : null}
              </div>

              {a.researchId && (
                <button
                  type="button"
                  onClick={() => navigate(`/research/${a.researchId}`)}
                  style={{
                    marginTop: "12px",
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-color)",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  לצפייה במחקר
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
