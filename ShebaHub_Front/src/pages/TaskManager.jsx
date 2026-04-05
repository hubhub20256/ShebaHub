import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import useMediaQuery from "../hooks/useMediaQuery";
import { taskAPI } from "../services/mockTasksAPI";
import "../styles/TaskManager.css";
import {
  FaCommentAlt,
  FaTimes,
  FaExpandArrowsAlt,
  FaPaperclip,
  FaFileAlt,
  FaDownload,
} from "react-icons/fa";

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

  return (
    <div className="task-manager-container">
      <div className="task-manager-header">
        <h1>ברוכים הבאים ללוח ניהול המשימות שלך</h1>
        <button className="add-task-btn" onClick={openAddTaskModal}>
          הוסף משימה חדשה
        </button>
      </div>

      <div className="task-filters">
        <select
          className="filter-select"
          value={researchFilter}
          onChange={(e) => setResearchFilter(e.target.value)}
        >
          <option value="all">כל המחקרים</option>
          {researches.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">סנן לפי סטטוס</option>
          <option value="todo">לביצוע</option>
          <option value="in_progress">בביצוע</option>
          <option value="needs_help">מחכה לעזרה</option>
          <option value="completed">הושלמה</option>
        </select>

        <select
          className="filter-select"
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
        >
          <option value="all">מיין לפי דחיפות</option>
          <option value="high">גדולה</option>
          <option value="medium">בינונית</option>
          <option value="low">קטנה</option>
        </select>
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
                  <span className={`badge badge-urgency-${task.urgency}`}>
                    {urgencyLabels[task.urgency]}
                  </span>
                </div>

                <div className="task-date">
                  {new Date(task.dueDate).toLocaleDateString("en-GB")}
                </div>

                <div className="task-status">
                  <span className={`badge badge-status-${task.status}`}>
                    {statusLabels[task.status]}
                  </span>
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
    <div className="modal-overlay" onClick={onClose}>
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
              <label htmlFor="new-task-urgency">דחיפות</label>
              <select
                id="new-task-urgency"
                className="add-task-select"
                value={form.urgency}
                onChange={(e) => onChange("urgency", e.target.value)}
              >
                <option value="high">גדולה</option>
                <option value="medium">בינונית</option>
                <option value="low">קטנה</option>
              </select>
            </div>

            <div className="add-task-field">
              <label htmlFor="new-task-status">סטטוס</label>
              <select
                id="new-task-status"
                className="add-task-select"
                value={form.status}
                onChange={(e) => onChange("status", e.target.value)}
              >
                <option value="todo">לביצוע</option>
                <option value="in_progress">בביצוע</option>
                <option value="needs_help">מחכה לעזרה</option>
                <option value="completed">הושלמה</option>
              </select>
            </div>
          </div>

          <div className="add-task-field">
            <label htmlFor="new-task-research">מחקר</label>
            <select
              id="new-task-research"
              className="add-task-select"
              value={form.researchName}
              onChange={(e) => onChange("researchName", e.target.value)}
              required
            >
              <option value="">בחר מחקר</option>
              {researches.map((researchName) => (
                <option key={researchName} value={researchName}>
                  {researchName}
                </option>
              ))}
            </select>
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
const TaskDetailsModal = ({ task, onClose }) => {
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
            <h3>תיאור המשימה המלא</h3>
            <div className="task-description-box">
              {task.description ? (
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
                    <button className="download-btn" title="הורד קובץ">
                      <FaDownload />
                    </button>
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

export default TaskManager;
