import React from "react";

const THEME_COLOR = "#2C2C6C";

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2000,
};

const cardStyle = {
  background: "white",
  padding: "28px 32px",
  borderRadius: "16px",
  maxWidth: "400px",
  width: "90%",
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  direction: "rtl",
  textAlign: "center",
};

const titleStyle = {
  fontSize: "1.1rem",
  fontWeight: 700,
  color: THEME_COLOR,
  marginBottom: "12px",
};

const messageStyle = {
  fontSize: "0.95rem",
  color: "#444",
  marginBottom: "24px",
  lineHeight: 1.5,
};

const actionsStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "12px",
};

const confirmBtnStyle = {
  padding: "10px 24px",
  borderRadius: "20px",
  background: "#dc2626",
  color: "white",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};

const cancelBtnStyle = {
  padding: "10px 24px",
  borderRadius: "20px",
  background: "white",
  color: "#666",
  border: "1px solid #ddd",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ConfirmDialog({
  isOpen,
  title = "אישור",
  message = "האם את/ה בטוח/ה?",
  onConfirm,
  onCancel,
  confirmText = "מחק",
  cancelText = "ביטול",
}) {
  const dialogRef = React.useRef(null);
  const previousFocusRef = React.useRef(null);

  React.useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div ref={dialogRef} className="confirm-dialog-card" style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-title-text" id="confirm-dialog-title" style={titleStyle}>{title}</div>
        <div className="confirm-dialog-message" style={messageStyle}>{message}</div>
        <div style={actionsStyle}>
          <button style={confirmBtnStyle} onClick={onConfirm}>
            {confirmText}
          </button>
          <button className="confirm-dialog-cancel-btn" style={cancelBtnStyle} onClick={onCancel} autoFocus>
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
