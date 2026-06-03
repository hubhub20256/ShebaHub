import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { researchAPI } from "../services/api";

const POLL_INTERVAL = 5000;
const PEEK_POLL_INTERVAL = 30000;
const THEME_COLOR = "#2C2C6C";
const ACCENT_TEAL = "#6cd5bf";

const MENTION_TRIGGER_RE = /@([\w\u0590-\u05FF]*)$/;

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "עכשיו";
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
  return date.toLocaleDateString("he-IL") + " " + date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function renderBodyWithMentions(body, memberNames) {
  if (!body || !body.includes("@")) return body;

  // Build a regex that matches @all or @<known member name>
  const allNames = ["all", ...memberNames];
  // Sort by length descending so longer names match first
  allNames.sort((a, b) => b.length - a.length);
  const escaped = allNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp("@(" + escaped.join("|") + ")(?=[\\s]|$|[^\\w\\u0590-\\u05FF])", "g");

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="chat-mention" style={{
        color: "#4f46e5",
        background: "#eef2ff",
        padding: "1px 4px",
        borderRadius: 4,
        fontWeight: 600,
        fontSize: 13,
      }}>
        @{match[1]}
      </span>
    );
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex));
  }
  return parts.length > 0 ? parts : body;
}

export default function ResearchChat({ researchId, isOwner, canManageChat, isMentor, user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({ send_permission: "all", files_enabled: true });
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [hasOlder, setHasOlder] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Mention autocomplete state
  const [members, setMembers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null); // null = hidden
  const [mentionIndex, setMentionIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);
  const peekPollRef = useRef(null);
  const initialLoadDone = useRef(false);
  const lastSeenIdRef = useRef(null);

  const lastSeenLoaded = useRef(false);

  const canSend = settings.send_permission === "all" || isMentor || isOwner;
  const canManage = isOwner || canManageChat;

  // Build set of member names for mention rendering
  const memberNames = useMemo(() => {
    const names = new Set();
    members.forEach((m) => names.add(m.name));
    return names;
  }, [members]);

  // Filtered mention suggestions
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const allOption = { user_id: "__all__", name: "all", display: "all (כולם)", is_mentor: false };
    const list = [allOption, ...members.filter((m) => m.user_id !== String(user?.id))];
    if (!q) return list;
    return list.filter((m) => m.name.toLowerCase().includes(q) || (m.display || "").toLowerCase().includes(q));
  }, [mentionQuery, members, user]);

  // Mark seen helper
  const markSeen = useCallback((msgId) => {
    if (!msgId) return;
    const current = lastSeenIdRef.current || 0;
    if (msgId > current) {
      lastSeenIdRef.current = msgId;
      setHasUnread(false);
      researchAPI.markChatSeen(researchId, msgId).catch(() => {});
    }
  }, [researchId]);

  // Load initial messages, settings, and members
  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [msgs, s, mems] = await Promise.all([
        researchAPI.getChatMessages(researchId, { limit: 50 }),
        researchAPI.getChatSettings(researchId),
        researchAPI.getChatMembers(researchId),
      ]);
      const msgArr = Array.isArray(msgs) ? msgs : [];
      setMessages(msgArr);
      setSettings(s || { send_permission: "all", files_enabled: true });
      setHasOlder(msgArr.length >= 50);
      setMembers(Array.isArray(mems) ? mems : []);
      initialLoadDone.current = true;

      // Mark latest message as seen
      if (msgArr.length > 0) {
        markSeen(msgArr[msgArr.length - 1].id);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [researchId, markSeen]);

  // Poll for new messages (when chat is open)
  const poll = useCallback(async () => {
    if (!initialLoadDone.current) return;
    try {
      const latestId = messages.length > 0 ? messages[messages.length - 1].id : undefined;
      const newMsgs = await researchAPI.getChatMessages(researchId, latestId ? { after: latestId } : { limit: 50 });
      if (Array.isArray(newMsgs) && newMsgs.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = newMsgs.filter((m) => !existingIds.has(m.id));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
        // Mark the latest new message as seen (chat is open)
        markSeen(newMsgs[newMsgs.length - 1].id);
      }
    } catch {
      // silently fail
    }
  }, [researchId, messages, markSeen]);

  // Lightweight "peek" poll when chat is closed (checks for unread)
  const peekPoll = useCallback(async () => {
    try {
      const lastSeen = lastSeenIdRef.current;
      const params = lastSeen ? { after: lastSeen, limit: 1 } : { limit: 1 };
      const peek = await researchAPI.getChatMessages(researchId, params);
      if (Array.isArray(peek) && peek.length > 0) {
        // There's a new message we haven't seen
        const latestPeekId = peek[peek.length - 1].id;
        if (!lastSeen || latestPeekId > lastSeen) {
          setHasUnread(true);
        }
      }
    } catch {
      // silently fail
    }
  }, [researchId]);

  // On mount: fetch persisted last-seen ID, then start peek polling
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await researchAPI.getLastSeenChatMessage(researchId);
        if (!cancelled && data?.message_id) {
          lastSeenIdRef.current = data.message_id;
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) {
          lastSeenLoaded.current = true;
          // Do an initial peek now that we know what was last seen
          peekPoll();
        }
      }
    })();
    return () => { cancelled = true; };
  }, [researchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start/stop polling when chat opens/closes
  useEffect(() => {
    if (isOpen) {
      loadInitial();
      // Stop peek polling
      if (peekPollRef.current) clearInterval(peekPollRef.current);
    } else {
      initialLoadDone.current = false;
      // Only start peek polling after last-seen is loaded
      if (lastSeenLoaded.current) {
        peekPollRef.current = setInterval(peekPoll, PEEK_POLL_INTERVAL);
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (peekPollRef.current) clearInterval(peekPollRef.current);
    };
  }, [isOpen, loadInitial, peekPoll]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (isOpen && initialLoadDone.current) {
      pollRef.current = setInterval(poll, POLL_INTERVAL);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, poll]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Load older messages on scroll to top
  const handleScroll = async () => {
    if (!messagesAreaRef.current || loadingOlder || !hasOlder) return;
    if (messagesAreaRef.current.scrollTop < 50) {
      const oldestId = messages.length > 0 ? messages[0].id : undefined;
      if (!oldestId) return;
      setLoadingOlder(true);
      try {
        const older = await researchAPI.getChatMessages(researchId, { before: oldestId, limit: 50 });
        if (Array.isArray(older) && older.length > 0) {
          setMessages((prev) => [...older, ...prev]);
          setHasOlder(older.length >= 50);
        } else {
          setHasOlder(false);
        }
      } catch { /* ignore */ }
      finally { setLoadingOlder(false); }
    }
  };

  // Detect @mention trigger on input change
  const handleBodyChange = (e) => {
    const val = e.target.value;
    setBody(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const match = textBeforeCursor.match(MENTION_TRIGGER_RE);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  // Insert mention into body
  const insertMention = (member) => {
    const input = inputRef.current;
    if (!input) return;

    const cursorPos = input.selectionStart;
    const textBeforeCursor = body.slice(0, cursorPos);
    const match = textBeforeCursor.match(MENTION_TRIGGER_RE);
    if (!match) return;

    const mentionStart = cursorPos - match[0].length;
    const mentionText = `@${member.name} `;
    const newBody = body.slice(0, mentionStart) + mentionText + body.slice(cursorPos);
    setBody(newBody);
    setMentionQuery(null);

    // Set cursor after mention
    requestAnimationFrame(() => {
      const newPos = mentionStart + mentionText.length;
      input.setSelectionRange(newPos, newPos);
      input.focus();
    });
  };

  // Handle keyboard navigation in mention autocomplete
  const handleKeyDown = (e) => {
    if (mentionQuery !== null && mentionSuggestions.length > 0) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => (prev > 0 ? prev - 1 : mentionSuggestions.length - 1));
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev < mentionSuggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionSuggestions[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (mentionQuery !== null) return; // don't send while autocomplete is open
    if (sending) return;
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      const msg = await researchAPI.sendChatMessage(researchId, text, null);
      setMessages((prev) => [...prev, msg]);
      setBody("");
      setMentionQuery(null);
      markSeen(msg.id);
    } catch (err) {
      toast.error(err?.data?.detail || "שליחת ההודעה נכשלה");
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    try {
      const msg = await researchAPI.sendChatMessage(researchId, body.trim() || "", file);
      setMessages((prev) => [...prev, msg]);
      setBody("");
      markSeen(msg.id);
    } catch (err) {
      toast.error(err?.data?.detail || "שליחת הקובץ נכשלה");
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (msgId) => {
    try {
      await researchAPI.deleteChatMessage(researchId, msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      toast.error(err?.data?.detail || "מחיקה נכשלה");
    }
  };

  const handleTogglePin = async (msgId) => {
    try {
      const updated = await researchAPI.togglePinMessage(researchId, msgId);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, is_pinned: updated.is_pinned, pinned_by_name: updated.pinned_by_name } : m)));
    } catch (err) {
      toast.error(err?.data?.detail || "הצמדה נכשלה");
    }
  };

  const handleSaveSettings = async (newSettings) => {
    setSettingsLoading(true);
    try {
      const updated = await researchAPI.updateChatSettings(researchId, newSettings);
      setSettings(updated);
      setShowSettings(false);
    } catch (err) {
      toast.error(err?.data?.detail || "עדכון ההגדרות נכשל");
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="research-chat-container" style={{ marginTop: 32 }}>
      {/* Accordion Header */}
      <div
        className="accordion-header"
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: "relative" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: THEME_COLOR, margin: 0, borderRight: "4px solid #ef67a0", paddingRight: 8, lineHeight: "1" }}>
            {"\u05E6\u05F3\u05D0\u05D8 \u05DE\u05D7\u05E7\u05E8"}
          </h3>
          {hasUnread && !isOpen && (
            <span className="chat-unread-dot" style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ef4444",
              display: "inline-block",
              flexShrink: 0,
              animation: "chat-unread-pulse 2s ease-in-out infinite",
            }} />
          )}
        </div>
        <div style={{
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isOpen ? "rotate(0deg)" : "rotate(180deg)",
          display: "flex", marginTop: 4, color: "#6b7280",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" color={THEME_COLOR}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Chat Body */}
      <div style={{
        maxHeight: isOpen ? "600px" : "0",
        opacity: isOpen ? 1 : 0,
        overflow: "hidden",
        transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>טוען צ'אט...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", border: "1px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 12px 12px", background: "#fafbfc" }}>
            {/* Settings Bar */}
            {canManage && (
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 12px", borderBottom: "1px solid #f3f4f6" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: "4px 8px", borderRadius: 6, color: "#6b7280" }}
                  title="הגדרות צ'אט"
                >
                  {"\u2699\uFE0F"}
                </button>
              </div>
            )}

            {/* Settings Panel */}
            {showSettings && canManage && (
              <SettingsPanel
                settings={settings}
                loading={settingsLoading}
                onSave={handleSaveSettings}
                onClose={() => setShowSettings(false)}
              />
            )}

            {/* Pinned Message Banner */}
            {(() => {
              const pinned = messages.filter((m) => m.is_pinned);
              if (pinned.length === 0) return null;
              const latestPinned = pinned[pinned.length - 1];
              return (
                <div
                  className="chat-pinned-banner"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    background: "#fffbeb",
                    borderBottom: "1px solid #fbbf24",
                    direction: "rtl",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    const el = document.getElementById(`chat-msg-${latestPinned.id}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{"\uD83D\uDCCC"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color: THEME_COLOR, marginLeft: 6 }}>{latestPinned.sender_name}</span>
                    <span style={{ color: "#92400e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block", maxWidth: "70%", verticalAlign: "bottom" }}>
                      {latestPinned.body || latestPinned.file_name || "קובץ"}
                    </span>
                  </div>
                  {canManage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTogglePin(latestPinned.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#92400e", padding: "2px 6px", borderRadius: 4, fontWeight: 600, flexShrink: 0 }}
                      title="בטל הצמדה"
                    >
                      {"\u2715"}
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Messages Area */}
            <div
              ref={messagesAreaRef}
              className="chat-messages-area"
              onScroll={handleScroll}
              style={{ height: 380, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}
            >
              {loadingOlder && (
                <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, padding: 8 }}>טוען הודעות ישנות...</div>
              )}
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 60, fontSize: 14 }}>
                  {"\u05D0\u05D9\u05DF \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF. \u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05E9\u05D9\u05D7\u05D4!"}
                </div>
              )}
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  msg={msg}
                  isMine={msg.sender_id === user?.id}
                  canManage={canManage}
                  isOwner={isOwner}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                  memberNames={memberNames}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {canSend ? (
              <form onSubmit={handleSend} style={{ display: "flex", gap: 8, padding: "10px 16px", borderTop: "1px solid #e5e7eb", background: "white", borderRadius: "0 0 12px 12px", alignItems: "center", position: "relative" }}>
                {settings.files_enabled && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: "4px", color: "#6b7280", flexShrink: 0 }}
                      title="צרף קובץ"
                    >
                      {"\uD83D\uDCCE"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      style={{ display: "none" }}
                      onChange={handleFileSelect}
                    />
                  </>
                )}
                <div style={{ flex: 1, position: "relative" }}>
                  {/* Mention Autocomplete Dropdown */}
                  {mentionQuery !== null && mentionSuggestions.length > 0 && (
                    <div className="mention-autocomplete" style={{
                      position: "absolute",
                      bottom: "100%",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1px solid #d1d5db",
                      borderRadius: 8,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                      maxHeight: 180,
                      overflowY: "auto",
                      zIndex: 20,
                      marginBottom: 4,
                    }}>
                      {mentionSuggestions.map((m, i) => (
                        <div
                          key={m.user_id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            insertMention(m);
                          }}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 500,
                            background: i === mentionIndex ? "#eef2ff" : "transparent",
                            color: i === mentionIndex ? "#4338ca" : "#374151",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            direction: "rtl",
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>@{m.display || m.name}</span>
                          {m.is_mentor && (
                            <span style={{ fontSize: 10, color: "#4338ca", background: "#eef2ff", padding: "1px 5px", borderRadius: 6, border: "1px solid #c7d2fe" }}>
                              מנחה
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={body}
                    onChange={handleBodyChange}
                    onKeyDown={handleKeyDown}
                    placeholder="כתוב הודעה... (@ לתיוג)"
                    disabled={sending}
                    dir="rtl"
                    style={{
                      width: "100%",
                      padding: "8px 12px", borderRadius: 20, border: "1px solid #d1d5db",
                      fontSize: 14, outline: "none", fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                    maxLength={2000}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  style={{
                    background: ACCENT_TEAL, color: "white", border: "none", borderRadius: 20,
                    padding: "8px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                    opacity: sending || !body.trim() ? 0.5 : 1, flexShrink: 0, transition: "opacity 0.2s",
                  }}
                >
                  {sending ? "..." : "\u05E9\u05DC\u05D7"}
                </button>
              </form>
            ) : (
              <div style={{ padding: "12px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13, borderTop: "1px solid #e5e7eb", background: "#f9fafb", borderRadius: "0 0 12px 12px" }}>
                {"\u05D4\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA \u05DE\u05D5\u05D2\u05D1\u05DC\u05D5\u05EA \u05DC\u05DE\u05E0\u05D7\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatBubble({ msg, isMine, canManage, isOwner, onDelete, onTogglePin, memberNames }) {
  const [hover, setHover] = useState(false);
  const canDelete = isMine || isOwner || canManage;

  return (
    <div
      id={`chat-msg-${msg.id}`}
      className={`chat-message${isMine ? " chat-message--mine" : ""}${msg.is_pinned ? " chat-message--pinned" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: isMine ? "row-reverse" : "row",
        gap: 8,
        alignItems: "flex-start",
        maxWidth: "85%",
        alignSelf: isMine ? "flex-end" : "flex-start",
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
        background: "#f0fdf9", display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid #e8f5f2",
      }}>
        {msg.sender_avatar_url ? (
          <img src={msg.sender_avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: 14, color: "#94a3b8" }}>{"\uD83D\uDC64"}</span>
        )}
      </div>

      {/* Bubble */}
      <div style={{ minWidth: 0, maxWidth: "100%" }}>
        {/* Sender Info */}
        <div className="chat-sender-info" style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2, flexDirection: isMine ? "row-reverse" : "row" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: THEME_COLOR }}>{msg.sender_name}</span>
          {msg.sender_is_mentor && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#4338ca", background: "#eef2ff", padding: "1px 6px", borderRadius: 8, border: "1px solid #c7d2fe" }}>
              {"\u05DE\u05E0\u05D7\u05D4"}
            </span>
          )}
          <span style={{ fontSize: 10, color: "#9ca3af" }}>{timeAgo(msg.created_at)}</span>
        </div>

        {/* Message Body */}
        <div className="chat-bubble" style={{
          background: isMine ? "#e8f5f2" : "white",
          border: msg.is_pinned ? "1px solid #fbbf24" : "1px solid #e5e7eb",
          borderRadius: isMine ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
          padding: "8px 12px",
          fontSize: 14,
          lineHeight: 1.5,
          wordBreak: "break-word",
          position: "relative",
          direction: "rtl",
        }}>
          {msg.is_pinned && (
            <span style={{ position: "absolute", top: -8, left: isMine ? "auto" : -8, right: isMine ? -8 : "auto", fontSize: 14 }}>
              {"\uD83D\uDCCC"}
            </span>
          )}
          {msg.body && <div>{renderBodyWithMentions(msg.body, memberNames)}</div>}
          {msg.file_name && msg.file_url && (
            <a
              href={msg.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="chat-file-link"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: msg.body ? 6 : 0, fontSize: 13, color: "#0369a1", textDecoration: "none", fontWeight: 500 }}
            >
              {"\uD83D\uDCC4"} {msg.file_name}
            </a>
          )}

          {/* Hover Actions */}
          {hover && (canDelete || canManage) && (
            <div style={{
              position: "absolute", top: -10, left: isMine ? 0 : "auto", right: isMine ? "auto" : 0,
              display: "flex", gap: 2, background: "white", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              padding: "2px 4px", zIndex: 5,
            }}>
              {canManage && (
                <button
                  onClick={() => onTogglePin(msg.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 4px", borderRadius: 4 }}
                  title={msg.is_pinned ? "בטל הצמדה" : "הצמד"}
                >
                  {msg.is_pinned ? "\u274C" : "\uD83D\uDCCC"}
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(msg.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 4px", borderRadius: 4 }}
                  title="מחק"
                >
                  {"\uD83D\uDDD1\uFE0F"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ settings, loading, onSave, onClose }) {
  const [sendPermission, setSendPermission] = useState(settings.send_permission);
  const [filesEnabled, setFilesEnabled] = useState(settings.files_enabled);

  useEffect(() => {
    setSendPermission(settings.send_permission);
    setFilesEnabled(settings.files_enabled);
  }, [settings]);

  return (
    <div className="chat-settings-panel" style={{
      padding: "12px 16px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: THEME_COLOR }}>{"\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05E6\u05F3\u05D0\u05D8"}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#6b7280" }}>{"\u2715"}</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }} dir="rtl">
          {"\u05DE\u05D9 \u05D9\u05DB\u05D5\u05DC \u05DC\u05E9\u05DC\u05D5\u05D7 \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA:"}
          <select
            value={sendPermission}
            onChange={(e) => setSendPermission(e.target.value)}
            style={{ marginRight: 8, padding: "4px 8px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
          >
            <option value="all">{"\u05DB\u05DC \u05D4\u05D7\u05D1\u05E8\u05D9\u05DD"}</option>
            <option value="mentors_only">{"\u05DE\u05E0\u05D7\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3"}</option>
          </select>
        </label>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 6 }} dir="rtl">
          <input
            type="checkbox"
            checked={filesEnabled}
            onChange={(e) => setFilesEnabled(e.target.checked)}
            style={{ accentColor: ACCENT_TEAL }}
          />
          {"\u05D0\u05E4\u05E9\u05E8 \u05E9\u05D9\u05EA\u05D5\u05E3 \u05E7\u05D1\u05E6\u05D9\u05DD"}
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={() => onSave({ send_permission: sendPermission, files_enabled: filesEnabled })}
          disabled={loading}
          style={{
            background: ACCENT_TEAL, color: "white", border: "none", borderRadius: 8,
            padding: "6px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "..." : "\u05E9\u05DE\u05D5\u05E8"}
        </button>
      </div>
    </div>
  );
}
