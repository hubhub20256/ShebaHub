import React, { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaExclamationCircle,
  FaPaperclip,
  FaPlus,
  FaUserTag,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import usePageTitle from "../hooks/usePageTitle";
import { researchAPI } from "../services/api";
import {
  buildMockSeedTasks,
  getResearchBoardStorageKey,
} from "../services/mockTaskManager";
import "../styles/TaskManagement.css";

const PRIORITY_OPTIONS = [
  { value: "low", label: "נמוכה" },
  { value: "medium", label: "בינונית" },
  { value: "high", label: "גבוהה" },
];

const STATUS_OPTIONS = {
  open: "לביצוע",
  completed: "הושלמה",
  needs_help: "צריך עזרה",
};

function formatDate(date) {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("he-IL");
  } catch {
    return date;
  }
}

function getCurrentUserLabel(user) {
  if (!user) return "משתמש/ת";
  const full = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (full) return full;
  return user.username || user.email || "משתמש/ת";
}

function createTask({
  title,
  assignmentType,
  assigneeName,
  priority,
  dueDate,
  description,
  createdBy,
}) {
  return {
    id: String(Date.now() + Math.floor(Math.random() * 1000)),
    title,
    assignmentType,
    assigneeName,
    priority,
    dueDate,
    description,
    createdBy,
    status: "open",
    thread: [],
    files: [],
    createdAt: new Date().toISOString(),
  };
}

export default function TaskManagement() {
  usePageTitle("ניהול משימות");
  const { user } = useAuth();
  const currentUser = getCurrentUserLabel(user);
  const storageKey = useMemo(() => getResearchBoardStorageKey(user), [user]);

  const [researches, setResearches] = useState([]);
  const [researchesLoading, setResearchesLoading] = useState(false);
  const [researchesError, setResearchesError] = useState("");
  const [selectedResearchId, setSelectedResearchId] = useState("");
  const [boardsByResearch, setBoardsByResearch] = useState({});

    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignment, setFilterAssignment] = useState("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    const [form, setForm] = useState({
    title: "",
    assignmentType: "manager_to_apprentice",
    assigneeName: "",
    priority: "medium",
    dueDate: "",
    description: "",
  });

  const [threadDrafts, setThreadDrafts] = useState({});
  const [expandedTaskIds, setExpandedTaskIds] = useState({});

  useEffect(() => {
    let cancelled = false;

    const normalizeJoinedResearch = (research) => ({
      id: research.id,
      title: research.researchName || research.title || `מחקר #${research.id}`,
      role: "מתלמד/ת",
      mentor: Array.isArray(research.mentors)
        ? research.mentors.join(", ")
        : research.mentors || "-",
      institution: research.institution || research.institutionName || "-",
    });

    const normalizeMentorResearch = (research) => ({
      id: research.id,
      title: research.researchName || research.title || `מחקר #${research.id}`,
      role: "מנחה/ת",
      mentor: currentUser,
      institution: research.institution || research.institutionName || "-",
    });

    const loadResearchMemberships = async () => {
      setResearchesLoading(true);
      setResearchesError("");

      try {
        const [joined, myResearches] = await Promise.all([
          researchAPI.listJoinedResearches().catch(() => []),
          researchAPI.listMyResearches().catch(() => []),
        ]);

        const mergedById = new Map();

        (Array.isArray(joined) ? joined : []).forEach((research) => {
          const normalized = normalizeJoinedResearch(research);
          mergedById.set(normalized.id, normalized);
        });

        (Array.isArray(myResearches) ? myResearches : []).forEach(
          (research) => {
            const normalized = normalizeMentorResearch(research);
            const existing = mergedById.get(normalized.id);
            if (existing) {
              mergedById.set(normalized.id, {
                ...existing,
                role: "מנחה/ת ומתלמד/ת",
                mentor:
                  existing.mentor && existing.mentor !== "-"
                    ? existing.mentor
                    : normalized.mentor,
                institution:
                  existing.institution && existing.institution !== "-"
                    ? existing.institution
                    : normalized.institution,
              });
              return;
            }
            mergedById.set(normalized.id, normalized);
          },
        );

        const merged = Array.from(mergedById.values());
        if (cancelled) return;

        setResearches(merged);
        setSelectedResearchId((prev) => {
          if (
            prev &&
            merged.some((research) => String(research.id) === String(prev))
          ) {
            return prev;
          }
          return merged[0]?.id || "";
        });
      } catch (err) {
        if (cancelled) return;
        setResearches([]);
        setSelectedResearchId("");
        setResearchesError(err?.data?.detail || "שגיאה בטעינת מחקרים משויכים");
      } finally {
        if (!cancelled) setResearchesLoading(false);
      }
    };

    loadResearchMemberships();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setBoardsByResearch(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setBoardsByResearch({});
    }
  }, [storageKey]);

  useEffect(() => {
    if (!researches.length) return;
    setBoardsByResearch((prev) => {
      let changed = false;
      const next = { ...prev };
      researches.forEach((research) => {
        if (!Array.isArray(next[research.id])) {
          next[research.id] = buildMockSeedTasks(research, currentUser);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [researches, currentUser]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(boardsByResearch));
  }, [boardsByResearch, storageKey]);

  useEffect(() => {
    setThreadDrafts({});
  }, [selectedResearchId]);

  const activeResearch = useMemo(
    () =>
      researches.find((research) => research.id === selectedResearchId) || null,
    [researches, selectedResearchId],
  );

  const tasks = useMemo(() => {
    if (!selectedResearchId) return [];
    return Array.isArray(boardsByResearch[selectedResearchId])
      ? boardsByResearch[selectedResearchId]
      : [];
  }, [boardsByResearch, selectedResearchId]);

  useEffect(() => {
    setExpandedTaskIds((prev) => {
      let changed = false;
      const next = { ...prev };

      tasks.forEach((task) => {
        if (next[task.id] === undefined) {
          next[task.id] = false;
          changed = true;
        }
      });

      Object.keys(next).forEach((taskId) => {
        if (!tasks.some((task) => String(task.id) === String(taskId))) {
          delete next[taskId];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [tasks]);

  const updateActiveResearchTasks = (updater) => {
    if (!selectedResearchId) return;
    setBoardsByResearch((prev) => {
      const currentTasks = Array.isArray(prev[selectedResearchId])
        ? prev[selectedResearchId]
        : [];
      const nextTasks =
        typeof updater === "function" ? updater(currentTasks) : updater;
      return {
        ...prev,
        [selectedResearchId]: nextTasks,
      };
    });
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.priority || !form.dueDate) return;

    const isSelf = form.assignmentType === "self_assignment";
    const task = createTask({
      title: form.title.trim(),
      assignmentType: form.assignmentType,
      assigneeName: isSelf
        ? currentUser
        : form.assigneeName.trim() || "מתלמד/ת",
      priority: form.priority,
      dueDate: form.dueDate,
      description: form.description.trim(),
      createdBy: currentUser,
    });

    updateActiveResearchTasks((currentTasks) => [task, ...currentTasks]);
    setForm({
      title: "",
      assignmentType: "manager_to_apprentice",
      assigneeName: "",
      priority: "medium",
      dueDate: "",
      description: "",
    });
  };

  const setTaskStatus = (taskId, status) => {
    const next = tasks.map((task) =>
      task.id === taskId ? { ...task, status } : task,
    );
    updateActiveResearchTasks(next);
  };

  const addThreadReply = (taskId) => {
    const text = (threadDrafts[taskId] || "").trim();
    if (!text) return;

    const next = tasks.map((task) => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        thread: [
          ...(Array.isArray(task.thread) ? task.thread : []),
          {
            id: String(Date.now() + Math.floor(Math.random() * 100)),
            author: currentUser,
            text,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });
    updateActiveResearchTasks(next);
    setThreadDrafts((prev) => ({ ...prev, [taskId]: "" }));
  };

  const addFilesToTask = (taskId, fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).map((file) => ({
      id: String(Date.now() + Math.floor(Math.random() * 100)),
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser,
    }));

    const next = tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            files: [...(Array.isArray(task.files) ? task.files : []), ...files],
          }
        : task,
    );
    updateActiveResearchTasks(next);
  };

  const toggleTaskExpanded = (taskId) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: prev[taskId] !== false ? false : true,
    }));
  };

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const priorityMatch =
          filterPriority === "all" || task.priority === filterPriority;
        const assignmentMatch =
          filterAssignment === "all" ||
          task.assignmentType === filterAssignment;
        return priorityMatch && assignmentMatch;
      }),
    [tasks, filterPriority, filterAssignment],
  );

  const columns = useMemo(
    () => ({
      open: filteredTasks.filter((task) => task.status === "open"),
      completed: filteredTasks.filter((task) => task.status === "completed"),
      needs_help: filteredTasks.filter((task) => task.status === "needs_help"),
    }),
    [filteredTasks],
  );

  const stats = useMemo(
    () => ({
      total: tasks.length,
      completed: tasks.filter((task) => task.status === "completed").length,
      needsHelp: tasks.filter((task) => task.status === "needs_help").length,
    }),
    [tasks],
  );

  return (
    <div className="task-page" dir="rtl">
      <div className="task-bg-orb task-bg-orb-a" />
      <div className="task-bg-orb task-bg-orb-b" />

      <header className="task-hero">
        <div>
          <p className="task-hero-kicker">לוח משימות בסגנון Monday</p>
          <h1 className="task-hero-title">ניהול משימות מחקר</h1>
          <p className="task-hero-subtitle">
            הקצאת משימות למתלמדים, משימות עצמאיות, סימון סטטוס מהיר, ושרשור
            תגובות/קבצים לכל משימה.
          </p>
        </div>

        <div className="task-stat-grid" aria-label="סטטיסטיקת משימות">
          <article className="task-stat-card">
            <span>סה"כ משימות</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="task-stat-card">
            <span>הושלמו</span>
            <strong>{stats.completed}</strong>
          </article>
          <article className="task-stat-card danger">
            <span>זקוקות לעזרה</span>
            <strong>{stats.needsHelp}</strong>
          </article>
        </div>
      </header>

      <section
        className="task-research-switcher"
        aria-label="בחירת לוח לפי מחקר"
      >
        <div className="task-research-switcher-head">
          <h2>
            בחירת מחקר פעיל
            <span className="task-accordion-count">({researches.length})</span>
          </h2>
          <p>בחרו את המחקר שברצונכם לעבוד עליו כרגע.</p>
        </div>

        {researchesLoading && (
          <p className="task-research-helper">טוען מחקרים משויכים...</p>
        )}

        {!!researchesError && (
          <p className="task-research-helper task-research-helper-error">
            {researchesError}
          </p>
        )}

        {!researchesLoading && !researchesError && researches.length > 0 && (
          <>
            <div className="task-research-chip-row">
              {researches.map((research) => (
                <button
                  key={research.id}
                  type="button"
                  className={`task-research-chip ${String(research.id) === String(selectedResearchId) ? "active" : ""}`}
                  onClick={() => setSelectedResearchId(research.id)}
                >
                  {research.title}
                </button>
              ))}
            </div>

            {activeResearch && (
              <div className="task-research-meta">
                <span>
                  <strong>תפקיד:</strong> {activeResearch.role}
                </span>
                <span>
                  <strong>מנחה:</strong> {activeResearch.mentor}
                </span>
                <span>
                  <strong>מוסד:</strong> {activeResearch.institution}
                </span>
              </div>
            )}
          </>
        )}

        {!researchesLoading && !researchesError && researches.length === 0 && (
          <p className="task-research-helper">
            אין מחקרים משויכים לחשבון כרגע.
          </p>
        )}
      </section>

      {!activeResearch && (
        <section className="task-creator-card" aria-label="אין מחקרים">
          <h2>אין מחקרים להצגה</h2>
          <p>בחר מחקר פעיל כדי לראות ולנהל לוח משימות ייעודי לאותו מחקר.</p>
        </section>
      )}

      {activeResearch && (
        <section className="task-creator-card" aria-label="יצירת משימה חדשה">
          <button
            type="button"
            className="task-accordion-header"
            onClick={() => setIsCreateTaskOpen((prev) => !prev)}
            aria-expanded={isCreateTaskOpen}
          >
            <div className="task-accordion-title-wrap">
              <h2>יצירת משימה חדשה</h2>
              <p>המשימה תתווסף ללוח של המחקר הנבחר בלבד.</p>
            </div>

            <FaChevronDown
              className={`task-accordion-icon ${isCreateTaskOpen ? "open" : ""}`}
            />
          </button>

          <div
            className={`task-accordion-body ${isCreateTaskOpen ? "open" : ""}`}
          >
            <form className="task-form" onSubmit={handleCreateTask}>
              <label>
                כותרת משימה
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="למשל: סקירת מאמרים בתחום AI ברפואה"
                  required
                />
              </label>

              <label>
                אופן הקצאה
                <select
                  value={form.assignmentType}
                  onChange={(e) => updateForm("assignmentType", e.target.value)}
                >
                  <option value="manager_to_apprentice">
                    הקצאה ממנהל/ת למתלמד/ת
                  </option>
                  <option value="self_assignment">הקצאה עצמית למתלמד/ת</option>
                </select>
              </label>

              {form.assignmentType === "manager_to_apprentice" && (
                <label>
                  שם המתלמד/ת
                  <input
                    type="text"
                    value={form.assigneeName}
                    onChange={(e) => updateForm("assigneeName", e.target.value)}
                    placeholder="שם מלא"
                  />
                </label>
              )}

              <label>
                רמת דחיפות
                <select
                  value={form.priority}
                  onChange={(e) => updateForm("priority", e.target.value)}
                  required
                >
                  {PRIORITY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                תאריך יעד
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => updateForm("dueDate", e.target.value)}
                  required
                />
              </label>

              <label className="task-form-wide">
                תיאור מפורט (אופציונלי)
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="פירוט חומרים, הנחיות, ציפיות לתוצר..."
                />
              </label>

              <button type="submit" className="task-primary-btn">
                <FaPlus />
                הוספת משימה
              </button>
            </form>
          </div>
        </section>
      )}

      {activeResearch && (
        <section className="task-filter-panel" aria-label="סינון משימות">
          <button
            type="button"
            className="task-accordion-header"
            onClick={() => setIsFiltersOpen((prev) => !prev)}
            aria-expanded={isFiltersOpen}
          >
            <div className="task-accordion-title-wrap">
              <h2>סינון משימות</h2>
              <p>בחרו איך למקד את התצוגה בלוח הפעיל.</p>
            </div>
            <FaChevronDown
              className={`task-accordion-icon ${isFiltersOpen ? "open" : ""}`}
            />
          </button>

          <div className={`task-accordion-body ${isFiltersOpen ? "open" : ""}`}>
            <div className="task-filter-row">
              <label>
                סינון לפי דחיפות
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <option value="all">הכל</option>
                  {PRIORITY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                סינון לפי סוג הקצאה
                <select
                  value={filterAssignment}
                  onChange={(e) => setFilterAssignment(e.target.value)}
                >
                  <option value="all">הכל</option>
                  <option value="manager_to_apprentice">מנהל/ת למתלמד/ת</option>
                  <option value="self_assignment">הקצאה עצמית</option>
                </select>
              </label>
            </div>

            <section className="task-board" aria-label="לוח משימות">
              {Object.entries(columns).map(([statusKey, items]) => (
                <article key={statusKey} className="task-column">
                  <header className="task-column-head">
                    <h3>{STATUS_OPTIONS[statusKey]}</h3>
                    <span>{items.length}</span>
                  </header>

                  <div className="task-column-body">
                    {items.length === 0 && (
                      <div className="task-empty">אין משימות בסטטוס זה</div>
                    )}

                    {items.map((task) => (
                      <div
                        className={`task-card priority-${task.priority}`}
                        key={task.id}
                      >
                        <div className="task-card-head">
                          <div className="task-card-head-main">
                            <h4>{task.title}</h4>
                            <span className="task-priority-chip">
                              {
                                PRIORITY_OPTIONS.find(
                                  (p) => p.value === task.priority,
                                )?.label
                              }
                            </span>
                          </div>

                          <button
                            type="button"
                            className="task-card-toggle"
                            onClick={() => toggleTaskExpanded(task.id)}
                            aria-expanded={expandedTaskIds[task.id] !== false}
                          >
                            <FaChevronDown
                              className={`task-card-toggle-icon ${expandedTaskIds[task.id] !== false ? "open" : ""}`}
                            />
                          </button>
                        </div>

                        <div className="task-card-meta">
                          <span>
                            <FaUserTag /> {task.assigneeName}
                          </span>
                          <span>
                            <FaCalendarAlt /> {formatDate(task.dueDate)}
                          </span>
                          <span>
                            {task.assignmentType === "self_assignment"
                              ? "הקצאה עצמית"
                              : 'הוקצה ע"י מנהל/ת'}
                          </span>
                        </div>

                        <div
                          className={`task-card-body ${expandedTaskIds[task.id] !== false ? "open" : ""}`}
                        >
                          {task.description && (
                            <p className="task-description">
                              {task.description}
                            </p>
                          )}

                          <div className="task-actions">
                            <button
                              type="button"
                              onClick={() =>
                                setTaskStatus(task.id, "completed")
                              }
                            >
                              <FaCheckCircle />
                              הושלמה
                            </button>
                            <button
                              type="button"
                              className="warning"
                              onClick={() =>
                                setTaskStatus(task.id, "needs_help")
                              }
                            >
                              <FaExclamationCircle />
                              צריך עזרה
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => setTaskStatus(task.id, "open")}
                            >
                              חזרה לביצוע
                            </button>
                          </div>

                          <section
                            className="task-thread"
                            aria-label="שרשור משימה"
                          >
                            <h5>שרשור תגובות וקבצים</h5>

                            <div className="task-thread-list">
                              {Array.isArray(task.thread) &&
                              task.thread.length > 0 ? (
                                task.thread.map((entry) => (
                                  <div
                                    key={entry.id}
                                    className="task-thread-item"
                                  >
                                    <strong>{entry.author}</strong>
                                    <small>{formatDate(entry.createdAt)}</small>
                                    <p>{entry.text}</p>
                                  </div>
                                ))
                              ) : (
                                <div className="task-empty-thread">
                                  אין תגובות עדיין
                                </div>
                              )}
                            </div>

                            <div className="task-thread-composer">
                              <textarea
                                rows={2}
                                placeholder="כתיבת תגובה..."
                                value={threadDrafts[task.id] || ""}
                                onChange={(e) =>
                                  setThreadDrafts((prev) => ({
                                    ...prev,
                                    [task.id]: e.target.value,
                                  }))
                                }
                              />
                              <button
                                type="button"
                                onClick={() => addThreadReply(task.id)}
                              >
                                שליחת תגובה
                              </button>
                            </div>

                            <label className="task-file-upload">
                              <FaPaperclip />
                              הוספת קבצים למשימה
                              <input
                                type="file"
                                multiple
                                onChange={(e) => {
                                  addFilesToTask(task.id, e.target.files);
                                  e.target.value = "";
                                }}
                              />
                            </label>

                            {Array.isArray(task.files) &&
                              task.files.length > 0 && (
                                <ul
                                  className="task-file-list"
                                  aria-label="קבצים שצורפו"
                                >
                                  {task.files.map((file) => (
                                    <li key={file.id}>
                                      <span>{file.name}</span>
                                      <small>
                                        {Math.max(
                                          1,
                                          Math.round(file.size / 1024),
                                        )}
                                        KB
                                      </small>
                                    </li>
                                  ))}
                                </ul>
                              )}
                          </section>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          </div>
        </section>
      )}
    </div>
  );
}
