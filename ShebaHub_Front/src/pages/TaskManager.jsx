import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { taskAPI } from "../services/mockTasksAPI";
import "../styles/TaskManager.css";
import { FaCommentAlt, FaRegComment, FaEllipsisH, FaTimes, FaExpandArrowsAlt, FaPaperclip, FaFileAlt, FaDownload } from "react-icons/fa";

const TaskManager = () => {
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [researchFilter, setResearchFilter] = useState("all");
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailsTask, setDetailsTask] = useState(null);

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
  const researches = [...new Set(tasks.map(t => t.researchName))];

  // Map for display
  const urgencyLabels = {
    high: "גדולה",
    medium: "בינונית",
    low: "קטנה"
  };
  
  const statusLabels = {
    todo: "לביצוע",
    in_progress: "בביצוע",
    needs_help: "צריכה עזרה",
    completed: "הושלמה"
  };

  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (urgencyFilter !== "all" && task.urgency !== urgencyFilter) return false;
    if (researchFilter !== "all" && task.researchName !== researchFilter) return false;
    return true;
  });

  return (
    <div className="task-manager-container">
      <div className="task-manager-header">
        <h1>ברוכים הבאים ללוח ניהול המשימות שלך</h1>
        <button className="add-task-btn">הוסף משימה חדשה</button>
      </div>

      <div className="task-filters">
        <select 
          className="filter-select" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">סנן לפי סטטוס</option>
          <option value="todo">לביצוע</option>
          <option value="in_progress">בביצוע</option>
          <option value="needs_help">צריכה עזרה</option>
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
        
        <select 
          className="filter-select" 
          value={researchFilter} 
          onChange={(e) => setResearchFilter(e.target.value)}
        >
          <option value="all">סינון לפי מחקר</option>
          {researches.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
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
            <div style={{ textAlign: "center", padding: "20px" }}>טוען משימות...</div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px" }}>לא נמצאו משימות.</div>
          ) : (
            filteredTasks.map(task => (
              <div 
                key={task.id} 
                className={`task-row urgency-${task.urgency} ${selectedTask?.id === task.id ? 'selected' : ''}`}
                onClick={() => setSelectedTask(task)}
              >
                <div className="task-title">{task.title}</div>
                
                <div className="task-assignees">
                  {task.assignees.map((assignee, idx) => (
                    <div key={idx} className="assignee-item">
                      <img src={assignee.avatar} alt={assignee.name} className="assignee-avatar" />
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
                  {new Date(task.dueDate).toLocaleDateString('en-GB')}
                </div>
                
                <div className="task-status">
                  <span className={`badge badge-status-${task.status}`}>
                    {statusLabels[task.status]}
                  </span>
                </div>
                
                <div className="task-comments">
                  <div className="comments-indicator">
                    <FaCommentAlt size={18} style={{ color: "#333", transform: "scaleX(-1)" }} />
                    {task.commentsCount > 0 ? (
                      <span>{task.commentsCount} תגובות</span>
                    ) : (
                      <span>0 תגובות</span>
                    )}
                  </div>
                </div>
                
                <div className="more-options">
                  <button 
                    className="view-details-btn" 
                    onClick={(e) => { e.stopPropagation(); setDetailsTask(task); }}
                    title="לפרטים מלאים"
                  >
                    <FaExpandArrowsAlt /> פרטים
                  </button>
                </div>
              </div>
            ))
          )}
          
          <div style={{ textAlign: "center", color: "#888", marginTop: "10px", fontWeight: "bold", cursor: "pointer" }}>
            הוסף משימה...
          </div>
        </div>

        {selectedTask && (
          <TaskChatPanel task={selectedTask} user={user} onClose={() => setSelectedTask(null)} />
        )}
      </div>

      {detailsTask && (
        <TaskDetailsModal task={detailsTask} onClose={() => setDetailsTask(null)} />
      )}
    </div>
  );
};

// Subcomponent for the Chat Panel
const TaskChatPanel = ({ task, user, onClose }) => {
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!newComment.trim()) return;
      
      const added = await taskAPI.addComment(task.id, newComment, user);
      setComments([...comments, added]);
      setNewComment("");
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <div style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>אין תגובות עדיין.</div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="chat-message">
              <img src={c.author.avatar} alt={c.author.name} className="chat-avatar" />
              <div className="chat-content">
                <div className="chat-content-header">
                  <span className="chat-author-name">{c.author.name}</span>
                  <span className="chat-time">{c.timeString}</span>
                </div>
                <div className="chat-body">
                  {c.body}
                </div>
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
};

// Subcomponent for the Details Modal
const TaskDetailsModal = ({ task, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task.title}</h2>
          <button className="close-modal-btn" onClick={onClose} aria-label="סגור"><FaTimes /></button>
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
                {task.attachments.map(att => (
                  <div key={att.id} className="attachment-item">
                    <div className="attachment-info-group">
                      <FaFileAlt className="attachment-icon" />
                      <div className="attachment-details">
                        <span className="attachment-name">{att.name}</span>
                        <span className="attachment-size">{att.size}</span>
                      </div>
                    </div>
                    <button className="download-btn" title="הורד קובץ"><FaDownload /></button>
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
