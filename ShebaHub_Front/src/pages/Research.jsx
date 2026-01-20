import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { profilesAPI, researchAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import ApprenticeCard from "../components/apprenticeCard";
import Modal from "../components/Modal";
import "../styles/Research.css";
import img1 from "../assets/student1.png";
import img2 from "../assets/student2.png";
import img3 from "../assets/student3.png";

// --- Theme Constants ---
const THEME_COLOR = "#2C2C6C";
const ACCENT_TEAL = "#6cd5bf";
const ACCENT_PINK = "#ef67a0";
const BG_GRAY = "#f8f9fa";

// --- Mock Data ---

/**
 * Mock data for apprentices.
 * Used when the backend response does not contain actual apprentice data.
 */
const mockApprentices = [
  {
    name: "דנה כהן",
    id: 1,
    gender: "נקבה",
    email: "dana.k@med-example.com",
    school_beginner_year: "2019",
    medical_level: "סטודנט שנה 3",
    Educational_institution: "אוניברסיטת תל אביב - הפקולטה לרפואה",
    profileImage: img1,
  },
  {
    name: "יותם לוי",
    id: 2,
    gender: "זכר",
    email: "yotam.lev@hospital-demo.co.il",
    school_beginner_year: "2015",
    medical_level: "סטאזר",
    Educational_institution: "האוניברסיטה העברית והדסה עין כרם",
    profileImage: img2,
  },
  {
    name: "מיכל שמש",
    id: 3,
    gender: "נקבה",
    email: "michal.s@clinic-test.org",
    school_beginner_year: "20214",
    medical_level: "מתמחה בביורפואה",
    Educational_institution: "אוניברסיטת בן-גוריון בנגב",
    profileImage: img3,
  },
];

/**
 * Mock data for pending applicants (people who applied but not yet approved).
 * Same structure as apprentices for card compatibility.
 */
const mockApplicants = [
  {
    name: "נועם אברהם",
    id: 101,
    gender: "זכר",
    email: "noam.a@student-demo.com",
    school_beginner_year: "2022",
    medical_level: "סטודנט שנה 2",
    Educational_institution: "אוניברסיטת חיפה",
    profileImage: img2,
  },
  {
    name: "שירה גולדמן",
    id: 102,
    gender: "נקבה",
    email: "shira.g@med-apply.org",
    school_beginner_year: "2021",
    medical_level: "סטודנט שנה 4",
    Educational_institution: "אוניברסיטת תל אביב - הפקולטה לרפואה",
    profileImage: img1,
  },
];

const researchData = {
  id: 1,
  researchName: "שימוש בבינה מלאכותית לזיהוי מוקדם של מחלות לב",
  description:
    "מחקר זה מתמקד בפיתוח אלגוריתמים מתקדמים של למידת מכונה (Machine Learning) לצורך ניתוח נתוני אקג.",
  researchArea: "קרדיולוגיה, מדעי הנתונים",
  mentors: "פרופ' דניאל כהן, ד\"ר רונית לוי",
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
  apprentices: mockApprentices, // Attach mock apprentices to the mock research
  applicants: mockApplicants, // Attach mock applicants
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
  const [joinedResearches, setJoinedResearches] = useState([]);
  const [selectedApprentice, setSelectedApprentice] = useState(null);
  const [realLoading, setRealLoading] = useState(false);
  const [realError, setRealError] = useState(null);
  const [isMentor, setIsMentor] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [isApprenticesOpen, setIsApprenticesOpen] = useState(false);
  const [isApplicantsOpen, setIsApplicantsOpen] = useState(false);

  // --- Applications (Real server data) ---
  const [pendingApplications, setPendingApplications] = useState([]);
  const [approvedApplications, setApprovedApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState(null);

  // Real research (non-owner): show approved apprentices too
  const [publicApprovedApplications, setPublicApprovedApplications] =
    useState([]);
  const [publicApprovedLoading, setPublicApprovedLoading] = useState(false);
  const [publicApprovedError, setPublicApprovedError] = useState(null);

  // Student view: my application status
  const [myApplication, setMyApplication] = useState(null);
  const [myApplicationLoading, setMyApplicationLoading] = useState(false);

  // Mock mode: local "as-if applied" state (never touches server)
  const [mockMyApplicationStatus, setMockMyApplicationStatus] = useState(null);

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

  // Do not force students into real mode.
  // Users can manually toggle between mock/real, and navigation may default to real.

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
        if (!cancelled)
          setRealError(err?.data?.detail || "לא הצלחתי לטעון את המחקר");
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

  // Load researches the current user has joined (approved)
  useEffect(() => {
    let cancelled = false;

    const loadJoined = async () => {
      if (!isReal) return;
      if (!user) return;
      try {
        const data = await researchAPI.listJoinedResearches();
        if (cancelled) return;
        setJoinedResearches(Array.isArray(data) ? data : []);
      } catch {
        // Non-blocking
      }
    };

    loadJoined();
    return () => {
      cancelled = true;
    };
  }, [isReal, user]);

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

  /**
   * Determine key logic values
   */
  const canEditThis =
    isReal && myResearches.some((r) => String(r.id) === String(id));
  const showEditButton = isMentor && (!isReal || canEditThis);
  const showMockToggle = true;

  /**
   * Safe list of apprentices.
   * If `data.apprentices` is missing (common with real API data initially),
   * fall back to `mockApprentices` so the UI isn't empty.
   */
  const mapApplicationToApprenticeCard = (app) => {
    if (!app) return null;
    const availabilityText = app.researchAvailability ? "כן" : "לא";
    return {
      applicationId: app.id,
      id: app.applicantProfileId || app.applicantId,
      name: app.name,
      email: app.email,
      gender: app.gender,
      medical_level: app.apprenticeStage,
      school_beginner_year: app.startYear,
      Educational_institution: app.institution,
      profileImage: app.avatarUrl,
      research_availability: availabilityText,
      application_status: app.status,
    };
  };

  const activeApprentices = useMemo(() => {
    if (isReal && canEditThis) {
      return (Array.isArray(approvedApplications) ? approvedApplications : [])
        .map(mapApplicationToApprenticeCard)
        .filter(Boolean);
    }

    if (isReal) {
      return (Array.isArray(publicApprovedApplications)
        ? publicApprovedApplications
        : [])
        .map(mapApplicationToApprenticeCard)
        .filter(Boolean);
    }

    // If we have an array of apprentices in the data, use it.
    // Otherwise, default to the mock set.
    if (Array.isArray(data?.apprentices) && data.apprentices.length > 0) {
      return data.apprentices;
    }
    // If it's real data but the field is missing/empty, we might want to show nothing?
    // The requirement says: "show mock data unless there is real one, in that case, show the real one"
    // Since our backend doesn't return `apprentices` field yet, `data.apprentices` will be undefined.
    // So we fall back to mock.
    if (!data?.apprentices) {
      return mockApprentices;
    }
    return []; // It's an empty array, so we show none.
  }, [approvedApplications, canEditThis, data, isReal, publicApprovedApplications]);

  /**
   * Safe list of pending applicants.
   * Same fallback pattern as activeApprentices.
   */
  const activeApplicants = useMemo(() => {
    if (isReal && canEditThis) {
      return (Array.isArray(pendingApplications) ? pendingApplications : [])
        .map(mapApplicationToApprenticeCard)
        .filter(Boolean);
    }

    if (isReal) {
      return [];
    }

    if (Array.isArray(data?.applicants) && data.applicants.length > 0) {
      return data.applicants;
    }
    if (!data?.applicants) {
      return mockApplicants;
    }
    return [];
  }, [canEditThis, data, isReal, pendingApplications]);

  // Load applications for mentor's own research
  useEffect(() => {
    let cancelled = false;

    const loadApplications = async () => {
      if (!isReal) return;
      if (!canEditThis) return;
      if (!id) return;

      setApplicationsError(null);
      setApplicationsLoading(true);
      try {
        const [pending, approved] = await Promise.all([
          researchAPI.listMyResearchApplications(id, "pending"),
          researchAPI.listMyResearchApplications(id, "approved"),
        ]);
        if (cancelled) return;
        setPendingApplications(Array.isArray(pending) ? pending : []);
        setApprovedApplications(Array.isArray(approved) ? approved : []);
      } catch (err) {
        if (cancelled) return;
        setApplicationsError(err?.data?.detail || "לא הצלחתי לטעון בקשות הצטרפות");
      } finally {
        if (!cancelled) setApplicationsLoading(false);
      }
    };

    loadApplications();
    return () => {
      cancelled = true;
    };
  }, [canEditThis, id, isReal]);

  // Load approved applicants for real research when viewer is NOT the owner
  useEffect(() => {
    let cancelled = false;

    const loadPublicApproved = async () => {
      if (!isReal) return;
      if (!id) return;
      if (canEditThis) return;

      setPublicApprovedError(null);
      setPublicApprovedLoading(true);
      try {
        const approved = await researchAPI.listApprovedApplicants(id);
        if (cancelled) return;
        setPublicApprovedApplications(Array.isArray(approved) ? approved : []);
      } catch (err) {
        if (cancelled) return;
        // Keep UI clean if not authenticated/allowed
        if (err?.status === 401 || err?.status === 403) {
          setPublicApprovedApplications([]);
          setPublicApprovedError(null);
        } else {
          setPublicApprovedApplications([]);
          setPublicApprovedError(
            err?.data?.detail || "לא הצלחתי לטעון מתלמדים שהתקבלו"
          );
        }
      } finally {
        if (!cancelled) setPublicApprovedLoading(false);
      }
    };

    loadPublicApproved();
    return () => {
      cancelled = true;
    };
  }, [canEditThis, id, isReal]);

  // Load student's own application status
  useEffect(() => {
    let cancelled = false;

    const loadMyApplication = async () => {
      if (!isReal) return;
      if (!id) return;
      if (canEditThis) return; // owner doesn't apply
      if (!user) {
        setMyApplication(null);
        return;
      }

      setMyApplicationLoading(true);
      try {
        const data = await researchAPI.getMyApplication(id);
        if (cancelled) return;
        setMyApplication(data);
      } catch (err) {
        // 404 means no application yet
        if (cancelled) return;
        if (err?.status === 404) {
          setMyApplication(null);
        } else {
          setMyApplication(null);
        }
      } finally {
        if (!cancelled) setMyApplicationLoading(false);
      }
    };

    loadMyApplication();
    return () => {
      cancelled = true;
    };
  }, [canEditThis, id, isReal, user]);

  const handleEditClick = () => {
    if (isReal && id && myResearches.some((r) => String(r.id) === String(id))) {
      navigate(`/research/${id}/edit`, { state: { source: "real" } });
      return;
    }
    if (isMentor) navigate("/create-research");
  };

  // handle delete research
  const handleDeleteResearch = async () => {
    if (!id) return;
    if (!canEditThis) {
      alert("אין לך הרשאה למחוק מחקר זה");
      return;
    }

    const researchTitle = data?.researchName ? `"${data.researchName}"` : `ב־ID ${id}`;

    const confirmDelete = window.confirm(
      `האם אתה בטוח שברצונך למחוק את המחקר ${researchTitle}?
לא ניתן לשחזר פעולה זו.`
    );
    if (!confirmDelete) return;

    try {
      await researchAPI.deleteMyResearch(id);
      alert("המחקר נמחק בהצלחה");
      navigate("/my-researches", { replace: true });
    } catch (err) {
      alert(err?.data?.detail || "לא הצלחתי למחוק את המחקר");
    }
  };

  const handleToggleReal = () => {
    setUseReal((v) => !v);
    setRealError(null);
  };

  // --- Applicant Actions (Placeholder) ---
  const handleApproveApplicant = async (applicationId) => {
    if (!id) return;
    try {
      await researchAPI.approveResearchApplication(id, applicationId);
      const [pending, approved] = await Promise.all([
        researchAPI.listMyResearchApplications(id, "pending"),
        researchAPI.listMyResearchApplications(id, "approved"),
      ]);
      setPendingApplications(Array.isArray(pending) ? pending : []);
      setApprovedApplications(Array.isArray(approved) ? approved : []);
    } catch (err) {
      alert(err?.data?.detail || "לא הצלחתי לאשר מועמד");
    }
  };

  const handleDeclineApplicant = async (applicationId) => {
    if (!id) return;
    try {
      await researchAPI.rejectResearchApplication(id, applicationId);
      const pending = await researchAPI.listMyResearchApplications(id, "pending");
      setPendingApplications(Array.isArray(pending) ? pending : []);
    } catch (err) {
      alert(err?.data?.detail || "לא הצלחתי לדחות מועמד");
    }
  };

  const handleApplyToResearch = async () => {
    if (!id) return;
    if (!user) {
      alert("עליך להיות מחובר כדי להגיש מועמדות");
      navigate("/login");
      return;
    }

    // Mock research IDs are not real server IDs (often numeric).
    // In mock mode, keep the UX local and do not call the backend.
    if (!isReal) {
      setMockMyApplicationStatus("pending");
      alert("הבקשה נשלחה בהצלחה (מוק)");
      return;
    }

    try {
      const app = await researchAPI.applyToResearch(id);
      setMyApplication(app);
      alert("הבקשה נשלחה בהצלחה");
    } catch (err) {
      alert(err?.data?.detail || "לא הצלחתי להגיש מועמדות");
    }
  };

  const handleCancelMyApplication = async () => {
    if (!id) return;

    if (!isReal) {
      setMockMyApplicationStatus("cancelled");
      alert("המועמדות בוטלה (מוק)");
      return;
    }

    try {
      const app = await researchAPI.cancelMyApplication(id);
      setMyApplication(app);
      alert("המועמדות בוטלה");
    } catch (err) {
      alert(err?.data?.detail || "לא הצלחתי לבטל מועמדות");
    }
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

  const distinctResearchesById = (arr) => {
    const seen = new Set();
    const out = [];
    (Array.isArray(arr) ? arr : []).forEach((r) => {
      const key = String(r?.id ?? "");
      if (!key) return;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(r);
    });
    return out;
  };

  const createdResearchOptions = isMentor ? distinctResearchesById(myResearches) : [];
  const joinedResearchOptions = distinctResearchesById(joinedResearches);
  const hasCreatedAndJoined = createdResearchOptions.length > 0 && joinedResearchOptions.length > 0;
  const showResearchDropdown = isReal && (createdResearchOptions.length > 0 || joinedResearchOptions.length > 0);

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
          <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700 }}>
            {realError}
          </div>
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
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={styles.statusBadge}>{data.status}</span>
            <span style={styles.idBadge}>ID: {data.helsinkiApproval}</span>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {showResearchDropdown && (
              <div className="researchSelectWrap" title={hasCreatedAndJoined ? "בחר מחקר (שיצרת / שנרשמת אליו)" : "בחר מחקר"}>
                <span className="researchSelectArrow" aria-hidden="true">
                  ▾
                </span>
                <select
                  className="researchSelect"
                  value={String(id || "")}
                  onChange={handleSelectMyResearch}
                >
                  <option value="" disabled>
                    בחר מחקר...
                  </option>
                  {hasCreatedAndJoined ? (
                    <>
                      {createdResearchOptions.length > 0 && (
                        <>
                          <option value="__created__" disabled>
                            — מחקרים שיצרתי —
                          </option>
                          {createdResearchOptions.map((r) => (
                            <option key={`created-${r.id}`} value={r.id}>
                              {r.researchName}
                            </option>
                          ))}
                        </>
                      )}
                      {joinedResearchOptions.length > 0 && (
                        <>
                          <option value="__joined__" disabled>
                            — מחקרים שנרשמתי אליהם —
                          </option>
                          {joinedResearchOptions.map((r) => (
                            <option key={`joined-${r.id}`} value={r.id}>
                              {r.researchName}
                            </option>
                          ))}
                        </>
                      )}
                    </>
                  ) : createdResearchOptions.length > 0 ? (
                    createdResearchOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.researchName}
                      </option>
                    ))
                  ) : (
                    joinedResearchOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.researchName}
                      </option>
                    ))
                  )}
                </select>
              </div>
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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              minWidth: 0,
            }}
          >
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
                  <button
                    onClick={handleDownloadContract}
                    style={styles.downloadBtn}
                  >
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
              value={
                data.startDate
                  ? new Date(data.startDate).toLocaleDateString("he-IL")
                  : ""
              }
            />
            <SidebarItem
              label="משך המחקר"
              value={data.durationWeeks ? `${data.durationWeeks} שבועות` : ""}
            />
            <SidebarItem
              label="שעות שבועיות"
              value={data.weeklyHours ? `${data.weeklyHours} שעות` : ""}
            />
            <SidebarItem
              label="גודל צוות"
              value={data.teamSize ? `${data.teamSize} מתלמדים` : ""}
            />
            <SidebarItem label="סוג נתונים" value={data.dataType} />

            {!canEditThis && (
              <div style={{ marginTop: 24 }}>
                {(
                  (isReal && myApplication?.status === "pending") ||
                  (!isReal && mockMyApplicationStatus === "pending")
                ) ? (
                  <button style={styles.primaryBtn} disabled>
                    הבקשה נשלחה
                  </button>
                ) : (isReal && myApplication?.status === "approved") ? (
                  <button style={styles.primaryBtn} disabled>
                    התקבלת למחקר
                  </button>
                ) : (
                  <button
                    style={styles.primaryBtn}
                    onClick={handleApplyToResearch}
                    disabled={myApplicationLoading}
                  >
                    הגש מועמדות למחקר
                  </button>
                )}

                {(
                  (isReal && myApplication?.status === "pending") ||
                  (!isReal && mockMyApplicationStatus === "pending")
                ) && (
                  <button
                    style={{ ...styles.secondaryBtn, marginTop: 10 }}
                    onClick={handleCancelMyApplication}
                    disabled={myApplicationLoading}
                  >
                    בטל מועמדות
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- Accepted Apprentices Section --- */}
        {(isReal || canEditThis || activeApprentices.length > 0) && (
          <div style={{ marginTop: 32 }}>
            <div
              className="accordion-header"
              onClick={() => setIsApprenticesOpen(!isApprenticesOpen)}
            >
              <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                מתלמדים שהתקבלו
                <span
                  style={{
                    fontWeight: 400,
                    color: "#9ca3af",
                    marginRight: 8,
                    fontSize: "0.9em",
                  }}
                >
                  ({activeApprentices.length})
                </span>
              </h3>

              <div
                style={{
                  transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: isApprenticesOpen
                    ? "rotate(0deg)"
                    : "rotate(180deg)",
                  display: "flex",
                  marginTop: 4,
                  color: "#6b7280",
                }}
              >
                <ChevronIcon />
              </div>
            </div>

            <div
              style={{
                maxHeight: isApprenticesOpen ? "2000px" : "0",
                opacity: isApprenticesOpen ? 1 : 0,
                overflow: "hidden",
                transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {(canEditThis ? applicationsError : publicApprovedError) && (
                <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 700 }}>
                  {canEditThis ? applicationsError : publicApprovedError}
                </div>
              )}

              {(canEditThis ? applicationsLoading : publicApprovedLoading) ? (
                <div style={{ marginTop: 12, color: "#6b7280", fontWeight: 700 }}>
                  טוען מתלמדים מהשרת...
                </div>
              ) : activeApprentices.length === 0 ? (
                <div style={{ marginTop: 12, color: "#6b7280", fontWeight: 700 }}>
                  אין מתלמדים שהתקבלו עדיין.
                </div>
              ) : (
                <div
                  className="apprentices-grid compact-view"
                  style={{ marginTop: 16 }}
                >
                  {activeApprentices.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => setSelectedApprentice(student)}
                    >
                      <ApprenticeCard apprentice={student} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Pending Applicants Section (Mentor Only) --- */}
        {canEditThis && (
          <div style={{ marginTop: 32 }}>
            <div
              className="accordion-header"
              onClick={() => setIsApplicantsOpen(!isApplicantsOpen)}
            >
              <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                מועמדים ממתינים
                <span
                  style={{
                    fontWeight: 400,
                    color: "#9ca3af",
                    marginRight: 8,
                    fontSize: "0.9em",
                  }}
                >
                  ({activeApplicants.length})
                </span>
              </h3>

              <div
                style={{
                  transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: isApplicantsOpen
                    ? "rotate(0deg)"
                    : "rotate(180deg)",
                  display: "flex",
                  marginTop: 4,
                  color: "#6b7280",
                }}
              >
                <ChevronIcon />
              </div>
            </div>

            <div
              style={{
                maxHeight: isApplicantsOpen ? "2000px" : "0",
                opacity: isApplicantsOpen ? 1 : 0,
                overflow: "hidden",
                transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {applicationsError && (
                <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 700 }}>
                  {applicationsError}
                </div>
              )}

              {applicationsLoading ? (
                <div style={{ marginTop: 12, color: "#6b7280", fontWeight: 700 }}>
                  טוען מועמדים מהשרת...
                </div>
              ) : activeApplicants.length === 0 ? (
                <div style={{ marginTop: 12, color: "#6b7280", fontWeight: 700 }}>
                  אין מועמדים ממתינים.
                </div>
              ) : (
                <div
                  className="apprentices-grid compact-view"
                  style={{ marginTop: 16 }}
                >
                  {activeApplicants.map((applicant) => (
                    <div key={applicant.applicationId || applicant.id} className="applicant-card-wrapper">
                      <div onClick={() => setSelectedApprentice(applicant)}>
                        <ApprenticeCard apprentice={applicant} />
                      </div>
                      <div className="applicant-actions">
                        <button
                          className="btn-approve"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveApplicant(applicant.applicationId);
                          }}
                        >
                          ✓ אשר
                        </button>
                        <button
                          className="btn-decline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeclineApplicant(applicant.applicationId);
                          }}
                        >
                          ✗ דחה
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}


        {isReal && canEditThis && (
          <div style={styles.bottomActionsContainer}>
            <button
              style={styles.deleteButton}
              onClick={handleDeleteResearch}
            >
              <DeleteIcon />
              מחיקת המחקר
            </button>
          </div>
        )}
     
      </div>

      {/* --- Details Modal --- */}
      <Modal
        isOpen={!!selectedApprentice}
        onClose={() => setSelectedApprentice(null)}
        transparent={true}
      >
        {selectedApprentice && (
          /* Render full card (without compact-view class context) so it shows all fields */
          <div className="modal-card-wrapper">
            <ApprenticeCard apprentice={selectedApprentice} />
          </div>
        )}
      </Modal>

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

        /* Apprentices Responsive Grid */
        .apprentices-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          margin-top: 8px;
        }

        /* --- Compact View Overrides (Local Only) --- */
        .compact-view {
          /* Force 1 column on mobile - completely override parent grid */
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 1rem !important;
          justify-items: stretch !important;
          align-items: stretch !important;
        }

        /* Force card to stretch to fill entire grid cell */
        .compact-view > * {
          width: 100% !important;
          justify-self: stretch !important;
        }

        .compact-view .apprenticeCard {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          padding: 1.5rem; 
          min-height: auto;
          box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.04);
          border-width: 1px; 
          box-sizing: border-box;
          display: block !important;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }

        .compact-view .apprenticeCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.1) !important;
        }

        /* Hide unwanted fields: Gender (1st), Email (class), Start Year (3rd) */
        .compact-view .card-email-group,
        .compact-view .apprenticeCard__labels > div:nth-of-type(1), /* Gender */
        .compact-view .apprenticeCard__labels > div:nth-of-type(3)  /* Start Year */ {
          display: none;
        }
        
        /* Compact Header */
        .compact-view .apprenticeCard__header {
          padding-bottom: 1rem;
          margin-bottom: 1rem;
          gap: 1rem;
        }
        .compact-view .apprenticeCard__avatar {
          width: 4.5rem;
          height: 4.5rem;
        }
        .compact-view .apprenticeCard__title {
          font-size: 1.2rem;
        }

        /* Compact Labels */
        .compact-view .apprenticeCard__labels {
          gap: 0.5rem;
          font-size: 0.95rem;
        }
        .compact-view .apprenticeCard__labels strong {
          font-size: 1rem;
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
          /* Force 3 columns for compact view on desktop */
          .compact-view {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 1rem !important;
            justify-items: stretch !important;
            align-items: stretch !important;
          }
        }

        /* --- Modal Card Styling --- */
        .modal-card-wrapper .apprenticeCard {
          border: 1px solid rgba(0,0,0,0.06) !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          border-radius: 20px !important;
          background: white;
          width: 100%;
          min-width: 320px;
          max-width: 500px;
          /* overflow: hidden; Removed to prevent scrollbars */
        }
        
        /* Accordion Header Style */
        .accordion-header {
           cursor: pointer;
           display: flex;
           align-items: center;
           justify-content: space-between;
           padding: 16px 24px;
           background-color: white;
           border: 1px solid rgba(0,0,0,0.06);
           border-radius: 12px;
           transition: all 0.2s ease;
           box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .accordion-header:hover {
           background-color: #f8f9fa;
           border-color: #d1d5db;
           transform: translateY(-1px);
           box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        /* Action Buttons for Applicants */
        .applicant-card-wrapper {
          display: flex;
          flex-direction: column;
        }
        .applicant-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding: 0 8px;
        }
        .applicant-actions button {
          flex: 1;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        .btn-approve {
          background-color: #10b981;
          color: white;
        }
        .btn-approve:hover {
          background-color: #059669;
          transform: translateY(-1px);
        }
        .btn-decline {
          background-color: #ef4444;
          color: white;
        }
        .btn-decline:hover {
          background-color: #dc2626;
          transform: translateY(-1px);
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

const DeleteIcon = () => (
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
    <path d="M3 6h18"></path>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
  </svg>
);

const ChevronIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    color="#2C2C6C"
  >
    <path d="M6 9l6 6 6-6" />
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
  titleUnderline: {
    width: 50,
    height: 4,
    background: ACCENT_TEAL,
    margin: "0 auto",
    borderRadius: 2,
  },

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
    justifyContent: "center", 
    flexWrap: "wrap",        
    gap: 20,                  
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
  infoBox: {
    background: BG_GRAY,
    padding: 16,
    borderRadius: 12,
    border: "1px solid #eee",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 700,
    margin: "0 0 8px 0",
    color: THEME_COLOR,
  },
  divider: { height: 1, background: "#ddd", margin: "16px 0" },

  tagsContainer: { display: "flex", flexWrap: "wrap", gap: 8 },
  skillTag: {
    background: "white",
    border: "1px solid #ddd",
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 13,
    color: "#555",
  },

  sidebar: {
    background: "#fdfdfd",
    padding: 20,
    borderRadius: 12,
    border: "1px solid #eee",
  },
  sidebarHeaderTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 16,
    color: THEME_COLOR,
  },
  sidebarItem: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 12,
    fontSize: 14,
    gap: 10,
  },
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
  fileName: {
    fontWeight: 600,
    fontSize: 13,
    color: THEME_COLOR,
    wordBreak: "break-all",
  },
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

  secondaryBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: 30,
    background: "white",
    color: THEME_COLOR,
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 800,
    border: `1px solid rgba(44, 44, 108, 0.25)`,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
    transition: "0.2s",
  },

  deleteButton: {
    display: "flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: 20,
    border: "none",
    background: "#000000", // שחור
    color: "#ffffff", // לבן
    fontSize: 13,
    fontWeight: "600",
    cursor: "pointer",
    transition: "0.2s",
    whiteSpace: "nowrap",
    marginRight: 8, // רווח קטן מכפתור העריכה
  },

  bottomActionsContainer: {
    display: "flex",          // משתמשים ב-Flexbox
    justifyContent: "center", // מרכוז אופקי
    alignItems: "center",     // מרכוז אנכי
    marginTop: "40px",        // רווח מהתוכן שמעל
    paddingTop: "20px",       // רווח פנימי
    borderTop: "1px solid #eee", // קו עדין מפריד (אופציונלי, נותן תחושת סדר)
    width: "100%",            // תופס את כל רוחב הכרטיס כדי שיוכל למרכז
  },
};
