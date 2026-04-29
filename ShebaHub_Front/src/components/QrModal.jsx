import React, { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import "../styles/QrModal.css";

const QR_MODAL_THEME = "#1f2f63";
const DEFAULT_QR_SIZE = 210;

function QrModal({
  isOpen,
  url = "",
  onClose,
  title,
  description,
  size = DEFAULT_QR_SIZE,
  closeText = "Close",
  children,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape" && typeof onClose === "function") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
    }
  };

  return (
    <div className="qr-modal-overlay" onClick={handleClose}>
      <div
        className="qr-modal-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title ? <h3 className="qr-modal-title">{title}</h3> : null}
        {description ? (
          <p className="qr-modal-description">{description}</p>
        ) : null}
        {children}
        <div className="qr-modal-qr-wrap">
          <div className="qr-modal-qr-box">
            <QRCodeSVG
              value={url}
              size={size}
              bgColor="#ffffff"
              fgColor={QR_MODAL_THEME}
              level="M"
              includeMargin
            />
          </div>
        </div>
        {url ? (
          <a
            className="qr-modal-link"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {url}
          </a>
        ) : null}
        <div className="qr-modal-actions">
          <button
            type="button"
            className="qr-modal-close-btn"
            onClick={handleClose}
          >
            {closeText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default QrModal;
