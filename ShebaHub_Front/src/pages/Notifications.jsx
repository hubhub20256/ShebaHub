import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaUserPlus, FaCheckCircle, FaTimesCircle, FaPaperPlane, FaReply, FaAt } from "react-icons/fa";
import { messagesAPI } from "../services/api";
import { useNotifications } from "../context/NotificationContext";
import usePageTitle from "../hooks/usePageTitle";
import "../styles/Notifications.css";

const NOTIFICATION_ICONS = {
  contact: { icon: FaEnvelope, className: "notif-icon--contact" },
  application_new: { icon: FaUserPlus, className: "notif-icon--new" },
  application_approved: { icon: FaCheckCircle, className: "notif-icon--approved" },
  application_rejected: { icon: FaTimesCircle, className: "notif-icon--rejected" },
  application_invited: { icon: FaPaperPlane, className: "notif-icon--invited" },
  chat_mention: { icon: FaAt, className: "notif-icon--mention" },
};

const Notifications = () => {
  usePageTitle("הודעות");
  const navigate = useNavigate();
  const { clearCount, refreshCount } = useNotifications();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const markedAllRef = useRef(false);

  // Reply state
  const [replyTo, setReplyTo] = useState(null); // message object being replied to
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    messagesAPI
      .getInbox()
      .then((data) => {
        setMessages(data);
        // Mark all as read in background on first open
        if (!markedAllRef.current && data.some((m) => !m.is_read)) {
          markedAllRef.current = true;
          clearCount();
          messagesAPI.markAllRead().then(() => {
            // Refresh count from server to get accurate unread count
            refreshCount();
          }).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clearCount]);

  const handleClick = (msg) => {
    if (msg.research_id) {
      navigate(`/research/${msg.research_id}`);
    } else {
      setExpandedId((prev) => (prev === msg.id ? null : msg.id));
    }
  };

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleReplyOpen = (msg, e) => {
    e.stopPropagation();
    setReplyTo(msg);
    setReplySubject(`השב: ${msg.subject}`);
    setReplyBody("");
  };

  const handleReplySend = async () => {
    if (!replySubject.trim() || !replyBody.trim() || !replyTo?.senderId) return;
    setReplyLoading(true);
    try {
      await messagesAPI.contactUser(replyTo.senderId, replySubject, replyBody);
      showToast("success", "ההודעה נשלחה בהצלחה!");
      setReplyTo(null);
      setReplySubject("");
      setReplyBody("");
      // Refresh inbox and notification count after sending reply
      messagesAPI.getInbox().then((data) => setMessages(data)).catch(() => {});
      refreshCount();
    } catch (err) {
      const errMsg = err?.data?.message || err?.data?.detail || "";
      const isEmailNotVerified =
        err?.status === 403 &&
        typeof errMsg === "string" &&
        errMsg.toLowerCase().includes("verify your email");
      showToast(
        "error",
        isEmailNotVerified
          ? "יש לאמת את כתובת האימייל לפני שליחת הודעה. בדוק/י את תיבת הדואר הנכנס."
          : errMsg || "שגיאה בשליחת ההודעה"
      );
    } finally {
      setReplyLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString("he-IL", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="notifications-page" dir="rtl">
      <h1 className="notifications-title">הודעות</h1>

      {loading ? (
        <p className="notifications-loading">טוען...</p>
      ) : messages.length === 0 ? (
        <p className="notifications-empty">אין הודעות</p>
      ) : (
        <div className="notifications-list">
          {messages.map((msg) => {
            const typeInfo = NOTIFICATION_ICONS[msg.notification_type] || NOTIFICATION_ICONS.contact;
            const IconComponent = typeInfo.icon;
            return (
              <div
                key={msg.id}
                className={`notification-item ${!msg.is_read ? "unread" : ""} ${expandedId === msg.id ? "expanded" : ""}`}
                onClick={() => handleClick(msg)}
              >
                <div className="notification-header">
                  <div className="notification-meta">
                    {!msg.is_read && <span className="notification-dot" />}
                    <span className={`notif-icon ${typeInfo.className}`}>
                      <IconComponent />
                    </span>
                    {msg.senderProfileId ? (
                      <Link
                        to={`/user/${msg.senderProfileId}`}
                        className="notification-sender notification-sender-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {msg.senderName || "משתמש"}
                      </Link>
                    ) : (
                      <span className="notification-sender">{msg.senderName || "משתמש"}</span>
                    )}
                    {msg.researchName && (
                      <span className="notification-research">· {msg.researchName}</span>
                    )}
                  </div>
                  <span className="notification-date">{formatDate(msg.created_at)}</span>
                </div>
                <div className="notification-subject">{msg.subject}</div>
                {expandedId === msg.id && (
                  <>
                    <div className="notification-body">{msg.body}</div>
                    {msg.notification_type === "contact" && msg.senderId && (
                      <div className="notification-reply-row">
                        <button
                          className="notification-reply-btn"
                          onClick={(e) => handleReplyOpen(msg, e)}
                        >
                          <FaReply style={{ marginLeft: 4 }} /> השב
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className={`notif-toast notif-toast--${toast.type}`}>
          {toast.text}
          <button className="notif-toast-close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* Reply Modal */}
      {replyTo && (
        <div className="invite-modal-overlay" onClick={() => setReplyTo(null)}>
          <div className="invite-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <h3>השב ל{replyTo.senderName || "משתמש"}</h3>
            <input
              type="text"
              placeholder="נושא"
              value={replySubject}
              onChange={(e) => setReplySubject(e.target.value)}
              className="notif-reply-input"
            />
            <textarea
              placeholder="תוכן ההודעה"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={5}
              className="notif-reply-textarea"
            />
            <div className="invite-modal-actions">
              <button className="invite-cancel-btn" onClick={() => setReplyTo(null)}>
                ביטול
              </button>
              <button
                className="invite-confirm-btn"
                onClick={handleReplySend}
                disabled={!replySubject.trim() || !replyBody.trim() || replyLoading}
              >
                {replyLoading ? "שולח..." : "שלח הודעה"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
