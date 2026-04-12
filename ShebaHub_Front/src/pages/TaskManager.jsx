import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import useMediaQuery from "../hooks/useMediaQuery";
import { taskAPI } from "../services/mockTasksAPI";
import FormSelect from "../components/forms/FormSelect";
import "../styles/TaskManager.css";
import {
  FaCommentAlt,
  FaTimes,
  FaExpandArrowsAlt,
  FaPaperclip,
  FaFileAlt,
  FaDownload,
  FaTrashAlt,
} from "react-icons/fa";

const TaskFilterSelect = ({ name, value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const selectedLabel = selectedOption?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div
      className={`task-filter-select ${isOpen ? "is-open" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        className="task-filter-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${name}-menu`}
      >
        <span className="task-filter-trigger-text">{selectedLabel}</span>
        <span className="task-filter-trigger-icon" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen ? (
        <ul
          id={`${name}-menu`}
          className="task-filter-menu"
          role="listbox"
          aria-label={placeholder}
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
            >
              <button
                type="button"
                className={`task-filter-option ${opt.value === value ? "is-active" : ""}`}
                onClick={() => handleSelect(opt.value)}
                title={opt.label}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

const TaskPillSelect = ({
  name,
  value,
  onChange,
  options,
  ariaLabel,
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const selectedLabel = selectedOption?.label || "";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div
      className={`task-pill-select ${isOpen ? "is-open" : ""}`}
      ref={rootRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`task-pill-trigger is-${value}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${name}-menu`}
        aria-label={ariaLabel}
        title={title}
      >
        <span className="task-pill-trigger-text">{selectedLabel}</span>
        <span className="task-pill-trigger-icon" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen ? (
        <ul id={`${name}-menu`} className="task-pill-menu" role="listbox">
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
            >
              <button
                type="button"
                className={`task-pill-option ${opt.value === value ? "is-active" : ""}`}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

const TaskManager = () => {
  const { user } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [researchFilter, setResearchFilter] = useState("all");

  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [detailsTask, setDetailsTask] = useState(null);
  const [pendingIrreversibleAction, setPendingIrreversibleAction] =
    useState(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [addTaskError, setAddTaskError] = useState("");
  const [addTaskFiles, setAddTaskFiles] = useState([]);
  const [addTaskForm, setAddTaskForm] = useState({
    title: "",
    description: "",
    urgency: "medium",
    status: "todo",
    researchName: "",
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    const freshTask = tasks.find((task) => task.id === selectedTask.id);
    if (!freshTask) {
      setSelectedTask(null);
      return;
    }

    if (freshTask !== selectedTask) {
      setSelectedTask(freshTask);
    }
  }, [tasks, selectedTask]);

  useEffect(() => {
    if (!detailsTask) {
      return;
    }

    const freshTask = tasks.find((task) => task.id === detailsTask.id);
    if (!freshTask) {
      setDetailsTask(null);
      return;
    }

    if (freshTask !== detailsTask) {
      setDetailsTask(freshTask);
    }
  }, [tasks, detailsTask]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await taskAPI.getTasks();
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setLoading(false);
    }
  };

  // Unique researches for filter
  const researches = [...new Set(tasks.map((t) => t.researchName))].sort(
    (a, b) => String(a).localeCompare(String(b), "he"),
  );

  // Map for display
  const urgencyLabels = {
    high: "גדולה",
    medium: "בינונית",
    low: "קטנה",
  };

  const statusLabels = {
    todo: "לביצוע",
    in_progress: "בביצוע",
    needs_help: "מחכה לעזרה",
    completed: "הושלמה",
  };

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (urgencyFilter !== "all" && task.urgency !== urgencyFilter) return false;
    if (researchFilter !== "all" && task.researchName !== researchFilter)
      return false;
    return true;
  });

  const openTaskChat = (task) => {
    setSelectedTaskId(task.id);
    setSelectedTask(task);
  };

  const selectTaskRow = (taskId) => {
    setSelectedTaskId(taskId);
  };

  const getDefaultResearchName = () => {
    if (researchFilter !== "all") {
      return researchFilter;
    }

    if (researches.length > 0) {
      return researches[0];
    }

    return "";
  };

  const openAddTaskModal = () => {
    setAddTaskError("");
    setAddTaskFiles([]);
    setAddTaskForm({
      title: "",
      description: "",
      urgency: urgencyFilter !== "all" ? urgencyFilter : "medium",
      status: statusFilter !== "all" ? statusFilter : "todo",
      researchName: getDefaultResearchName(),
    });
    setIsAddTaskModalOpen(true);
  };

  const closeAddTaskModal = () => {
    setIsAddTaskModalOpen(false);
    setAddTaskError("");
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

  const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    const unitIndex = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / 1024 ** unitIndex;

    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const handleAddTaskSubmit = (e) => {
    e.preventDefault();

    const normalizedTitle = addTaskForm.title.trim();
    const normalizedDescription = addTaskForm.description.trim();

    if (!normalizedTitle) {
      setAddTaskError("יש להזין כותרת למשימה.");
      return;
    }

    if (!addTaskForm.researchName) {
      setAddTaskError("יש לבחור מחקר.");
      return;
    }

    const displayName = user?.first_name
      ? `${user.first_name} ${user?.last_name || ""}`.trim()
      : "Me";

    const taskTimestamp = Date.now();

    const newTask = {
      id: `task_${taskTimestamp}`,
      title: normalizedTitle,
      researchId: `res_${taskTimestamp}`,
      researchName: addTaskForm.researchName,
      assignees: [
        {
          id: user?.id || "me",
          name: displayName,
          role: "owner",
          avatar:
            user?.profile_picture ||
            "https://randomuser.me/api/portraits/lego/1.jpg",
        },
      ],
      urgency: addTaskForm.urgency,
      dueDate: new Date().toISOString().slice(0, 10),
      status: addTaskForm.status,
      commentsCount: 0,
      description: normalizedDescription,
      attachments: addTaskFiles.map((file, index) => ({
        id: `att_${taskTimestamp}_${index}`,
        name: file.name,
        size: formatFileSize(file.size),
        url: "#",
      })),
    };

    setTasks((prev) => [newTask, ...prev]);
    setSelectedTaskId(newTask.id);
    closeAddTaskModal();
  };

  const handleQuickTaskFieldChange = (taskId, field, nextValue) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, [field]: nextValue } : task,
      ),
    );
  };

  const saveTaskDescription = (taskId, nextDescription) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, description: nextDescription } : task,
      ),
    );
  };

  const requestDeleteTask = (task) => {
    setPendingIrreversibleAction({
      type: "delete-task",
      taskId: task.id,
      title: "מחיקת משימה",
      message: `אתה עומד למחוק את המשימה: ${task.title}`,
      warning: "פעולה זו קבועה ולא ניתנת לשחזור. האם אתה בטוח שברצונך להמשיך?",
      confirmLabel: "כן, מחק לצמיתות",
    });
  };

  const requestDeleteAttachment = (task, attachment) => {
    setPendingIrreversibleAction({
      type: "delete-attachment",
      taskId: task.id,
      attachmentId: attachment.id,
      title: "מחיקת קובץ מצורף",
      message: `אתה עומד למחוק את הקובץ: ${attachment.name}`,
      warning: "מחיקת הקובץ היא סופית ולא ניתנת לשחזור. האם להמשיך?",
      confirmLabel: "כן, מחק קובץ",
    });
  };

  const closeIrreversibleConfirmModal = () => {
    setPendingIrreversibleAction(null);
  };

  const confirmIrreversibleAction = () => {
    if (!pendingIrreversibleAction) {
      return;
    }

    if (pendingIrreversibleAction.type === "delete-task") {
      const taskIdToDelete = pendingIrreversibleAction.taskId;

      setTasks((prev) => prev.filter((task) => task.id !== taskIdToDelete));

      if (selectedTaskId === taskIdToDelete) {
        setSelectedTaskId(null);
      }
    }

    if (pendingIrreversibleAction.type === "delete-attachment") {
      const { taskId, attachmentId } = pendingIrreversibleAction;
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                attachments: (task.attachments || []).filter(
                  (attachment) => attachment.id !== attachmentId,
                ),
              }
            : task,
        ),
      );
    }

    setPendingIrreversibleAction(null);
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
        <TaskFilterSelect
          name="researchFilter"
          value={researchFilter}
          onChange={setResearchFilter}
          options={[
            { value: "all", label: "כל המחקרים" },
            ...researches.map((r) => ({ value: r, label: r })),
          ]}
          placeholder="כל המחקרים"
        />

        <TaskFilterSelect
          name="statusFilter"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "סנן לפי סטטוס" },
            { value: "todo", label: "לביצוע" },
            { value: "in_progress", label: "בביצוע" },
            { value: "needs_help", label: "מחכה לעזרה" },
            { value: "completed", label: "הושלמה" },
          ]}
          placeholder="סנן לפי סטטוס"
        />

        <TaskFilterSelect
          name="urgencyFilter"
          value={urgencyFilter}
          onChange={setUrgencyFilter}
          options={[
            { value: "all", label: "מיין לפי דחיפות" },
            { value: "high", label: "גדולה" },
            { value: "medium", label: "בינונית" },
            { value: "low", label: "קטנה" },
          ]}
          placeholder="מיין לפי דחיפות"
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
            <div></div>
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
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`task-row urgency-${task.urgency} ${selectedTaskId === task.id ? "selected" : ""}`}
                onClick={() => selectTaskRow(task.id)}
              >
                <div className="task-title">{task.title}</div>

                <div className="task-assignees">
                  {task.assignees.map((assignee, idx) => (
                    <div key={idx} className="assignee-item">
                      <img
                        src={assignee.avatar}
                        alt={assignee.name}
                        className="assignee-avatar"
                      />
                      <div className="assignee-info">
                        <span className="assignee-name">{assignee.name}</span>
                        <span className="assignee-role">{assignee.role}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="task-urgency">
                  <TaskPillSelect
                    name={`task-${task.id}-urgency`}
                    value={task.urgency}
                    onChange={(nextValue) =>
                      handleQuickTaskFieldChange(task.id, "urgency", nextValue)
                    }
                    options={[
                      { value: "high", label: urgencyLabels.high },
                      { value: "medium", label: urgencyLabels.medium },
                      { value: "low", label: urgencyLabels.low },
                    ]}
                    ariaLabel={`עדכון דחיפות עבור ${task.title}`}
                    title="עדכון דחיפות"
                  />
                </div>

                <div className="task-date">
                  {new Date(task.dueDate).toLocaleDateString("en-GB")}
                </div>

                <div className="task-status">
                  <TaskPillSelect
                    name={`task-${task.id}-status`}
                    value={task.status}
                    onChange={(nextValue) =>
                      handleQuickTaskFieldChange(task.id, "status", nextValue)
                    }
                    options={[
                      { value: "todo", label: statusLabels.todo },
                      { value: "in_progress", label: statusLabels.in_progress },
                      { value: "needs_help", label: statusLabels.needs_help },
                      { value: "completed", label: statusLabels.completed },
                    ]}
                    ariaLabel={`עדכון סטטוס עבור ${task.title}`}
                    title="עדכון סטטוס"
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
                    {task.commentsCount > 0 ? (
                      <span>{task.commentsCount} תגובות</span>
                    ) : (
                      <span>0 תגובות</span>
                    )}
                  </button>
                </div>

                <div className="more-options">
                  <button
                    className="delete-task-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDeleteTask(task);
                    }}
                    title="מחיקת משימה"
                    aria-label={`מחיקת משימה ${task.title}`}
                  >
                    <FaTrashAlt /> מחק
                  </button>

                  <button
                    className="view-details-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTaskId(task.id);
                      setDetailsTask(task);
                    }}
                    title="לפרטים מלאים"
                  >
                    <FaExpandArrowsAlt /> פרטים
                  </button>
                </div>
              </div>
            ))
          )}

          <div
            style={{
              textAlign: "center",
              color: "#888",
              marginTop: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            הוסף משימה...
          </div>
        </div>

        {selectedTask && (
          <TaskChatPanel
            task={selectedTask}
            user={user}
            onClose={() => setSelectedTask(null)}
            isMobile={isMobile}
          />
        )}
      </div>

      {detailsTask && (
        <TaskDetailsModal
          task={detailsTask}
          onSaveDescription={saveTaskDescription}
          onRequestDeleteAttachment={requestDeleteAttachment}
          onClose={() => setDetailsTask(null)}
        />
      )}

      {isAddTaskModalOpen && (
        <AddTaskModal
          form={addTaskForm}
          files={addTaskFiles}
          researches={researches}
          error={addTaskError}
          onChange={handleAddTaskFieldChange}
          onFilesChange={handleAddTaskFilesChange}
          onRemoveFile={handleRemoveAddTaskFile}
          onSubmit={handleAddTaskSubmit}
          onClose={closeAddTaskModal}
        />
      )}

      {pendingIrreversibleAction && (
        <IrreversibleConfirmModal
          title={pendingIrreversibleAction.title}
          message={pendingIrreversibleAction.message}
          warning={pendingIrreversibleAction.warning}
          confirmLabel={pendingIrreversibleAction.confirmLabel}
          onConfirm={confirmIrreversibleAction}
          onClose={closeIrreversibleConfirmModal}
        />
      )}
    </div>
  );
};

const AddTaskModal = ({
  form,
  files,
  researches,
  error,
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
            />
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
            />
          </div>

          <div className="add-task-grid">
            <div className="add-task-field">
              <FormSelect
                label="דחיפות"
                name="new-task-urgency"
                value={form.urgency}
                onChange={(e) => onChange("urgency", e.target.value)}
                options={[
                  { value: "high", label: "גדולה" },
                  { value: "medium", label: "בינונית" },
                  { value: "low", label: "קטנה" },
                ]}
                placeholder="בחר דחיפות"
              />
            </div>

            <div className="add-task-field">
              <FormSelect
                label="סטטוס"
                name="new-task-status"
                value={form.status}
                onChange={(e) => onChange("status", e.target.value)}
                options={[
                  { value: "todo", label: "לביצוע" },
                  { value: "in_progress", label: "בביצוע" },
                  { value: "needs_help", label: "מחכה לעזרה" },
                  { value: "completed", label: "הושלמה" },
                ]}
                placeholder="בחר סטטוס"
              />
            </div>
          </div>

          <div className="add-task-field">
            <FormSelect
              label="מחקר"
              name="new-task-research"
              value={form.researchName}
              onChange={(e) => onChange("researchName", e.target.value)}
              options={researches.map((researchName) => ({
                value: researchName,
                label: researchName,
              }))}
              placeholder="בחר מחקר"
              error={error && !form.researchName ? "יש לבחור מחקר." : ""}
            />
          </div>

          <div className="add-task-field">
            <label htmlFor="new-task-files">קבצים מצורפים</label>
            <input
              id="new-task-files"
              className="add-task-file-input"
              type="file"
              multiple
              onChange={onFilesChange}
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
            <button type="button" className="add-task-cancel" onClick={onClose}>
              ביטול
            </button>
            <button type="submit" className="add-task-submit">
              יצירת משימה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Subcomponent for the Chat Panel
const TaskChatPanel = ({ task, user, onClose, isMobile }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetchComments();
  }, [task.id]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const data = await taskAPI.getComments(task.id);
      setComments(data);
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!newComment.trim()) return;

      const added = await taskAPI.addComment(task.id, newComment, user);
      setComments([...comments, added]);
      setNewComment("");
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
          comments.map((c) => (
            <div key={c.id} className="chat-message">
              <img
                src={c.author.avatar}
                alt={c.author.name}
                className="chat-avatar"
              />
              <div className="chat-content">
                <div className="chat-content-header">
                  <span className="chat-author-name">{c.author.name}</span>
                  <span className="chat-time">{c.timeString}</span>
                </div>
                <div className="chat-body">{c.body}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <button className="attach-file-btn" title="הוסף קובץ">
            <FaPaperclip />
          </button>
          <textarea
            className="chat-input"
            placeholder="כתוב תגובה..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleSend}
            rows={2}
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

// Subcomponent for the Details Modal
const TaskDetailsModal = ({
  task,
  onSaveDescription,
  onRequestDeleteAttachment,
  onClose,
}) => {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(
    task.description || "",
  );

  useEffect(() => {
    setDescriptionDraft(task.description || "");
    setIsEditingDescription(false);
  }, [task.id, task.description]);

  const handleSaveDescription = () => {
    onSaveDescription(task.id, descriptionDraft.trim());
    setIsEditingDescription(false);
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
            <h3>קבצים מצורפים ({task.attachments?.length || 0})</h3>
            {task.attachments && task.attachments.length > 0 ? (
              <div className="attachments-list">
                {task.attachments.map((att) => (
                  <div key={att.id} className="attachment-item">
                    <div className="attachment-info-group">
                      <FaFileAlt className="attachment-icon" />
                      <div className="attachment-details">
                        <span className="attachment-name">{att.name}</span>
                        <span className="attachment-size">{att.size}</span>
                      </div>
                    </div>

                    <div className="attachment-actions">
                      <button className="download-btn" title="הורד קובץ">
                        <FaDownload />
                      </button>
                      <button
                        type="button"
                        className="attachment-delete-btn"
                        title="מחיקת קובץ"
                        onClick={() => onRequestDeleteAttachment(task, att)}
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">לא צורפו קבצים למשימה זו.</p>
            )}
            <button className="upload-file-btn">
              <FaPaperclip /> העלה קובץ חדש
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const IrreversibleConfirmModal = ({
  title,
  message,
  warning,
  confirmLabel,
  onConfirm,
  onClose,
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content delete-confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="close-modal-btn"
            onClick={onClose}
            aria-label="סגור"
          >
            <FaTimes />
          </button>
        </div>

        <div className="modal-body delete-confirm-body">
          <p className="delete-confirm-text">{message}</p>
          <p className="delete-confirm-warning">{warning}</p>

          <div className="delete-confirm-actions">
            <button type="button" className="add-task-cancel" onClick={onClose}>
              ביטול
            </button>
            <button
              type="button"
              className="delete-confirm-btn"
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskManager;
