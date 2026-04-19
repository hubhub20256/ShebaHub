import React from "react";

const THEME_COLOR = "#1f2f63";

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background:
    "radial-gradient(circle at 50% 18%, rgba(56, 86, 163, 0.24), rgba(11, 19, 43, 0.72))",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2000,
  padding: "16px",
};

const cardStyle = {
  background:
    "linear-gradient(160deg, rgba(255, 255, 255, 0.99), rgba(244, 248, 255, 0.98))",
  padding: "30px 32px",
  borderRadius: "18px",
  border: "1px solid rgba(90, 116, 178, 0.2)",
  maxWidth: "440px",
  width: "90%",
  boxShadow: "0 26px 64px rgba(14, 24, 56, 0.36)",
  direction: "rtl",
  textAlign: "center",
};

const titleStyle = {
  fontSize: "1.2rem",
  fontWeight: 800,
  color: THEME_COLOR,
  marginBottom: "10px",
  letterSpacing: "0.01em",
};

const messageStyle = {
  fontSize: "0.97rem",
  color: "#46557f",
  marginBottom: "26px",
  lineHeight: 1.62,
  fontWeight: 500,
};

const actionsStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "10px",
};

const confirmBtnStyle = {
  minWidth: "112px",
  padding: "10px 20px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #e0415e, #be2f49)",
  color: "white",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "14px",
  boxShadow: "0 12px 22px rgba(173, 48, 77, 0.3)",
};

const cancelBtnStyle = {
  minWidth: "112px",
  padding: "10px 20px",
  borderRadius: "12px",
  background: "rgba(255, 255, 255, 0.9)",
  color: "#4b5a84",
  border: "1px solid rgba(88, 109, 162, 0.26)",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
        const focusable =
          dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
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
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === "function"
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      style={overlayStyle}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        ref={dialogRef}
        className="confirm-dialog-card"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="confirm-dialog-title-text"
          id="confirm-dialog-title"
          style={titleStyle}
        >
          {title}
        </div>
        <div className="confirm-dialog-message" style={messageStyle}>
          {message}
        </div>
        <div style={actionsStyle}>
          <button type="button" style={confirmBtnStyle} onClick={onConfirm}>
            {confirmText}
          </button>
          <button
            type="button"
            className="confirm-dialog-cancel-btn"
            style={cancelBtnStyle}
            onClick={onCancel}
            autoFocus
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
