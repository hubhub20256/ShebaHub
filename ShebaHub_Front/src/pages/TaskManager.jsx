import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import useMediaQuery from "../hooks/useMediaQuery";
import { researchAPI } from "../services/api";
import * as tasksAPI from "../services/tasksAPI";
import ConfirmDialog from "../components/ConfirmDialog";
import CalendarDatePicker from "../components/forms/CalendarDatePicker";
import "../styles/TaskManager.css";
import {
  FaCommentAlt,
  FaTimes,
  FaExpandArrowsAlt,
  FaPaperclip,
  FaFileAlt,
  FaDownload,
  FaEdit,
  FaTrash,
} from "react-icons/fa";

/**
 * Task manager board for research-scoped and global task workflows.
 *
 * The page coordinates task fetching, optimistic inline updates, task
 * creation and editing, attachment handling, and comment management. When the
 * route includes a research identifier, the board is scoped to that research
 * and the same data model is reused for the modal and chat surfaces.
 */

// Shared labels, option sets, and normalization helpers keep the board logic
// consistent across list rows, modal forms, and API payloads.

const STATUS_LABELS = {
  todo: "לביצוע",
  in_progress: "בביצוע",
  needs_help: "מחכה לעזרה",
  completed: "הושלמה",
};

const URGENCY_LABELS = {
  high: "גדולה",
  medium: "בינונית",
  low: "קטנה",
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "סנן לפי סטטוס" },
  { value: "todo", label: STATUS_LABELS.todo },
  { value: "in_progress", label: STATUS_LABELS.in_progress },
  { value: "needs_help", label: STATUS_LABELS.needs_help },
  { value: "completed", label: STATUS_LABELS.completed },
];

const URGENCY_FILTER_OPTIONS = [
  { value: "all", label: "מיין לפי דחיפות" },
  { value: "high", label: URGENCY_LABELS.high },
  { value: "medium", label: URGENCY_LABELS.medium },
  { value: "low", label: URGENCY_LABELS.low },
];

const STATUS_VALUE_OPTIONS = STATUS_FILTER_OPTIONS.filter(
  (opt) => opt.value !== "all",
);

const URGENCY_VALUE_OPTIONS = URGENCY_FILTER_OPTIONS.filter(
  (opt) => opt.value !== "all",
);

/**
 * Normalizes mixed identifier types so board state can compare ids reliably.
 */
const toComparableId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

/**
 * Derives initials for avatar fallbacks when a profile image is unavailable.
 */
const getInitials = (name) => {
  const safeName = String(name || "").trim();
  if (!safeName) return "?";

  const parts = safeName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return (parts[0].slice(0, 2) || "?").toUpperCase();
};

/**
 * Resolves the most likely avatar URL from the data shapes used by the API.
 */
const resolveAvatar = (source) => {
  if (!source) return "";
  if (typeof source === "string") return source;

  if (typeof source === "object") {
    return (
      source.avatar ||
      source.avatarUrl ||
      source.profile_picture ||
      source.profilePicture ||
      source.sender_avatar_url ||
      source.image ||
      ""
    );
  }

  return "";
};

const getUrgencyOptionClass = (value) => `tm-option-urgency-${value}`;
const getStatusOptionClass = (value) => `tm-option-status-${value}`;

/**
 * Renders an avatar image with an initials fallback when loading fails.
 */
const AvatarCircle = ({ src, name, className }) => {
  const [failed, setFailed] = useState(false);
  const normalizedSrc = typeof src === "string" ? src.trim() : "";

  if (!normalizedSrc || failed) {
    return (
      <div className={`${className} avatar-fallback`} aria-hidden="true">
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={name || "Avatar"}
      className={className}
      onError={() => setFailed(true)}
    />
  );
};

/**
 * Formats task dates for display in the board and detail surfaces.
 */
const formatTaskDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-GB");
};

/**
 * Extracts the first validation message for a group of possible field keys.
 */
const firstValidationMessage = (details, keys = []) => {
  if (!details || typeof details !== "object") return "";

  for (const key of keys) {
    const value = details[key];
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }
    if (typeof value === "string") {
      return value;
    }
  }

  return "";
};

/**
 * Converts API error payloads into a user-facing message with a safe fallback.
 */
const getErrorMessage = (error, fallback) => {
  if (error?.data?.code === "VALIDATION_ERROR") {
    const details = error?.data?.details;
    if (details && typeof details === "object") {
      for (const value of Object.values(details)) {
        if (Array.isArray(value) && value.length > 0) {
          return String(value[0]);
        }
        if (typeof value === "string") {
          return value;
        }
      }
    }
    return error?.data?.message || fallback;
  }

  return error?.data?.detail || error?.data?.message || fallback;
};

/**
 * Lightweight dropdown used by the task board and modal forms.
 */
const TaskManagerDropdown = ({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  className = "",
  compact = false,
  getOptionClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  const selected = options.find((option) => option.value === value);

  return (
    <div
      className={`tm-dropdown ${compact ? "is-compact" : ""} ${isOpen ? "is-open" : ""}`}
      ref={dropdownRef}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={`tm-dropdown-trigger ${className} ${isOpen ? "is-open" : ""}`}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <span>{selected?.label || placeholder || "בחר"}</span>
      </button>

      {isOpen && !disabled ? (
        <div className="tm-dropdown-menu" role="listbox">
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`tm-dropdown-option ${value === option.value ? "is-selected" : ""} ${getOptionClassName ? getOptionClassName(option.value) : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

// Page state, derived collections, and action handlers live in a single scope
// because the board, chat panel, and modals all coordinate through the same task
// identifiers.

/**
 * Renders the task board, applies filters, and orchestrates all task actions.
 */
const TaskManager = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Board state and UI state are kept together so filters, selection, and
  // overlays stay in sync as tasks are created, updated, or removed.
  const [tasks, setTasks] = useState([]);
  const [memberResearches, setMemberResearches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [researchFilter, setResearchFilter] = useState("all");

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [chatTaskId, setChatTaskId] = useState(null);
  const [detailsTaskId, setDetailsTaskId] = useState(null);
  const [editTaskId, setEditTaskId] = useState(null);
  const [quickUpdateMap, setQuickUpdateMap] = useState({});
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [taskDeleteConfirm, setTaskDeleteConfirm] = useState({
    isOpen: false,
    task: null,
  });

  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [addTaskError, setAddTaskError] = useState("");
  const [addTaskFieldErrors, setAddTaskFieldErrors] = useState({});
  const [addTaskFiles, setAddTaskFiles] = useState([]);
  const [addTaskSubmitting, setAddTaskSubmitting] = useState(false);
  const [addTaskForm, setAddTaskForm] = useState({
    title: "",
    description: "",
    urgency: "medium",
    status: "todo",
    dueDate: "",
    researchId: "",
  });

  // Scope the board to a research id when the route carries that context.
  const scopedResearchId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return toComparableId(
      searchParams.get("research_id") || searchParams.get("researchId") || "",
    );
  }, [location.search]);

  const isScopedBoard = Boolean(scopedResearchId);

  // Load the user-visible research list once so filters and modal defaults can
  // stay aligned with the user’s memberships and owned researches.
  useEffect(() => {
    let cancelled = false;

    const loadMemberResearches = async () => {
      try {
        const [joinedResult, ownedResult] = await Promise.allSettled([
          researchAPI.listJoinedResearches(),
          researchAPI.listMyResearches(),
        ]);

        const map = new Map();

        const collect = (items) => {
          if (!Array.isArray(items)) return;

          items.forEach((item) => {
            const id = toComparableId(item?.id || item?.researchId);
            if (!id) return;

            if (!map.has(id)) {
              map.set(id, {
                value: id,
                label: item?.researchName || `מחקר ${id}`,
              });
            }
          });
        };

        if (joinedResult.status === "fulfilled") {
          collect(joinedResult.value);
        }

        if (ownedResult.status === "fulfilled") {
          collect(ownedResult.value);
        }

        if (cancelled) return;

        const nextResearches = Array.from(map.values()).sort((a, b) =>
          String(a.label).localeCompare(String(b.label), "he"),
        );

        setMemberResearches(nextResearches);
      } catch (error) {
        console.error("Failed to load member researches", error);
      }
    };

    loadMemberResearches();

    return () => {
      cancelled = true;
    };
  }, []);

  // Build the derived research options from memberships plus any research ids
  // already present on loaded tasks.
  const researchOptions = useMemo(() => {
    const map = new Map();

    memberResearches.forEach((research) => {
      const id = toComparableId(research.value);
      if (!id) return;

      map.set(id, {
        value: id,
        label: research.label || `מחקר ${id}`,
      });
    });

    tasks.forEach((task) => {
      const id = toComparableId(task.researchId);
      if (!id) return;

      const existing = map.get(id);
      const nextLabel = task.researchName || existing?.label || `מחקר ${id}`;

      if (!existing || existing.label.startsWith("מחקר ")) {
        map.set(id, {
          value: id,
          label: nextLabel,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.label).localeCompare(String(b.label), "he"),
    );
  }, [tasks, memberResearches]);

  const scopedFallbackOption = useMemo(() => {
    if (!isScopedBoard) return [];

    const existing = researchOptions.find(
      (opt) => opt.value === scopedResearchId,
    );
    if (existing) return [existing];

    return [{ value: scopedResearchId, label: `מחקר ${scopedResearchId}` }];
  }, [isScopedBoard, researchOptions, scopedResearchId]);

  const researchFilterOptions = useMemo(() => {
    if (isScopedBoard) {
      return scopedFallbackOption;
    }

    return [{ value: "all", label: "כל המחקרים" }, ...researchOptions];
  }, [isScopedBoard, scopedFallbackOption, researchOptions]);

  const createResearchOptions = useMemo(() => {
    if (isScopedBoard) {
      return scopedFallbackOption;
    }

    return researchOptions;
  }, [isScopedBoard, scopedFallbackOption, researchOptions]);

  useEffect(() => {
    if (isScopedBoard) {
      setResearchFilter(scopedResearchId);
    }
  }, [isScopedBoard, scopedResearchId]);

  useEffect(() => {
    if (isScopedBoard) return;
    if (researchFilter === "all") return;

    const isExisting = researchOptions.some(
      (opt) => opt.value === researchFilter,
    );
    if (!isExisting) {
      setResearchFilter("all");
    }
  }, [isScopedBoard, researchFilter, researchOptions]);

  // Fetch the task board for the active scope/filter combination.
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};

      if (isScopedBoard) {
        params.research_id = scopedResearchId;
      } else if (researchFilter !== "all") {
        params.research_id = researchFilter;
      }

      const fetchedTasks = await tasksAPI.listTasks(params);
      setTasks(fetchedTasks);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
      toast.error(getErrorMessage(error, "טעינת המשימות נכשלה."));
    } finally {
      setLoading(false);
    }
  }, [isScopedBoard, scopedResearchId, researchFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // If the active task disappears from the current task list, close any
  // overlays that still point to it so the UI never references stale ids.
  useEffect(() => {
    if (
      selectedTaskId &&
      !tasks.some(
        (task) => toComparableId(task.id) === toComparableId(selectedTaskId),
      )
    ) {
      setSelectedTaskId(null);
    }

    if (
      chatTaskId &&
      !tasks.some(
        (task) => toComparableId(task.id) === toComparableId(chatTaskId),
      )
    ) {
      setChatTaskId(null);
    }

    if (
      detailsTaskId &&
      !tasks.some(
        (task) => toComparableId(task.id) === toComparableId(detailsTaskId),
      )
    ) {
      setDetailsTaskId(null);
    }

    if (
      editTaskId &&
      !tasks.some(
        (task) => toComparableId(task.id) === toComparableId(editTaskId),
      )
    ) {
      setEditTaskId(null);
    }
  }, [tasks, selectedTaskId, chatTaskId, detailsTaskId, editTaskId]);

  const selectedTask = useMemo(
    () =>
      tasks.find(
        (task) => toComparableId(task.id) === toComparableId(chatTaskId),
      ) || null,
    [tasks, chatTaskId],
  );

  const detailsTask = useMemo(
    () =>
      tasks.find(
        (task) => toComparableId(task.id) === toComparableId(detailsTaskId),
      ) || null,
    [tasks, detailsTaskId],
  );

  const editTask = useMemo(
    () =>
      tasks.find(
        (task) => toComparableId(task.id) === toComparableId(editTaskId),
      ) || null,
    [tasks, editTaskId],
  );

  // Apply the visible filters without mutating the underlying task order.
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!isScopedBoard && researchFilter !== "all") {
        if (
          toComparableId(task.researchId) !== toComparableId(researchFilter)
        ) {
          return false;
        }
      }

      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      if (urgencyFilter !== "all" && task.urgency !== urgencyFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, isScopedBoard, researchFilter, statusFilter, urgencyFilter]);

  const upsertTaskInBoard = useCallback((task) => {
    setTasks((prev) => {
      const next = [...prev];
      const index = next.findIndex(
        (item) => toComparableId(item.id) === toComparableId(task.id),
      );

      if (index === -1) {
        return [task, ...next];
      }

      next[index] = task;
      return next;
    });
  }, []);

  const removeTaskFromBoard = useCallback((taskId) => {
    const targetId = toComparableId(taskId);

    setTasks((prev) =>
      prev.filter((task) => toComparableId(task.id) !== targetId),
    );

    setSelectedTaskId((prev) =>
      toComparableId(prev) === targetId ? null : prev,
    );
    setChatTaskId((prev) => (toComparableId(prev) === targetId ? null : prev));
    setDetailsTaskId((prev) =>
      toComparableId(prev) === targetId ? null : prev,
    );
  }, []);

  const handleTaskInaccessible = useCallback(
    async (taskId) => {
      removeTaskFromBoard(taskId);
      await fetchTasks();
    },
    [removeTaskFromBoard, fetchTasks],
  );

  const handleCommentCountDelta = useCallback((taskId, delta) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (toComparableId(task.id) !== toComparableId(taskId)) {
          return task;
        }

        const currentCount = Number(task.commentsCount || 0);
        return {
          ...task,
          commentsCount: Math.max(0, currentCount + delta),
        };
      }),
    );
  }, []);

  const setQuickUpdateState = useCallback((taskId, field, nextState) => {
    const key = `${toComparableId(taskId)}:${field}`;
    setQuickUpdateMap((prev) => ({ ...prev, [key]: nextState }));
  }, []);

  const isQuickUpdating = useCallback(
    (taskId, field) => {
      const key = `${toComparableId(taskId)}:${field}`;
      return Boolean(quickUpdateMap[key]);
    },
    [quickUpdateMap],
  );

  // Optimistic update helpers keep row-level interactions responsive while the
  // network call completes, and roll back when the request fails.
  const handleQuickTaskFieldChange = useCallback(
    async (task, field, value) => {
      if (!task || task[field] === value) return;

      const originalTask = task;
      setQuickUpdateState(task.id, field, true);

      setTasks((prev) =>
        prev.map((row) =>
          toComparableId(row.id) === toComparableId(task.id)
            ? { ...row, [field]: value }
            : row,
        ),
      );

      try {
        const updated = await tasksAPI.updateTask(task.id, { [field]: value });
        upsertTaskInBoard(updated);
      } catch (error) {
        setTasks((prev) =>
          prev.map((row) =>
            toComparableId(row.id) === toComparableId(task.id)
              ? originalTask
              : row,
          ),
        );

        if (error?.status === 404) {
          toast.error("המשימה אינה זמינה יותר.");
          await handleTaskInaccessible(task.id);
          return;
        }

        const message =
          error?.status === 403
            ? "אין הרשאה לעדכן שדה זה במשימה."
            : getErrorMessage(error, "עדכון מהיר נכשל.");
        toast.error(message);
      } finally {
        setQuickUpdateState(task.id, field, false);
      }
    },
    [handleTaskInaccessible, setQuickUpdateState, upsertTaskInBoard],
  );

  // Modal and destructive action handlers are centralized so the row actions,
  // detail modal, and delete confirmation share one state model.
  const handleDeleteTaskFromRow = useCallback((task) => {
    if (!task) return;

    setTaskDeleteConfirm({
      isOpen: true,
      task,
    });
  }, []);

  const closeTaskDeleteConfirm = useCallback(() => {
    if (deletingTaskId) return;

    setTaskDeleteConfirm({
      isOpen: false,
      task: null,
    });
  }, [deletingTaskId]);

  const handleConfirmTaskDelete = useCallback(async () => {
    const task = taskDeleteConfirm.task;
    if (!task || deletingTaskId) return;

    setDeletingTaskId(task.id);

    try {
      await tasksAPI.deleteTask(task.id);
      removeTaskFromBoard(task.id);
      toast.success("המשימה נמחקה.");
    } catch (error) {
      if (error?.status === 404) {
        toast.error("המשימה אינה זמינה יותר.");
        await handleTaskInaccessible(task.id);
        return;
      }

      const message =
        error?.status === 403
          ? "אין הרשאה למחוק את המשימה."
          : getErrorMessage(error, "מחיקת המשימה נכשלה.");
      toast.error(message);
    } finally {
      setDeletingTaskId(null);
      setTaskDeleteConfirm({
        isOpen: false,
        task: null,
      });
    }
  }, [
    deletingTaskId,
    handleTaskInaccessible,
    removeTaskFromBoard,
    taskDeleteConfirm.task,
  ]);

  const openTaskChat = (task) => {
    setSelectedTaskId(task.id);
    setChatTaskId(task.id);
  };

  const selectTaskRow = (taskId) => {
    setSelectedTaskId(taskId);
  };

  const getDefaultResearchId = () => {
    if (isScopedBoard) {
      return scopedResearchId;
    }

    if (researchFilter !== "all") {
      return researchFilter;
    }

    if (createResearchOptions.length > 0) {
      return createResearchOptions[0].value;
    }

    return "";
  };

  const openAddTaskModal = () => {
    setAddTaskError("");
    setAddTaskFieldErrors({});
    setAddTaskFiles([]);
    setAddTaskForm({
      title: "",
      description: "",
      urgency: urgencyFilter !== "all" ? urgencyFilter : "medium",
      status: statusFilter !== "all" ? statusFilter : "todo",
      dueDate: "",
      researchId: getDefaultResearchId(),
    });
    setIsAddTaskModalOpen(true);
  };

  const closeAddTaskModal = () => {
    if (addTaskSubmitting) return;
    setIsAddTaskModalOpen(false);
    setAddTaskError("");
    setAddTaskFieldErrors({});
    setAddTaskFiles([]);
  };

  const handleAddTaskFieldChange = (field, value) => {
    setAddTaskForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTaskFilesChange = (e) => {
    const incomingFiles = Array.from(e.target.files || []);
    if (incomingFiles.length === 0) {
      return;
    }

    setAddTaskFiles((prev) => [...prev, ...incomingFiles]);
    e.target.value = "";
  };

  const handleRemoveAddTaskFile = (targetIndex) => {
    setAddTaskFiles((prev) => prev.filter((_, index) => index !== targetIndex));
  };

  const handleAddTaskSubmit = async (e) => {
    e.preventDefault();

    const normalizedTitle = addTaskForm.title.trim();
    const normalizedDescription = addTaskForm.description.trim();

    if (!normalizedTitle) {
      setAddTaskError("יש להזין כותרת למשימה.");
      return;
    }

    if (!addTaskForm.researchId) {
      setAddTaskError("יש לבחור מחקר.");
      return;
    }

    const payload = {
      research_id: addTaskForm.researchId,
      title: normalizedTitle,
      description: normalizedDescription,
      urgency: addTaskForm.urgency,
      status: addTaskForm.status,
    };

    if (addTaskForm.dueDate) {
      payload.dueDate = addTaskForm.dueDate;
    }

    setAddTaskSubmitting(true);
    setAddTaskError("");
    setAddTaskFieldErrors({});

    try {
      const created = await tasksAPI.createTask(payload, addTaskFiles);
      setTasks((prev) => {
        const rest = prev.filter(
          (task) => toComparableId(task.id) !== toComparableId(created.id),
        );
        return [created, ...rest];
      });
      setSelectedTaskId(created.id);
      setIsAddTaskModalOpen(false);
      setAddTaskFiles([]);
      toast.success("המשימה נוצרה בהצלחה.");
    } catch (error) {
      const details =
        error?.data?.code === "VALIDATION_ERROR"
          ? error?.data?.details || {}
          : {};
      setAddTaskFieldErrors(details);

      const message =
        error?.status === 403
          ? "אין הרשאה ליצור משימה במחקר זה."
          : getErrorMessage(error, "יצירת המשימה נכשלה.");

      setAddTaskError(message);

      if (error?.data?.code !== "VALIDATION_ERROR") {
        toast.error(message);
      }
    } finally {
      setAddTaskSubmitting(false);
    }
  };

  return (
    <div className="task-manager-container">
      <div className="task-manager-header">
        <h1>ברוכים הבאים ללוח ניהול המשימות שלך</h1>
        <button className="add-task-btn" onClick={openAddTaskModal}>
          הוסף משימה חדשה
        </button>
      </div>

      <div className="task-filters">
        <TaskManagerDropdown
          value={researchFilter}
          onChange={setResearchFilter}
          options={researchFilterOptions}
          placeholder="כל המחקרים"
          disabled={isScopedBoard}
          className="filter-select"
        />

        <TaskManagerDropdown
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_FILTER_OPTIONS}
          placeholder="סנן לפי סטטוס"
          className="filter-select"
        />

        <TaskManagerDropdown
          value={urgencyFilter}
          onChange={setUrgencyFilter}
          options={URGENCY_FILTER_OPTIONS}
          placeholder="מיין לפי דחיפות"
          className="filter-select"
        />
      </div>

      <div className="task-board-content">
        <div className="task-list">
          <div className="task-list-header">
            <div>משימה</div>
            <div>אחראי</div>
            <div>דחיפות</div>
            <div>תאריך יעד</div>
            <div>סטטוס</div>
            <div>הערות / צ'אט</div>
            <div>פעולות</div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              טוען משימות...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              לא נמצאו משימות.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isRowSelected =
                toComparableId(selectedTaskId) === toComparableId(task.id);

              return (
                <div
                  key={task.id}
                  className={`task-row urgency-${task.urgency} ${isRowSelected ? "selected" : ""}`}
                  onClick={() => selectTaskRow(task.id)}
                >
                  <div className="task-title">{task.title}</div>

                  <div className="task-assignees">
                    {Array.isArray(task.assignees) &&
                    task.assignees.length > 0 ? (
                      task.assignees.map((assignee) => (
                        <div
                          key={toComparableId(assignee.id)}
                          className="assignee-item"
                        >
                          <AvatarCircle
                            src={resolveAvatar(assignee)}
                            name={assignee.name || ""}
                            className="assignee-avatar"
                          />
                          <div className="assignee-info">
                            <span className="assignee-name">
                              {assignee.name || "-"}
                            </span>
                            <span className="assignee-role">
                              {assignee.role || "-"}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="assignee-empty">ללא שיוך</div>
                    )}
                  </div>

                  <div className="task-urgency">
                    <TaskManagerDropdown
                      value={task.urgency}
                      onChange={(nextValue) =>
                        handleQuickTaskFieldChange(task, "urgency", nextValue)
                      }
                      options={URGENCY_VALUE_OPTIONS}
                      className={`task-inline-select task-inline-urgency-${task.urgency}`}
                      compact
                      getOptionClassName={getUrgencyOptionClass}
                      disabled={isQuickUpdating(task.id, "urgency")}
                    />
                  </div>

                  <div className="task-date">
                    {formatTaskDate(task.dueDate)}
                  </div>

                  <div className="task-status">
                    <TaskManagerDropdown
                      value={task.status}
                      onChange={(nextValue) =>
                        handleQuickTaskFieldChange(task, "status", nextValue)
                      }
                      options={STATUS_VALUE_OPTIONS}
                      className={`task-inline-select task-inline-status-${task.status}`}
                      compact
                      getOptionClassName={getStatusOptionClass}
                      disabled={isQuickUpdating(task.id, "status")}
                    />
                  </div>

                  <div className="task-comments">
                    <button
                      type="button"
                      className="comments-indicator"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTaskChat(task);
                      }}
                      aria-label={`פתיחת תגובות למשימה ${task.title}`}
                      title="פתיחת תגובות"
                    >
                      <FaCommentAlt
                        size={18}
                        style={{ color: "#333", transform: "scaleX(-1)" }}
                      />
                      {Number(task.commentsCount || 0) > 0 ? (
                        <span>{task.commentsCount} תגובות</span>
                      ) : (
                        <span>0 תגובות</span>
                      )}
                    </button>
                  </div>

                  <div className="more-options">
                    <button
                      className="task-row-edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTaskId(task.id);
                        setEditTaskId(task.id);
                      }}
                      title="ערוך משימה"
                    >
                      <FaEdit />
                    </button>

                    <button
                      className="task-row-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTaskFromRow(task);
                      }}
                      title="מחק משימה"
                    >
                      <FaTrash />
                    </button>

                    <button
                      className="view-details-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTaskId(task.id);
                        setDetailsTaskId(task.id);
                      }}
                      title="לפרטים מלאים"
                    >
                      <FaExpandArrowsAlt /> פרטים
                    </button>
                  </div>
                </div>
              );
            })
          )}

          <div
            style={{
              textAlign: "center",
              color: "#888",
              marginTop: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
            onClick={openAddTaskModal}
          >
            הוסף משימה...
          </div>
        </div>

        {selectedTask && (
          <TaskChatPanel
            task={selectedTask}
            isMobile={isMobile}
            onClose={() => setChatTaskId(null)}
            onCommentCountDelta={handleCommentCountDelta}
            onTaskInaccessible={handleTaskInaccessible}
          />
        )}
      </div>

      {detailsTask && (
        <TaskDetailsModal
          task={detailsTask}
          onClose={() => setDetailsTaskId(null)}
          onTaskUpdated={upsertTaskInBoard}
          onTaskInaccessible={handleTaskInaccessible}
        />
      )}

      {editTask && (
        <TaskEditModal
          task={editTask}
          onClose={() => setEditTaskId(null)}
          onTaskUpdated={upsertTaskInBoard}
          onTaskInaccessible={handleTaskInaccessible}
        />
      )}

      {isAddTaskModalOpen && (
        <AddTaskModal
          form={addTaskForm}
          files={addTaskFiles}
          researchOptions={createResearchOptions}
          isResearchLocked={isScopedBoard}
          error={addTaskError}
          fieldErrors={addTaskFieldErrors}
          isSubmitting={addTaskSubmitting}
          onChange={handleAddTaskFieldChange}
          onFilesChange={handleAddTaskFilesChange}
          onRemoveFile={handleRemoveAddTaskFile}
          onSubmit={handleAddTaskSubmit}
          onClose={closeAddTaskModal}
        />
      )}

      <ConfirmDialog
        isOpen={taskDeleteConfirm.isOpen}
        title="מחיקת משימה לצמיתות"
        message={`פעולה זו בלתי הפיכה ותמחק לצמיתות את המשימה "${taskDeleteConfirm.task?.title || ""}" כולל תגובות וקבצים מצורפים. להמשיך?`}
        onConfirm={handleConfirmTaskDelete}
        onCancel={closeTaskDeleteConfirm}
        confirmText={deletingTaskId ? "מוחק..." : "מחק לצמיתות"}
        cancelText="ביטול"
      />
    </div>
  );
};

/**
 * Add-task modal that collects the task payload, validation state, and files.
 */
const AddTaskModal = ({
  form,
  files,
  researchOptions,
  isResearchLocked,
  error,
  fieldErrors,
  isSubmitting,
  onChange,
  onFilesChange,
  onRemoveFile,
  onSubmit,
  onClose,
}) => {
  return (
    <div className="modal-overlay add-task-overlay" onClick={onClose}>
      <div
        className="modal-content add-task-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>הוספת משימה חדשה</h2>
          <button
            className="close-modal-btn"
            onClick={onClose}
            aria-label="סגור"
          >
            <FaTimes />
          </button>
        </div>

        <form className="modal-body add-task-form" onSubmit={onSubmit}>
          <div className="add-task-field">
            <label htmlFor="new-task-title">כותרת משימה</label>
            <input
              id="new-task-title"
              className="add-task-input"
              type="text"
              value={form.title}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="לדוגמה: הכנת טיוטת דוח"
              required
              disabled={isSubmitting}
            />
            {firstValidationMessage(fieldErrors, ["title"]) ? (
              <p className="add-task-error">
                {firstValidationMessage(fieldErrors, ["title"])}
              </p>
            ) : null}
          </div>

          <div className="add-task-field">
            <label htmlFor="new-task-description">תיאור</label>
            <textarea
              id="new-task-description"
              className="add-task-textarea"
              rows={4}
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="פרטים רלוונטיים למשימה"
              disabled={isSubmitting}
            />
            {firstValidationMessage(fieldErrors, ["description"]) ? (
              <p className="add-task-error">
                {firstValidationMessage(fieldErrors, ["description"])}
              </p>
            ) : null}
          </div>

          <div className="add-task-grid">
            <div className="add-task-field">
              <label htmlFor="new-task-urgency">דחיפות</label>
              <TaskManagerDropdown
                value={form.urgency}
                onChange={(value) => onChange("urgency", value)}
                options={URGENCY_VALUE_OPTIONS}
                className="add-task-select"
                placeholder="בחר דחיפות"
                getOptionClassName={getUrgencyOptionClass}
                disabled={isSubmitting}
              />
            </div>

            <div className="add-task-field">
              <label htmlFor="new-task-status">סטטוס</label>
              <TaskManagerDropdown
                value={form.status}
                onChange={(value) => onChange("status", value)}
                options={STATUS_VALUE_OPTIONS}
                className="add-task-select"
                placeholder="בחר סטטוס"
                getOptionClassName={getStatusOptionClass}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="add-task-grid add-task-grid-single-mobile">
            <div className="add-task-field">
              <label htmlFor="new-task-due-date">תאריך יעד</label>
              <CalendarDatePicker
                value={form.dueDate}
                onChange={(nextDate) => onChange("dueDate", nextDate)}
                minDate={new Date().toISOString().split("T")[0]}
                placeholder="בחר תאריך יעד"
                disabled={isSubmitting}
              />
              {firstValidationMessage(fieldErrors, ["dueDate", "due_date"]) ? (
                <p className="add-task-error">
                  {firstValidationMessage(fieldErrors, ["dueDate", "due_date"])}
                </p>
              ) : null}
            </div>
          </div>

          <div className="add-task-field">
            <label htmlFor="new-task-research">מחקר</label>
            <TaskManagerDropdown
              value={form.researchId}
              onChange={(value) => onChange("researchId", value)}
              options={researchOptions}
              placeholder="בחר מחקר"
              className="add-task-select"
              disabled={isSubmitting || isResearchLocked}
            />
            {firstValidationMessage(fieldErrors, [
              "research_id",
              "researchId",
            ]) ? (
              <p className="add-task-error">
                {firstValidationMessage(fieldErrors, [
                  "research_id",
                  "researchId",
                ])}
              </p>
            ) : null}
          </div>

          <div className="add-task-field">
            <label htmlFor="new-task-files">קבצים מצורפים</label>
            <input
              id="new-task-files"
              className="add-task-file-input"
              type="file"
              multiple
              onChange={onFilesChange}
              disabled={isSubmitting}
            />

            {files.length > 0 ? (
              <ul className="add-task-file-list">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="add-task-file-item"
                  >
                    <span className="add-task-file-name">{file.name}</span>
                    <button
                      type="button"
                      className="add-task-file-remove"
                      onClick={() => onRemoveFile(index)}
                      disabled={isSubmitting}
                    >
                      הסר
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {error ? <p className="add-task-error">{error}</p> : null}

          <div className="add-task-actions">
            <button
              type="button"
              className="add-task-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              ביטול
            </button>
            <button
              type="submit"
              className="add-task-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "שומר..." : "יצירת משימה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Task-level chat panel for comments, including mobile sheet presentation.
 */
const TaskChatPanel = ({
  task,
  onClose,
  isMobile,
  onCommentCountDelta,
  onTaskInaccessible,
}) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [newComment, setNewComment] = useState("");

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tasksAPI.listComments(task.id);
      setComments(data);
    } catch (error) {
      if (error?.status === 404) {
        toast.error("המשימה אינה זמינה יותר.");
        await onTaskInaccessible(task.id);
        onClose();
        return;
      }

      toast.error(getErrorMessage(error, "טעינת התגובות נכשלה."));
    } finally {
      setLoading(false);
    }
  }, [task.id, onClose, onTaskInaccessible]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSend = async (e) => {
    if (e.key !== "Enter" || e.shiftKey) {
      return;
    }

    e.preventDefault();
    if (!newComment.trim() || sending) {
      return;
    }

    setSending(true);
    try {
      const added = await tasksAPI.addComment(task.id, newComment.trim());
      setComments((prev) => [...prev, added]);
      onCommentCountDelta(task.id, 1);
      setNewComment("");
    } catch (error) {
      if (error?.status === 404) {
        toast.error("המשימה אינה זמינה יותר.");
        await onTaskInaccessible(task.id);
        onClose();
        return;
      }

      const message =
        error?.status === 403
          ? "אין הרשאה להוסיף תגובה."
          : getErrorMessage(error, "שליחת התגובה נכשלה.");
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (deletingCommentId) return;

    setDeletingCommentId(commentId);
    try {
      await tasksAPI.deleteComment(task.id, commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      onCommentCountDelta(task.id, -1);
    } catch (error) {
      if (error?.status === 404) {
        toast.error("המשימה אינה זמינה יותר.");
        await onTaskInaccessible(task.id);
        onClose();
        return;
      }

      const message =
        error?.status === 403
          ? "אין הרשאה למחוק תגובה זו."
          : getErrorMessage(error, "מחיקת התגובה נכשלה.");
      toast.error(message);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const panel = (
    <div className={`chat-panel ${isMobile ? "chat-panel-mobile" : ""}`}>
      <div
        className="chat-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>צ'אט עבור: {task.title}</span>
        <button
          className="close-chat-btn"
          onClick={onClose}
          aria-label="סגור צ'אט"
          title="סגור צ'אט"
        >
          <FaTimes />
        </button>
      </div>

      <div className="chat-messages">
        {loading ? (
          <div>טוען...</div>
        ) : comments.length === 0 ? (
          <div
            style={{ textAlign: "center", color: "#888", marginTop: "20px" }}
          >
            אין תגובות עדיין.
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="chat-message">
              <AvatarCircle
                src={resolveAvatar(comment.author)}
                name={comment.author?.name || ""}
                className="chat-avatar"
              />
              <div className="chat-content">
                <div className="chat-content-header">
                  <span className="chat-author-name">
                    {comment.author?.name || "-"}
                  </span>
                  <div className="chat-content-meta">
                    <span className="chat-time">
                      {comment.timeString || ""}
                    </span>
                    <button
                      type="button"
                      className="chat-delete-comment-btn"
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deletingCommentId === comment.id}
                    >
                      מחק
                    </button>
                  </div>
                </div>
                <div className="chat-body">{comment.body}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <button
            className="attach-file-btn"
            title="העלאת קבצים מתבצעת מחלון הפרטים"
            disabled
          >
            <FaPaperclip />
          </button>
          <textarea
            className="chat-input"
            placeholder="כתוב תגובה..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleSend}
            rows={2}
            disabled={sending}
          />
        </div>
      </div>
    </div>
  );

  if (!isMobile) {
    return panel;
  }

  return (
    <div className="chat-mobile-overlay" onClick={onClose}>
      <div className="chat-mobile-sheet" onClick={(e) => e.stopPropagation()}>
        {panel}
      </div>
    </div>
  );
};

/**
 * Edit modal for task metadata and assignee management.
 */
const TaskEditModal = ({
  task,
  onClose,
  onTaskUpdated,
  onTaskInaccessible,
}) => {
  const latestTaskRef = useRef(task);
  const [form, setForm] = useState({
    title: task.title || "",
    description: task.description || "",
    urgency: task.urgency || "medium",
    status: task.status || "todo",
    dueDate: task.dueDate || "",
  });
  const [assignees, setAssignees] = useState(
    Array.isArray(task.assignees) ? task.assignees : [],
  );
  const [memberOptions, setMemberOptions] = useState([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [assigneeActionPendingId, setAssigneeActionPendingId] = useState("");
  const [assigneeDeleteConfirm, setAssigneeDeleteConfirm] = useState(null);
  const [assigneeError, setAssigneeError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    latestTaskRef.current = task;
  }, [task]);

  useEffect(() => {
    setForm({
      title: task.title || "",
      description: task.description || "",
      urgency: task.urgency || "medium",
      status: task.status || "todo",
      dueDate: task.dueDate || "",
    });
    setAssignees(Array.isArray(task.assignees) ? task.assignees : []);
    setSelectedAssigneeId("");
    setAssigneeDeleteConfirm(null);
    setAssigneeError("");
    setFieldErrors({});
    setError("");
  }, [task.id]);

  useEffect(() => {
    let cancelled = false;

    const normalizeMemberOption = (member) => {
      const id = toComparableId(
        member?.user_id ?? member?.id ?? member?.userId,
      );
      if (!id) return null;

      const label =
        member?.display ||
        member?.name ||
        member?.full_name ||
        member?.fullName ||
        id;

      return {
        value: id,
        label: String(label),
        avatar: resolveAvatar(member),
      };
    };

    const loadMembers = async () => {
      if (!task?.researchId) {
        setMemberOptions([]);
        return;
      }

      setLoadingMembers(true);
      try {
        const members = await researchAPI.getChatMembers(task.researchId);
        const normalized = Array.isArray(members)
          ? members.map(normalizeMemberOption).filter(Boolean)
          : [];

        const seen = new Set();
        const deduped = normalized.filter((option) => {
          if (seen.has(option.value)) return false;
          seen.add(option.value);
          return true;
        });

        if (!cancelled) {
          setMemberOptions(deduped);
        }
      } catch {
        if (!cancelled) {
          setMemberOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingMembers(false);
        }
      }
    };

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [task.id, task.researchId]);

  const assigneeIds = useMemo(
    () =>
      new Set((assignees || []).map((assignee) => toComparableId(assignee.id))),
    [assignees],
  );

  const availableAssigneeOptions = useMemo(
    () =>
      memberOptions.filter(
        (option) => !assigneeIds.has(toComparableId(option.value)),
      ),
    [memberOptions, assigneeIds],
  );

  const updateTaskAssignees = useCallback(
    (nextAssignees) => {
      const currentTask = latestTaskRef.current || task;
      const updatedTask = {
        ...currentTask,
        assignees: nextAssignees,
      };

      setAssignees(nextAssignees);
      onTaskUpdated(updatedTask);
    },
    [onTaskUpdated, task],
  );

  const handleAddAssignee = async () => {
    if (!selectedAssigneeId || assigneeActionPendingId || saving) return;

    setAssigneeActionPendingId(selectedAssigneeId);
    setAssigneeError("");

    try {
      const addedAssignee = await tasksAPI.assignUser(
        task.id,
        selectedAssigneeId,
        "",
      );

      const nextAssignees = [...assignees];
      const existingIndex = nextAssignees.findIndex(
        (item) => toComparableId(item.id) === toComparableId(addedAssignee.id),
      );

      if (existingIndex >= 0) {
        nextAssignees[existingIndex] = addedAssignee;
      } else {
        nextAssignees.push(addedAssignee);
      }

      updateTaskAssignees(nextAssignees);
      setSelectedAssigneeId("");
      toast.success("האחראי נוסף למשימה.");
    } catch (requestError) {
      if (requestError?.status === 404) {
        toast.error("המשימה אינה זמינה יותר.");
        await onTaskInaccessible(task.id);
        onClose();
        return;
      }

      const message =
        requestError?.status === 403
          ? "אין הרשאה לעדכן אחראים במשימה זו."
          : getErrorMessage(requestError, "הוספת האחראי נכשלה.");

      setAssigneeError(message);
      toast.error(message);
    } finally {
      setAssigneeActionPendingId("");
    }
  };

  const handleRemoveAssignee = async (assigneeId) => {
    const normalizedId = toComparableId(assigneeId);
    if (!normalizedId || assigneeActionPendingId || saving) return;

    setAssigneeActionPendingId(normalizedId);
    setAssigneeError("");

    try {
      await tasksAPI.unassignUser(task.id, normalizedId);
      const nextAssignees = assignees.filter(
        (assignee) => toComparableId(assignee.id) !== normalizedId,
      );
      updateTaskAssignees(nextAssignees);
      toast.success("האחראי הוסר מהמשימה.");
    } catch (requestError) {
      if (requestError?.status === 404) {
        toast.error("המשימה אינה זמינה יותר.");
        await onTaskInaccessible(task.id);
        onClose();
        return;
      }

      const message =
        requestError?.status === 403
          ? "אין הרשאה לעדכן אחראים במשימה זו."
          : getErrorMessage(requestError, "הסרת האחראי נכשלה.");

      setAssigneeError(message);
      toast.error(message);
    } finally {
      setAssigneeActionPendingId("");
      setAssigneeDeleteConfirm(null);
    }
  };

  const openRemoveAssigneeConfirm = (assignee) => {
    const assigneeId = toComparableId(assignee?.id);
    if (!assigneeId || assigneeActionPendingId || saving) return;

    setAssigneeDeleteConfirm({
      id: assigneeId,
      name: assignee?.name || "האחראי",
    });
  };

  const closeRemoveAssigneeConfirm = () => {
    if (assigneeActionPendingId) return;
    setAssigneeDeleteConfirm(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const trimmedTitle = form.title.trim();
    const trimmedDescription = form.description.trim();

    if (!trimmedTitle) {
      setError("יש להזין כותרת למשימה.");
      return;
    }

    const patch = {};
    if (trimmedTitle !== (task.title || "")) patch.title = trimmedTitle;
    if (trimmedDescription !== (task.description || "")) {
      patch.description = trimmedDescription;
    }
    if (form.urgency !== task.urgency) patch.urgency = form.urgency;
    if (form.status !== task.status) patch.status = form.status;

    const originalDueDate = task.dueDate || "";
    const nextDueDate = form.dueDate || "";
    if (originalDueDate !== nextDueDate) {
      patch.dueDate = nextDueDate || null;
    }

    if (Object.keys(patch).length === 0) {
      toast("לא בוצעו שינויים.");
      onClose();
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors({});

    try {
      const updated = await tasksAPI.updateTask(task.id, patch);
      onTaskUpdated(updated);
      toast.success("המשימה עודכנה.");
      onClose();
    } catch (requestError) {
      if (requestError?.status === 404) {
        toast.error("המשימה אינה זמינה יותר.");
        await onTaskInaccessible(task.id);
        onClose();
        return;
      }

      if (requestError?.data?.code === "VALIDATION_ERROR") {
        setFieldErrors(requestError?.data?.details || {});
      }

      const message =
        requestError?.status === 403
          ? "אין הרשאה לערוך את המשימה."
          : getErrorMessage(requestError, "שמירת המשימה נכשלה.");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content add-task-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h2>עריכת משימה</h2>
            <button
              className="close-modal-btn"
              onClick={onClose}
              aria-label="סגור"
              disabled={saving}
            >
              <FaTimes />
            </button>
          </div>

          <form className="modal-body add-task-form" onSubmit={handleSubmit}>
            <div className="add-task-field">
              <label htmlFor={`task-edit-title-${task.id}`}>כותרת משימה</label>
              <input
                id={`task-edit-title-${task.id}`}
                className="add-task-input"
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                disabled={saving}
                required
              />
              {firstValidationMessage(fieldErrors, ["title"]) ? (
                <p className="add-task-error">
                  {firstValidationMessage(fieldErrors, ["title"])}
                </p>
              ) : null}
            </div>

            <div className="add-task-field">
              <label htmlFor={`task-edit-description-${task.id}`}>תיאור</label>
              <textarea
                id={`task-edit-description-${task.id}`}
                className="add-task-textarea"
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                disabled={saving}
              />
              {firstValidationMessage(fieldErrors, ["description"]) ? (
                <p className="add-task-error">
                  {firstValidationMessage(fieldErrors, ["description"])}
                </p>
              ) : null}
            </div>

            <div className="add-task-grid">
              <div className="add-task-field">
                <label>דחיפות</label>
                <TaskManagerDropdown
                  value={form.urgency}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, urgency: value }))
                  }
                  options={URGENCY_VALUE_OPTIONS}
                  className="add-task-select"
                  disabled={saving}
                />
              </div>

              <div className="add-task-field">
                <label>סטטוס</label>
                <TaskManagerDropdown
                  value={form.status}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, status: value }))
                  }
                  options={STATUS_VALUE_OPTIONS}
                  className="add-task-select"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="add-task-field">
              <label htmlFor={`task-edit-due-date-${task.id}`}>תאריך יעד</label>
              <CalendarDatePicker
                value={form.dueDate || ""}
                onChange={(nextDate) =>
                  setForm((prev) => ({ ...prev, dueDate: nextDate }))
                }
                placeholder="בחר תאריך יעד"
                disabled={saving}
              />
              {firstValidationMessage(fieldErrors, ["dueDate", "due_date"]) ? (
                <p className="add-task-error">
                  {firstValidationMessage(fieldErrors, ["dueDate", "due_date"])}
                </p>
              ) : null}
            </div>

            <div className="add-task-field">
              <label>אחראים</label>

              {assignees.length > 0 ? (
                <div className="task-assignees-list">
                  {assignees.map((assignee) => {
                    const assigneeId = toComparableId(assignee.id);
                    return (
                      <div key={assigneeId} className="task-assignee-row">
                        <div className="task-assignee-info">
                          <AvatarCircle
                            src={resolveAvatar(assignee)}
                            name={assignee.name || ""}
                            className="assignee-avatar"
                          />
                          <div>
                            <div className="assignee-name">
                              {assignee.name || "-"}
                            </div>
                            <div className="assignee-role">
                              {assignee.role || "-"}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="task-assignee-remove"
                          onClick={() => openRemoveAssigneeConfirm(assignee)}
                          disabled={
                            saving ||
                            assigneeActionPendingId === assigneeId ||
                            loadingMembers
                          }
                          title="הסר אחראי"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-text">אין אחראים משויכים למשימה.</p>
              )}

              <div className="task-assignee-add-row">
                <TaskManagerDropdown
                  value={selectedAssigneeId}
                  onChange={setSelectedAssigneeId}
                  options={availableAssigneeOptions}
                  className="add-task-select"
                  placeholder={
                    loadingMembers
                      ? "טוען חברי מחקר..."
                      : availableAssigneeOptions.length
                        ? "בחר אחראי להוספה"
                        : "אין אחראים זמינים להוספה"
                  }
                  disabled={
                    saving || loadingMembers || !availableAssigneeOptions.length
                  }
                />

                <button
                  type="button"
                  className="add-task-submit task-assignee-add-btn"
                  onClick={handleAddAssignee}
                  disabled={
                    saving ||
                    loadingMembers ||
                    !selectedAssigneeId ||
                    Boolean(assigneeActionPendingId)
                  }
                >
                  הוסף אחראי
                </button>
              </div>

              {assigneeError ? (
                <p className="add-task-error">{assigneeError}</p>
              ) : null}
            </div>

            {error ? <p className="add-task-error">{error}</p> : null}

            <div className="add-task-actions">
              <button
                type="button"
                className="add-task-cancel"
                onClick={onClose}
                disabled={saving}
              >
                ביטול
              </button>
              <button
                type="submit"
                className="add-task-submit"
                disabled={saving}
              >
                {saving ? "שומר..." : "שמור שינויים"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(assigneeDeleteConfirm)}
        title="הסרת אחראי מהמשימה"
        message={`האם להסיר את ${assigneeDeleteConfirm?.name || "האחראי"} ממשימה זו?`}
        onConfirm={() => {
          if (assigneeDeleteConfirm?.id) {
            handleRemoveAssignee(assigneeDeleteConfirm.id);
          }
        }}
        onCancel={closeRemoveAssigneeConfirm}
        confirmText={assigneeActionPendingId ? "מסיר..." : "הסר"}
        cancelText="ביטול"
      />
    </>
  );
};

/**
 * Detail modal for task description, metadata, assignees, and attachments.
 */
const TaskDetailsModal = ({
  task,
  onClose,
  onTaskUpdated,
  onTaskInaccessible,
}) => {
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);
  const [attachmentDeleteConfirmId, setAttachmentDeleteConfirmId] =
    useState(null);

  const applyTaskUpdate = (nextTask) => {
    onTaskUpdated(nextTask);
  };

  const handleAttachmentUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (!selectedFiles.length) return;

    setUploadingAttachments(true);

    try {
      const uploaded = await tasksAPI.uploadAttachments(task.id, selectedFiles);
      const existingAttachments = Array.isArray(task.attachments)
        ? task.attachments
        : [];

      applyTaskUpdate({
        ...task,
        attachments: [...existingAttachments, ...uploaded],
      });

      toast.success("הקבצים הועלו בהצלחה.");
    } catch (error) {
      if (error?.status === 404) {
        toast.error("המשימה אינה זמינה יותר.");
        await onTaskInaccessible(task.id);
        onClose();
        return;
      }

      const message =
        error?.status === 403
          ? "אין הרשאה להעלות קבצים למשימה זו."
          : getErrorMessage(error, "העלאת הקבצים נכשלה.");
      toast.error(message);
    } finally {
      setUploadingAttachments(false);
    }
  };

  const closeAttachmentDeleteConfirm = () => {
    if (deletingAttachmentId) return;
    setAttachmentDeleteConfirmId(null);
  };

  const handleAttachmentDelete = async () => {
    if (!attachmentDeleteConfirmId || deletingAttachmentId) return;
    const attachmentId = attachmentDeleteConfirmId;

    setDeletingAttachmentId(attachmentId);
    try {
      await tasksAPI.deleteAttachment(task.id, attachmentId);

      const nextAttachments = (task.attachments || []).filter(
        (attachment) =>
          toComparableId(attachment.id) !== toComparableId(attachmentId),
      );

      applyTaskUpdate({ ...task, attachments: nextAttachments });
      toast.success("הקובץ הוסר.");
    } catch (error) {
      if (error?.status === 404) {
        toast.error("המשימה אינה זמינה יותר.");
        await onTaskInaccessible(task.id);
        onClose();
        return;
      }

      const message =
        error?.status === 403
          ? "אין הרשאה למחוק קבצים ממשימה זו."
          : getErrorMessage(error, "מחיקת הקובץ נכשלה.");
      toast.error(message);
    } finally {
      setDeletingAttachmentId(null);
      setAttachmentDeleteConfirmId(null);
    }
  };

  const handleDownloadAttachment = (attachment) => {
    if (!attachment?.url) {
      toast.error("אין קישור להורדה עבור קובץ זה.");
      return;
    }

    window.open(attachment.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task.title}</h2>
          <button
            className="close-modal-btn"
            onClick={onClose}
            aria-label="סגור"
          >
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <div className="details-section-header">
              <h3>תיאור המשימה המלא</h3>
              {isEditingDescription ? (
                <div className="details-section-actions">
                  <button
                    type="button"
                    className="details-inline-btn"
                    onClick={() => {
                      setDescriptionDraft(task.description || "");
                      setIsEditingDescription(false);
                    }}
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    className="details-inline-btn details-inline-btn-primary"
                    onClick={handleSaveDescription}
                  >
                    שמירה
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="details-inline-btn"
                  onClick={() => setIsEditingDescription(true)}
                >
                  עריכת טקסט
                </button>
              )}
            </div>
            <div className="task-description-box">
              {isEditingDescription ? (
                <textarea
                  className="task-description-editor"
                  rows={6}
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  placeholder="הוסף תיאור למשימה"
                />
              ) : task.description ? (
                <p>{task.description}</p>
              ) : (
                <p className="empty-text">אין תיאור מפורט למשימה זו.</p>
              )}
            </div>
          </div>

          <div className="modal-section">
            <h3>אחראים ({task.assignees?.length || 0})</h3>
            {task.assignees && task.assignees.length > 0 ? (
              <div className="task-assignees-list">
                {task.assignees.map((assignee) => (
                  <div
                    key={toComparableId(assignee.id)}
                    className="task-assignee-row"
                  >
                    <div className="task-assignee-info">
                      <AvatarCircle
                        src={resolveAvatar(assignee)}
                        name={assignee.name || ""}
                        className="assignee-avatar"
                      />
                      <div>
                        <div className="assignee-name">
                          {assignee.name || "-"}
                        </div>
                        <div className="assignee-role">
                          {assignee.role || "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">אין אחראים למשימה זו.</p>
            )}
          </div>

          <div className="modal-section">
            <h3>פרטי המשימה</h3>
            <div className="task-metadata-grid">
              <div className="task-meta-item">
                <span className="task-meta-label">מחקר</span>
                <span className="task-meta-value">
                  {task.researchName || `מחקר ${task.researchId}`}
                </span>
              </div>
              <div className="task-meta-item">
                <span className="task-meta-label">דחיפות</span>
                <span className="task-meta-value">
                  {URGENCY_LABELS[task.urgency] || task.urgency}
                </span>
              </div>
              <div className="task-meta-item">
                <span className="task-meta-label">סטטוס</span>
                <span className="task-meta-value">
                  {STATUS_LABELS[task.status] || task.status}
                </span>
              </div>
              <div className="task-meta-item">
                <span className="task-meta-label">תאריך יעד</span>
                <span className="task-meta-value">
                  {formatTaskDate(task.dueDate)}
                </span>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>קבצים מצורפים ({task.attachments?.length || 0})</h3>
            {task.attachments && task.attachments.length > 0 ? (
              <div className="attachments-list">
                {task.attachments.map((attachment) => (
                  <div key={attachment.id} className="attachment-item">
                    <div className="attachment-info-group">
                      <FaFileAlt className="attachment-icon" />
                      <div className="attachment-details">
                        <span className="attachment-name">
                          {attachment.name}
                        </span>
                        <span className="attachment-size">
                          {attachment.size}
                        </span>
                      </div>
                    </div>

                    <div className="attachment-actions">
                      <button
                        className="download-btn"
                        title="הורד קובץ"
                        onClick={() => handleDownloadAttachment(attachment)}
                      >
                        <FaDownload />
                      </button>
                      <button
                        className="attachment-delete-btn"
                        title="מחק קובץ"
                        onClick={() =>
                          setAttachmentDeleteConfirmId(attachment.id)
                        }
                        disabled={
                          toComparableId(deletingAttachmentId) ===
                          toComparableId(attachment.id)
                        }
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">לא צורפו קבצים למשימה זו.</p>
            )}

            <label
              className={`upload-file-btn ${uploadingAttachments ? "is-disabled" : ""}`}
              htmlFor={`upload-attachment-${task.id}`}
            >
              <FaPaperclip />
              {uploadingAttachments ? "מעלה קבצים..." : "העלה קובץ חדש"}
            </label>
            <input
              id={`upload-attachment-${task.id}`}
              className="visually-hidden-file-input"
              type="file"
              multiple
              onChange={handleAttachmentUpload}
              disabled={uploadingAttachments}
            />
          </div>

          <div className="modal-section task-delete-zone">
            <button className="add-task-cancel" type="button" onClick={onClose}>
              סגור
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(attachmentDeleteConfirmId)}
        title="מחיקת קובץ לצמיתות"
        message="מחיקת הקובץ היא פעולה בלתי הפיכה. האם להמשיך?"
        onConfirm={handleAttachmentDelete}
        onCancel={closeAttachmentDeleteConfirm}
        confirmText={deletingAttachmentId ? "מוחק..." : "מחק לצמיתות"}
        cancelText="ביטול"
      />
    </div>
  );
};

export default TaskManager;
