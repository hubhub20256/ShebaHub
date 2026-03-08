/**
 * @file Research.jsx
 * @description Research Details Page - Displays detailed information about a specific research project.
 *
 * ## Features
 * - **Research Overview**: Displays the research name, description, requirements, skills, and logistics.
 * - **Accepted Apprentices**: Shows a grid of apprentices who have been approved to join the research.
 * - **Pending Applicants**: (Mentor only) Displays applicants awaiting approval, with Approve/Decline actions.
 * - **Mobile Responsive**: Fully responsive layout that stacks elements vertically on small screens.
 *
 * ## Key Components
 * - `ResearchApprenticeCard`: A locally-defined card component for displaying apprentice/applicant info.
 * - `Section`, `DetailItem`, `SidebarItem`: Helper components for structured content display.
 *
 * @author ShebaHub Team
 * @since 2024
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { profilesAPI, researchAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import usePageTitle from "../hooks/usePageTitle";
import LoadingSpinner from "../components/LoadingSpinner";
import ResearchChat from "./ResearchChat";
import "../styles/Research.css";

const STATUS_MAP = {
  open: "פתוח",
  in_progress: "בתהליך",
  completed: "הושלם",
  closed: "סגור",
  draft: "טיוטה",
};

/**
 * ResearchApprenticeCard
 * A compact card for displaying apprentice/applicant information within the Research page.
 * Defined locally to avoid modifying the shared `ApprenticeCard` component.
 *
 * @param {Object} props
 * @param {Object} props.apprentice - The apprentice/applicant data object.
 * @param {Function} [props.onClick] - Optional click handler for the card.
 * @param {React.ReactNode} [props.children] - Optional children (e.g., action buttons).
 * @returns {JSX.Element}
 */
const ResearchApprenticeCard = ({ apprentice, onClick, children }) => {
  const navigate = useNavigate();
  // Default image fallback
  const avatarUrl = apprentice.profileImage || null;
  
  const handleProfileClick = (e) => {
    e.stopPropagation(); // Don't trigger the card onClick
    if (apprentice && apprentice.id) {
      navigate(`/user/${apprentice.id}`);
    }
  };
  
  return (
    <div className="research-apprentice-card" onClick={onClick} dir="rtl">
      {/* Mentor/Owner tag */}
      {!apprentice.hasStudentProfile && (
        <span className="rac-mentor-tag">{apprentice.isOwner ? "חוקר ראשי" : "מנחה"}</span>
      )}
      {/* Top section with avatar */}
      <div className="rac-avatar-container">
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={apprentice.name} 
            className="rac-avatar-img"
          />
        ) : (
          <div className="rac-avatar-placeholder">
            <span>👤</span>
          </div>
        )}
      </div>
      
      {/* Name */}
      <h3 className="rac-name">{apprentice.name}</h3>
      
      {/* Info rows */}
      <div className="rac-info">
        <div className="rac-info-row">
          <span className="rac-label">מוסד לימודים:</span>
          <span className="rac-value">{apprentice.Educational_institution || "לא צוין"}</span>
        </div>
        
        <div className="rac-info-row">
          <span className="rac-label">שלב בהכשרה הרפואית:</span>
          <span className="rac-value rac-value-highlight">
            {apprentice.medical_level || "לא צוין"}
          </span>
        </div>
      </div>
      
      {/* Profile button */}
      <button className="rac-profile-btn" onClick={handleProfileClick}>
        לחץ לפרופיל מלא
      </button>

      {/* Action Buttons (Approve/Decline) */}
      {children && (
        <div className="rac-actions-container">
          {children}
        </div>
      )}
    </div>
  );
};


// --- Theme Constants ---
const THEME_COLOR = "#2C2C6C";
const ACCENT_TEAL = "#6cd5bf";
const ACCENT_PINK = "#ef67a0";
const BG_GRAY = "#f8f9fa";

/** Research Component */
export default function Research() {
  usePageTitle("מחקר");
  const { user } = useAuth();
  const { refreshCount } = useNotifications();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [research, setResearch] = useState(null);
  const [myResearches, setMyResearches] = useState([]);
  const [joinedResearches, setJoinedResearches] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMentor, setIsMentor] = useState(false);
  const [isApprenticesOpen, setIsApprenticesOpen] = useState(true);
  const [isMentorsOpen, setIsMentorsOpen] = useState(true);
  const [isApplicantsOpen, setIsApplicantsOpen] = useState(true);

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
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Prefer local auth flags (fast + works even if backend is temporarily down).
      if (user && typeof user.has_mentor_profile === "boolean") {
        if (!cancelled) {
          setIsMentor(user.has_mentor_profile);
        }
        return;
      }

      // Fallback: ask backend.
      if (!user) {
        if (!cancelled) {
          setIsMentor(false);
        }
        return;
      }

      try {
        await profilesAPI.getMyMentorProfile();
        if (!cancelled) setIsMentor(true);
      } catch {
        if (!cancelled) setIsMentor(false);
      } finally {
        // role check complete
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Combined data loading: research detail + myResearches + joinedResearches (parallel)
  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      if (!id) return;

      setError(null);
      setLoading(true);
      try {
        const [researchData, myRes, joined] = await Promise.all([
          researchAPI.getResearch(id),
          isMentor
            ? researchAPI.listMyResearches().catch(() => [])
            : Promise.resolve(null),
          user
            ? researchAPI.listJoinedResearches().catch(() => [])
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setResearch(researchData);
        if (myRes !== null) setMyResearches(Array.isArray(myRes) ? myRes : []);
        if (joined !== null) setJoinedResearches(Array.isArray(joined) ? joined : []);
      } catch (err) {
        if (!cancelled)
          setError(err?.data?.detail || "לא הצלחתי לטעון את המחקר");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [id, location.key, isMentor, user]);

  // Silent refresh (no loading spinner) — used by visibility listener
  const refreshResearch = useCallback(async () => {
    if (!id) return;
    try {
      const data = await researchAPI.getResearch(id);
      setResearch(data);
    } catch { /* non-blocking */ }
  }, [id]);

  // Re-fetch research when tab becomes visible again (30s throttle)
  const lastRefreshRef = useRef(0);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) return;
      const now = Date.now();
      if (now - lastRefreshRef.current < 30_000) return;
      lastRefreshRef.current = now;
      refreshResearch();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refreshResearch]);

  const data = research;

  const skills = useMemo(() => {
    const s = data?.skillsAndTools;
    if (!s) return [];
    return String(s)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [data]);

  /**
   * Determine key logic values — granular per-mentor permissions
   */
  const myResearchEntry = myResearches.find((r) => String(r.id) === String(id));
  const isOwner = myResearchEntry?.is_owner === true;
  const canEditThis = isOwner || myResearchEntry?.my_permissions?.can_edit === true;
  const canApproveThis = isOwner || myResearchEntry?.my_permissions?.can_approve === true;
  const canInviteThis = isOwner || myResearchEntry?.my_permissions?.can_invite === true;
  const canRemoveThis = isOwner || myResearchEntry?.my_permissions?.can_remove === true;
  const canManageChatThis = isOwner || myResearchEntry?.my_permissions?.can_manage_chat === true;
  const hasAnyPermission = canEditThis || canApproveThis || canInviteThis || canRemoveThis || canManageChatThis;
  const showEditButton = isMentor && canEditThis;

  const mapApplicationToApprenticeCard = (app) => {
    if (!app) return null;
    return {
      applicationId: app.id,
      id: app.applicantProfileId || app.applicantMentorProfileId || app.applicantId,
      applicantUserId: app.applicantId,
      name: app.name,
      email: app.email,
      gender: app.gender,
      medical_level: app.apprenticeStage,
      school_beginner_year: app.startYear,
      Educational_institution: app.institution,
      profileImage: app.avatarUrl,
      isAvailableForResearch: app.researchAvailability,
      hasStudentProfile: app.hasStudentProfile,
      application_status: app.status,
      can_edit: app.can_edit,
      can_approve: app.can_approve,
      can_invite: app.can_invite,
      can_remove: app.can_remove,
      can_manage_chat: app.can_manage_chat,
    };
  };

  const allApproved = useMemo(() => {
    if (hasAnyPermission) {
      return (Array.isArray(approvedApplications) ? approvedApplications : [])
        .map(mapApplicationToApprenticeCard)
        .filter(Boolean);
    }
    return (Array.isArray(publicApprovedApplications)
      ? publicApprovedApplications
      : [])
      .map(mapApplicationToApprenticeCard)
      .filter(Boolean);
  }, [approvedApplications, hasAnyPermission, publicApprovedApplications]);

  const activeApprentices = useMemo(() => allApproved.filter((a) => a.hasStudentProfile), [allApproved]);
  const activeMentors = useMemo(() => {
    const mentors = [];
    const seenUserIds = new Set();

    // Always add the research owner first
    if (data?.ownerName) {
      mentors.push({
        id: data.ownerProfileId || data.ownerId,
        applicantUserId: data.ownerId,
        name: data.ownerName,
        profileImage: data.ownerAvatarUrl,
        hasStudentProfile: false,
        isOwner: true,
      });
      if (data.ownerId) seenUserIds.add(String(data.ownerId));
    }

    // Add other approved mentors (excluding the owner to avoid duplicates)
    for (const a of allApproved) {
      if (a.hasStudentProfile) continue;
      const uid = String(a.applicantUserId);
      if (seenUserIds.has(uid)) continue;
      seenUserIds.add(uid);
      mentors.push(a);
    }

    return mentors;
  }, [allApproved, data?.ownerName, data?.ownerAvatarUrl, data?.ownerProfileId, data?.ownerId]);

  const activeApplicants = useMemo(() => {
    if (canApproveThis) {
      return (Array.isArray(pendingApplications) ? pendingApplications : [])
        .map(mapApplicationToApprenticeCard)
        .filter(Boolean);
    }
    return [];
  }, [canApproveThis, pendingApplications]);

  // Load applications for mentor's own research (or permitted mentor)
  useEffect(() => {
    let cancelled = false;

    const loadApplications = async () => {
      if (!hasAnyPermission) return;
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
  }, [hasAnyPermission, id]);

  // Load approved applicants for real research when viewer is NOT the owner/permitted
  useEffect(() => {
    let cancelled = false;

    const loadPublicApproved = async () => {
      if (!id) return;
      if (hasAnyPermission) return;

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
  }, [hasAnyPermission, id]);

  // Load student's own application status
  useEffect(() => {
    let cancelled = false;

    const loadMyApplication = async () => {
      if (!id) return;
      if (hasAnyPermission) return; // owner/permitted mentor doesn't need this
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
  }, [hasAnyPermission, id, user]);

  const handleEditClick = () => {
    if (id && canEditThis) {
      navigate(`/research/${id}/edit`);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!id || !canEditThis) return;
    try {
      const updated = await researchAPI.updateMyResearch(id, { status: newStatus });
      setResearch(updated);
      // Re-fetch approved applicants (public list) so counts stay in sync
      try {
        const [pending, approved] = await Promise.all([
          researchAPI.listMyResearchApplications(id, "pending"),
          researchAPI.listMyResearchApplications(id, "approved"),
        ]);
        setPendingApplications(Array.isArray(pending) ? pending : []);
        setApprovedApplications(Array.isArray(approved) ? approved : []);
      } catch { /* non-blocking */ }
      toast.success("סטטוס המחקר עודכן בהצלחה");
    } catch (err) {
      toast.error(err?.data?.detail || "לא הצלחתי לעדכן את סטטוס המחקר");
    }
  };

  const handleToggleApplications = async () => {
    if (!id || !canEditThis) return;
    const newValue = !data.accepting_applications;
    try {
      const updated = await researchAPI.updateMyResearch(id, { accepting_applications: newValue });
      setResearch(updated);
      // Re-fetch from server to get canonical accepting_applications value
      try {
        const fresh = await researchAPI.getResearch(id);
        setResearch(fresh);
      } catch { /* non-blocking */ }
    } catch (err) {
      toast.error(err?.data?.detail || "לא הצלחתי לעדכן");
    }
  };

  // handle delete research — owner only
  const handleDeleteResearch = () => {
    if (!id) return;
    if (!isOwner) {
      toast.error("רק בעל המחקר יכול למחוק אותו");
      return;
    }

    const researchTitle = data?.researchName ? `"${data.researchName}"` : `ב־ID ${id}`;

    setConfirmDialog({
      message: `האם אתה בטוח שברצונך למחוק את המחקר ${researchTitle}?\nלא ניתן לשחזר פעולה זו.`,
      onConfirm: async () => {
        try {
          await researchAPI.deleteMyResearch(id);
          toast.success("המחקר נמחק בהצלחה");
          navigate("/my-researches", { replace: true });
        } catch (err) {
          toast.error(err?.data?.detail || "לא הצלחתי למחוק את המחקר");
        }
      },
    });
  };

  // --- Applicant Actions ---
  const handleApproveApplicant = async (applicationId) => {
    if (!id) return;
    try {
      await researchAPI.approveResearchApplication(id, applicationId);
      const [pending, approved, updated] = await Promise.all([
        researchAPI.listMyResearchApplications(id, "pending"),
        researchAPI.listMyResearchApplications(id, "approved"),
        researchAPI.getResearch(id),
      ]);
      setPendingApplications(Array.isArray(pending) ? pending : []);
      setApprovedApplications(Array.isArray(approved) ? approved : []);
      setResearch(updated);
      refreshCount();
    } catch (err) {
      toast.error(err?.data?.detail || "לא הצלחתי לאשר מועמד");
    }
  };

  const handleDeclineApplicant = async (applicationId) => {
    if (!id) return;
    try {
      await researchAPI.rejectResearchApplication(id, applicationId);
      const [pending, updated] = await Promise.all([
        researchAPI.listMyResearchApplications(id, "pending"),
        researchAPI.getResearch(id),
      ]);
      setPendingApplications(Array.isArray(pending) ? pending : []);
      setResearch(updated);
      refreshCount();
    } catch (err) {
      toast.error(err?.data?.detail || "לא הצלחתי לדחות מועמד");
    }
  };

  const handleRemoveStudent = (applicationId) => {
    if (!id) return;
    setConfirmDialog({
      message: "האם אתה בטוח שברצונך להסיר מתלמד/ת זו מהמחקר?",
      onConfirm: async () => {
        try {
          await researchAPI.removeResearchStudent(id, applicationId);
          const [approved, updated] = await Promise.all([
            researchAPI.listMyResearchApplications(id, "approved"),
            researchAPI.getResearch(id),
          ]);
          setApprovedApplications(Array.isArray(approved) ? approved : []);
          setResearch(updated);
          refreshCount();
          toast.success("המתלמד/ת הוסר/ה מהמחקר בהצלחה");
        } catch (err) {
          toast.error(err?.data?.detail || "לא הצלחתי להסיר מתלמד/ת");
        }
      },
    });
  };

  const handleApplyToResearch = async () => {
    if (!id) return;
    if (!user) {
      toast.error("עליך להיות מחובר כדי להגיש מועמדות");
      navigate("/login");
      return;
    }

    try {
      const app = await researchAPI.applyToResearch(id);
      setMyApplication(app);
      refreshCount();
      toast.success("הבקשה נשלחה בהצלחה");
    } catch (err) {
      const errMsg = err?.data?.message || err?.data?.detail || "";
      const isEmailNotVerified =
        err?.status === 403 &&
        typeof errMsg === "string" &&
        errMsg.toLowerCase().includes("verify your email");
      toast.error(
        isEmailNotVerified
          ? "יש לאמת את כתובת האימייל לפני הגשת מועמדות למחקר. בדוק/י את תיבת הדואר הנכנס."
          : errMsg || "לא הצלחתי להגיש מועמדות"
      );
    }
  };

  const handleCancelMyApplication = async () => {
    if (!id) return;

    try {
      const app = await researchAPI.cancelMyApplication(id);
      setMyApplication(app);
      // Re-fetch research to update application count display
      try {
        const updated = await researchAPI.getResearch(id);
        setResearch(updated);
      } catch { /* non-blocking */ }
      refreshCount();
      toast.success("המועמדות בוטלה");
    } catch (err) {
      toast.error(err?.data?.detail || "לא הצלחתי לבטל מועמדות");
    }
  };

  const handleAcceptInvite = async () => {
    if (!id) return;
    try {
      const app = await researchAPI.acceptInvite(id);
      setMyApplication(app);
      // Re-fetch approved applicants and research so counts update immediately
      try {
        const [approved, updated] = await Promise.all([
          researchAPI.listApprovedApplicants(id),
          researchAPI.getResearch(id),
        ]);
        setPublicApprovedApplications(Array.isArray(approved) ? approved : []);
        setResearch(updated);
      } catch { /* non-blocking */ }
      refreshCount();
      toast.success("ההזמנה התקבלה בהצלחה!");
    } catch (err) {
      toast.error(err?.data?.detail || "לא הצלחתי לקבל את ההזמנה");
    }
  };

  const handleDeclineInvite = async () => {
    if (!id) return;
    try {
      const app = await researchAPI.declineInvite(id);
      setMyApplication(app);
      // Re-fetch research to update counts
      try {
        const updated = await researchAPI.getResearch(id);
        setResearch(updated);
      } catch { /* non-blocking */ }
      refreshCount();
      toast.success("ההזמנה נדחתה");
    } catch (err) {
      toast.error(err?.data?.detail || "לא הצלחתי לדחות את ההזמנה");
    }
  };

  const handleLeaveResearch = () => {
    if (!id) return;
    setConfirmDialog({
      message: "האם את/ה בטוח/ה שברצונך לעזוב את המחקר?",
      onConfirm: async () => {
        try {
          const app = await researchAPI.leaveResearch(id);
          setMyApplication(app);
          // Re-fetch approved applicants
          try {
            const approved = await researchAPI.listApprovedApplicants(id);
            setPublicApprovedApplications(Array.isArray(approved) ? approved : []);
          } catch { /* non-blocking */ }
          // Re-fetch research to update isFull / accepting_applications
          try {
            const updated = await researchAPI.getResearch(id);
            setResearch(updated);
          } catch { /* non-blocking */ }
          refreshCount();
          toast.success("עזבת את המחקר בהצלחה");
        } catch (err) {
          toast.error(err?.data?.detail || "לא הצלחתי לעזוב את המחקר");
        }
      },
    });
  };

  const handlePermissionToggle = async (applicationId, field, currentValue) => {
    if (!id || !isOwner) return;
    try {
      const updated = await researchAPI.updateMentorPermissions(id, applicationId, {
        [field]: !currentValue,
      });
      // Update the approved applications list with the new permission values
      setApprovedApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId
            ? { ...app, can_edit: updated.can_edit, can_approve: updated.can_approve, can_invite: updated.can_invite, can_remove: updated.can_remove, can_manage_chat: updated.can_manage_chat }
            : app
        )
      );
    } catch (err) {
      toast.error(err?.data?.detail || "לא הצלחתי לעדכן הרשאות");
    }
  };

  const handleDownloadContract = async () => {
    const url = data?.contractUrl;
    if (!url) return;
    const fileName = data?.contractFileName || "contract";

    try {
      // Fetching the file directly from the URL. 
      // Note: We intentionally DO NOT send the Authorization Bearer token here.
      // This is because we want the contract file to be publicly accessible to ANY user
      // viewing this research page, regardless of whether they are a member, mentor, or even logged in.
      // *Backend Requirement*: The backend endpoint serving this URL MUST be configured to allow unauthenticated GET requests.
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
      toast.error("שגיאה בהורדת הקובץ. ייתכן שהקובץ אינו זמין יותר או שאין לך הרשאה מתאימה.");
    }
  };

  const handleSelectMyResearch = (e) => {
    const nextId = e.target.value;
    if (!nextId) return;
    navigate(`/research/${nextId}`);
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
  const showResearchDropdown = createdResearchOptions.length > 0 || joinedResearchOptions.length > 0;

  if (loading) {
    return (
      <div className="research-detail-page" style={styles.page} dir="rtl">
        <LoadingSpinner text="טוען מחקר..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="research-detail-page" style={styles.page} dir="rtl">
        <div style={styles.header}>
          <div style={styles.title}>שגיאה</div>
          <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700 }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="research-detail-page" style={styles.page} dir="rtl">
        <div style={styles.header}>
          <div style={styles.title}>לא נמצא מחקר</div>
        </div>
      </div>
    );
  }

  return (
    <div className="research-detail-page" style={styles.page} dir="rtl">
      {confirmDialog && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }} onClick={() => setConfirmDialog(null)}>
          <div style={{ background: "var(--card-bg, #fff)", color: "var(--text-color, #333)", borderRadius: 12, padding: "24px 28px", maxWidth: "min(400px, 90vw)", width: "90%", boxShadow: "0 8px 30px rgba(0,0,0,0.2)", direction: "rtl" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 20, whiteSpace: "pre-line" }}>{confirmDialog.message}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setConfirmDialog(null)} style={{ padding: "8px 20px", borderRadius: 20, border: "1px solid var(--border-color, #ddd)", background: "var(--card-bg, #fff)", color: "var(--text-color, #666)", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>ביטול</button>
              <button onClick={() => { setConfirmDialog(null); confirmDialog.onConfirm(); }} style={{ padding: "8px 20px", borderRadius: 20, border: "none", background: THEME_COLOR, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>אישור</button>
            </div>
          </div>
        </div>
      )}
      <div style={styles.header}>
        <div style={styles.title}>{data.researchName}</div>
        <div style={styles.titleUnderline}></div>
      </div>

      <div className="main-card research-detail-card" style={styles.card}>
        <div className="action-bar rd-action-bar" style={styles.actionBar}>
          <div
            className="status-group"
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {canEditThis ? (
              <select
                value={data.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  border: "1px solid #d1d5db",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#0d9488",
                  background: "#e6fffa",
                  cursor: "pointer",
                }}
              >
                <option value="draft">טיוטה</option>
                <option value="open">פתוח</option>
                <option value="in_progress">בתהליך</option>
                <option value="closed">סגור</option>
                <option value="completed">הושלם</option>
              </select>
            ) : (
              <span style={styles.statusBadge}>{STATUS_MAP[data.status] || data.status}</span>
            )}
            {canEditThis ? (
              data.isFull ? (
                <span
                  style={{
                    padding: "4px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    background: "#fee2e2",
                    color: "#dc2626",
                  }}
                >
                  לא זמין להצטרפות (הצוות מלא)
                </span>
              ) : (
              <button
                onClick={handleToggleApplications}
                style={{
                  padding: "4px 14px",
                  borderRadius: 20,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: data.accepting_applications ? "#dcfce7" : "#fee2e2",
                  color: data.accepting_applications ? "#16a34a" : "#dc2626",
                }}
              >
                {data.accepting_applications ? "הגשות פתוחות" : "הגשות סגורות"}
              </button>
              )
            ) : (
              <span
                style={{
                  padding: "4px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: data.isFull ? "#fee2e2" : data.accepting_applications ? "#dcfce7" : "#fee2e2",
                  color: data.isFull ? "#dc2626" : data.accepting_applications ? "#16a34a" : "#dc2626",
                }}
              >
                {data.isFull ? "לא זמין להצטרפות" : data.accepting_applications ? "הגשות פתוחות" : "הגשות סגורות"}
              </span>
            )}
            <span style={styles.idBadge}>ID: {id}</span>
          </div>

          <div className="action-bar-controls" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {showResearchDropdown && (
              <div className="researchSelectWrap" title={hasCreatedAndJoined ? "בחר מחקר (שיצרת / שנרשמת אליו)" : "בחר מחקר"}>
                <span className="researchSelectArrow" aria-hidden="true">
                  ▾
                </span>
                <select
                  className="researchSelect"
                  value={
                    createdResearchOptions.some((r) => String(r.id) === String(id)) ||
                    joinedResearchOptions.some((r) => String(r.id) === String(id))
                      ? String(id || "")
                      : ""
                      
                  }
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
                            <option key={`created-${r.id}`} value={String(r.id)}>
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

            {showEditButton && (
            
                <button className="rd-edit-btn" onClick={handleEditClick} style={styles.editButton}>
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
              <p className="rd-text" style={styles.text}>{data.description}</p>
            </Section>

            <Section title="דרישות ומיומנויות">
              <div className="rd-info-box" style={styles.infoBox}>
                <h4 className="rd-info-title" style={styles.infoTitle}>דרישות סף:</h4>
                <p className="rd-text" style={styles.text}>{data.requirements}</p>

                <div className="rd-divider" style={styles.divider}></div>

                <h4 className="rd-info-title" style={styles.infoTitle}>כלים וטכנולוגיות:</h4>
                <div style={styles.tagsContainer}>
                  {skills.map((skill, idx) => (
                    <span className="rd-skill-tag" key={idx} style={styles.skillTag}>
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="תוצרים ותגמול">
              <div className="details-grid">
                <DetailItem label="סוג תגמול" value={Array.isArray(data.compensation) ? data.compensation.join(", ") : data.compensation} />
                <DetailItem label="תוצרי מחקר מצופים" value={data.output} />
              </div>
            </Section>

            {data.contractFileName && (
              <div className="file-card rd-file-card" style={styles.fileCard}>
                <div style={styles.fileIcon}>📄</div>
                <div style={styles.fileInfo}>
                  <div className="rd-file-name" style={styles.fileName}>{data.contractFileName}</div>
                  <div style={styles.fileAction}>לחץ להורדת חוזה</div>
                </div>
                {/* 
                  We removed the {data.contractUrl ? ... : disabled} check here. 
                  Now, as long as there is a contractFileName, the user can click download.
                  (Assuming the backend returns a public presigned URL or public route for it regardless of auth status).
                */}
                <button
                  className="rd-download-btn"
                  onClick={handleDownloadContract}
                  style={styles.downloadBtn}
                >
                  הורדה
                </button>
              </div>
            )}
          </div>

          <div className="rd-sidebar" style={styles.sidebar}>
            <h3 style={styles.sidebarHeaderTitle}>לוגיסטיקה וצוות</h3>

            <SidebarItem label="מיקום" value={data.location} />
            <SidebarItem label="תחום" value={data.researchArea} />
            <SidebarItem label="אופן עבודה" value={data.workMode} />
            <div className="rd-divider" style={styles.divider}></div>
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
              value={data.durationMonths ? `${data.durationMonths} חודשים` : ""}
            />
            <SidebarItem
              label="שעות שבועיות"
              value={data.weeklyHours ? `${data.weeklyHours} שעות` : ""}
            />
            <SidebarItem
              label="גודל צוות, לא כולל מנחים"
              value={data.teamSize ? `${data.teamSize} מתלמדים` : ""}
            />
            <SidebarItem label="סוג נתונים" value={data.dataType} />

            {data.ownerName && (
              <>
                <div className="rd-divider" style={styles.divider}></div>
                <div
                  className="rd-owner-ticket"
                  onClick={() => data.ownerProfileId && navigate(`/user/${data.ownerProfileId}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#fafafa",
                    cursor: data.ownerProfileId ? "pointer" : "default",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { if (data.ownerProfileId) e.currentTarget.style.borderColor = "#6cd5bf"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "#f0fdf9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #e8f5f2",
                  }}>
                    {data.ownerAvatarUrl ? (
                      <img src={data.ownerAvatarUrl} alt={data.ownerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 16, color: "#94a3b8" }}>👤</span>
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME_COLOR, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {data.ownerName}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.2, marginTop: 1 }}>
                      {data.ownerRole || "חוקר ראשי"}
                    </div>
                  </div>
                  {data.ownerProfileId && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  )}
                </div>
              </>
            )}

            {activeMentors.filter((m) => !m.isOwner).length > 0 && (
              <>
                {activeMentors.filter((m) => !m.isOwner).map((mentor) => (
                  <div
                    key={mentor.id}
                    className="rd-owner-ticket"
                    onClick={() => mentor.id && navigate(`/user/${mentor.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: "#fafafa",
                      cursor: mentor.id ? "pointer" : "default",
                      transition: "all 0.2s ease",
                      marginTop: 6,
                    }}
                    onMouseEnter={(e) => { if (mentor.id) e.currentTarget.style.borderColor = "#6cd5bf"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                      background: "#f0fdf9", display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1px solid #e8f5f2",
                    }}>
                      {mentor.profileImage ? (
                        <img src={mentor.profileImage} alt={mentor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 16, color: "#94a3b8" }}>👤</span>
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: THEME_COLOR, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {mentor.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.2, marginTop: 1 }}>
                        מנחה
                      </div>
                    </div>
                    {mentor.id && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    )}
                  </div>
                ))}
              </>
            )}

            {!hasAnyPermission && (
              <div style={{ marginTop: 24 }}>
                {myApplication?.status === "invited" ? (
                  <div>
                    <div style={{
                      background: "#eef2ff",
                      border: "1px solid #c7d2fe",
                      borderRadius: 12,
                      padding: "12px 16px",
                      marginBottom: 12,
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#4338ca",
                    }}>
                      קיבלת הזמנה למחקר זה
                    </div>
                    <button
                      style={{ ...styles.primaryBtn, background: "#10b981" }}
                      onClick={handleAcceptInvite}
                      disabled={myApplicationLoading}
                    >
                      קבל הזמנה
                    </button>
                    <button
                      className="rd-secondary-btn"
                      style={{ ...styles.secondaryBtn, marginTop: 10 }}
                      onClick={handleDeclineInvite}
                      disabled={myApplicationLoading}
                    >
                      דחה הזמנה
                    </button>
                  </div>
                ) : (
                  <>
                    {myApplication?.status === "pending" ? (
                      <button style={styles.primaryBtn} disabled>
                        הבקשה נשלחה
                      </button>
                    ) : myApplication?.status === "approved" ? (
                      <>
                        <button style={styles.primaryBtn} disabled>
                          התקבלת למחקר
                        </button>
                        <button
                          className="rd-secondary-btn"
                          style={{ ...styles.secondaryBtn, marginTop: 10, color: "#dc2626", borderColor: "#dc2626" }}
                          onClick={handleLeaveResearch}
                          disabled={myApplicationLoading}
                        >
                          עזוב מחקר
                        </button>
                      </>
                    ) : (data.isFull && !isMentor) ? (
                      <div style={{
                        textAlign: "center",
                        color: "#dc2626",
                        fontSize: 14,
                        fontWeight: 600,
                        padding: "10px 0",
                      }}>
                        הצוות מלא - לא זמין להצטרפות
                      </div>
                    ) : (!data.accepting_applications && !isMentor) ? (
                      <div style={{
                        textAlign: "center",
                        color: "#dc2626",
                        fontSize: 14,
                        fontWeight: 600,
                        padding: "10px 0",
                      }}>
                        ההגשות למחקר זה סגורות כרגע
                      </div>
                    ) : (
                      <button
                        style={styles.primaryBtn}
                        onClick={handleApplyToResearch}
                        disabled={myApplicationLoading}
                      >
                        הגש מועמדות למחקר
                      </button>
                    )}

                    {myApplication?.status === "pending" && (
                      <button
                        className="rd-secondary-btn"
                        style={{ ...styles.secondaryBtn, marginTop: 10 }}
                        onClick={handleCancelMyApplication}
                        disabled={myApplicationLoading}
                      >
                        בטל מועמדות
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- Accepted Apprentices Section --- */}
        {(hasAnyPermission || myApplication?.status === "approved") && (
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
              {(hasAnyPermission ? applicationsError : publicApprovedError) && (
                <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 700 }}>
                  {hasAnyPermission ? applicationsError : publicApprovedError}
                </div>
              )}

              {(hasAnyPermission ? applicationsLoading : publicApprovedLoading) ? (
                <div style={{ marginTop: 12, color: "#6b7280", fontWeight: 700 }}>
                  טוען מתלמדים מהשרת...
                </div>
              ) : activeApprentices.length === 0 ? (
                <div style={{ marginTop: 12, color: "#6b7280", fontWeight: 700 }}>
                  אין מתלמדים שהתקבלו עדיין.
                </div>
              ) : (
                <div
                  className="research-apprentices-grid"
                  style={{ marginTop: 16 }}
                >
                  {activeApprentices.map((student) => (
                    <ResearchApprenticeCard
                      key={student.id}
                      apprentice={student}
                    >
                      {canRemoveThis && (
                        <div className="applicant-actions">
                          <button
                            className="btn-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveStudent(student.applicationId);
                            }}
                          >
                            הסר מהמחקר
                          </button>
                        </div>
                      )}
                    </ResearchApprenticeCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Mentors in Research Section --- */}
        {(hasAnyPermission || activeMentors.length > 0 || publicApprovedLoading || activeApprentices.length > 0) && (
          <div style={{ marginTop: 32 }}>
            <div
              className="accordion-header"
              onClick={() => setIsMentorsOpen(!isMentorsOpen)}
            >
              <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                מנחים במחקר
                <span
                  style={{
                    fontWeight: 400,
                    color: "#9ca3af",
                    marginRight: 8,
                    fontSize: "0.9em",
                  }}
                >
                  ({activeMentors.length})
                </span>
              </h3>

              <div
                style={{
                  transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: isMentorsOpen ? "rotate(0deg)" : "rotate(180deg)",
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
                maxHeight: isMentorsOpen ? "2000px" : "0",
                opacity: isMentorsOpen ? 1 : 0,
                overflow: "hidden",
                transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {(hasAnyPermission ? applicationsLoading : publicApprovedLoading) ? (
                <div style={{ marginTop: 12, color: "#6b7280", fontWeight: 700 }}>
                  טוען מנחים מהשרת...
                </div>
              ) : activeMentors.length === 0 ? (
                <div style={{ marginTop: 12, color: "#6b7280", fontWeight: 700 }}>
                  אין מנחים נוספים במחקר.
                </div>
              ) : (
                <div
                  className="research-apprentices-grid"
                  style={{ marginTop: 16 }}
                >
                  {activeMentors.map((mentor) => (
                    <ResearchApprenticeCard
                      key={mentor.id}
                      apprentice={mentor}
                    >
                      {isOwner && !mentor.isOwner && (
                        <div className="mentor-permissions-toggles" onClick={(e) => e.stopPropagation()}>
                          <div className="permissions-title">הרשאות:</div>
                          {[
                            { field: "can_edit", label: "עריכת מחקר" },
                            { field: "can_approve", label: "אישור/דחיית מועמדים" },
                            { field: "can_invite", label: "הזמנת משתמשים" },
                            { field: "can_remove", label: "הסרת חברי צוות" },
                            { field: "can_manage_chat", label: "ניהול צ'אט" },
                          ].map(({ field, label }) => (
                            <label key={field} className="permission-toggle-label">
                              <input
                                type="checkbox"
                                checked={!!mentor[field]}
                                onChange={() => handlePermissionToggle(mentor.applicationId, field, mentor[field])}
                                className="permission-checkbox"
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {isOwner && !mentor.isOwner && (
                        <div className="applicant-actions">
                          <button
                            className="btn-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveStudent(mentor.applicationId);
                            }}
                          >
                            הסר מהמחקר
                          </button>
                        </div>
                      )}
                    </ResearchApprenticeCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Research Chat Section --- */}
        {(isOwner || joinedResearches.some((r) => String(r.id) === String(id))) && (
          <ResearchChat
            researchId={id}
            isOwner={isOwner}
            canManageChat={canManageChatThis}
            isMentor={isMentor}
            user={user}
          />
        )}

        {/* --- Pending Applicants Section (Mentor Only) --- */}
        {canApproveThis && (
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
                  className="research-apprentices-grid"
                  style={{ marginTop: 16 }}
                >
                  {activeApplicants.map((applicant) => (
                    <div key={applicant.applicationId || applicant.id} className="applicant-card-wrapper">
                      <ResearchApprenticeCard 
                        apprentice={applicant}
                        /* onClick handler removed: using profile button instead */
                      >
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
                      </ResearchApprenticeCard>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}


        {isOwner && (
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

        /* New Research Apprentices Grid - strict 3 column grid */
        .research-apprentices-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem; /* Reduced from 1.5rem */
          width: 100%;
          box-sizing: border-box; /* Safety */
        }
        
        /* Research Apprentice Card Styles (Local) */
        .research-apprentice-card {
          position: relative;
          box-sizing: border-box; /* CRITICAL fix for sizing */
          background: #ffffff;
          border-radius: 12px; /* Slightly tighter radius */
          padding: 0.75rem; /* Further reduced padding */
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* Softer shadow */
          border: 1px solid #e5e7eb;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          height: 100%;
          min-width: 0; 
        }

        .research-apprentice-card:hover {
          transform: translateY(-2px); /* Subtle lift */
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
          border-color: #6cd5bf;
        }

        .rac-avatar-container {
          width: 56px; /* Reduced from 64px */
          height: 56px; /* Reduced from 64px */
          border-radius: 50%;
          overflow: hidden;
          margin-bottom: 0.5rem;
          border: 2px solid #e8f5f2;
          background: #f8fafc;
          flex-shrink: 0;
        }

        .rac-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .rac-avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #e8f5f2 0%, #f0fdf9 100%);
          font-size: 1.5rem; /* Reduced icon size */
          color: #94a3b8;
        }

        .rac-mentor-tag {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #eef2ff;
          color: #4338ca;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 10px;
          border-radius: 12px;
          border: 1px solid #c7d2fe;
          z-index: 1;
        }

        .rac-name {
          margin: 0 0 0.5rem 0; /* Reduced margin */
          font-size: 0.95rem; /* Slightly reduced font */
          font-weight: 600;
          color: #2c2c6c;
          line-height: 1.2;
        }

        .rac-info {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.5rem; /* Reduced margin */
          flex-grow: 1; 
        }

        .rac-info-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0; /* Minimal gap */
        }

        .rac-label {
          font-size: 0.7rem; /* Tiny label */
          color: #6cd5bf;
          font-weight: 500;
        }

        .rac-value {
          font-size: 0.8rem;
          color: #4b5563;
          font-weight: 400;
          /* line-clamp for long text preservation? */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .rac-value-highlight {
          color: #2c2c6c;
          font-weight: 500;
        }

        .rac-profile-btn {
          margin-top: auto;
          padding: 0.4rem 1rem; /* Compact button */
          background: linear-gradient(135deg, #6cd5bf 0%, #5bc4ae 100%);
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 0.75rem; 
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          max-width: 140px; 
        }

        .rac-profile-btn:hover {
          background: linear-gradient(135deg, #5bc4ae 0%, #4ab39d 100%);
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(108, 213, 191, 0.3);
        }

        /* Responsive Breakpoints */
        @media (max-width: 1200px) {
          .research-apprentices-grid {
             gap: 1rem;
          }
        }

        /* Below 1024px switch to 2 columns */
        @media (max-width: 1024px) {
          .research-apprentices-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        /* Below 640px switch to 1 column */
        @media (max-width: 640px) {
          .research-apprentices-grid {
            grid-template-columns: 1fr;
          }
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

        /* Actions Container (Child Functionality) */
        .rac-actions-container {
          width: 100%;
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid #f3f4f6;
          box-sizing: border-box;
        }

        /* Applicant Card Wrapper - ensure it behaves like a flexible grid item */
        .applicant-card-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-width: 0; /* Important for grid/flex overflow prevents */
          width: 100%;
        }

        /* Action Buttons for Applicants */
        .applicant-actions {
          display: flex;
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
        }
        
        .applicant-actions button {
          flex: 1;
          padding: 10px 16px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        
        .btn-approve {
          background: #10b981;
          color: white;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
        }
        .btn-approve:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }
        
        .btn-decline {
          background: #ef4444;
          color: white;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
        }
        .btn-decline:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }

        .btn-remove {
          background: #1f2937;
          color: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }
        .btn-remove:hover {
          background: #111827;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        /* Mentor Permission Toggles */
        .mentor-permissions-toggles {
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.5rem 0;
          border-top: 1px solid #f3f4f6;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .permissions-title {
          font-size: 0.7rem;
          font-weight: 600;
          color: #4338ca;
          margin-bottom: 2px;
        }

        .permission-toggle-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: #4b5563;
          cursor: pointer;
          padding: 2px 0;
        }

        .permission-toggle-label:hover {
          color: #2c2c6c;
        }

        .permission-checkbox {
          width: 14px;
          height: 14px;
          accent-color: #6cd5bf;
          cursor: pointer;
          flex-shrink: 0;
        }

        /* Mobile Responsive Adjustments */
        @media (max-width: 768px) {
          .research-layout { 
            gap: 20px;
          }
          
          /* Full Width Action Bar Items */
          .action-bar {
            flex-direction: column !important;
            gap: 16px !important;
            align-items: stretch !important;
            flex-wrap: nowrap !important;
          }
          
          /* Force immediate children to be full width/centered */
          .action-bar > div {
            width: 100% !important;
            justify-content: center !important;
            flex-wrap: wrap !important;
          }
          
          /* Status Group Centering */
          .status-group {
            width: 100% !important;
            justify-content: center !important;
            margin-bottom: 4px;
          }

          /* Research Selector Full Width */
          .researchSelectWrap {
            width: 100% !important;
            max-width: 100% !important;
            flex: 1 1 auto;
          }
          .researchSelect {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }
          
          /* Container for Dropdown and Toggle: Force Stack */
          .action-bar-controls {
             width: 100% !important;
             display: flex !important;
             flex-direction: column !important;
             align-items: stretch !important;
             gap: 12px !important;
             justify-content: center !important;
          }
          
          .action-bar button {
            width: 100% !important;
            justify-content: center !important;
            margin: 0 !important;
          }

          /* Reduce Paddings */
          .main-card {
            padding: 16px !important; /* Reduced from 32px */
          }
          
          .research-apprentices-grid {
             gap: 12px;
          }
        }

        /* Tablet: action bar wraps more aggressively */
        @media (max-width: 1024px) {
          .rd-action-bar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .rd-action-bar > div {
            width: 100% !important;
            justify-content: center !important;
            flex-wrap: wrap !important;
          }
          .action-bar-controls {
            flex-wrap: wrap !important;
          }
        }

        /* Small mobile: accordion padding, file card, owner ticket */
        @media (max-width: 640px) {
          .accordion-header {
            padding: 12px 16px;
          }
        }

        @media (max-width: 480px) {
          .rd-file-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .rd-owner-ticket {
            gap: 6px !important;
            padding: 6px 8px !important;
          }
        }
      `}</style>
    </div>
  );
}

// --- Sub Components ---

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <h3 className="rd-section-title" style={styles.sectionTitle}>{title}</h3>
    {children}
  </div>
);

const DetailItem = ({ label, value }) => (
  <div>
    <div className="rd-label" style={styles.label}>{label}</div>
    <div className="rd-value" style={styles.value}>{value}</div>
  </div>
);

const SidebarItem = ({ label, value }) => (
  <div style={styles.sidebarItem}>
    <div className="rd-sidebar-label" style={styles.sidebarLabel}>{label}</div>
    <div className="rd-sidebar-value" style={styles.sidebarValue}>{value}</div>
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
    flexWrap: "wrap",
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
