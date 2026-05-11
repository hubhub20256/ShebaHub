/**
 * @fileoverview QrModal component - A reusable modal dialog for displaying QR codes.
 *
 * This component provides a polished, accessible modal interface for presenting
 * QR codes to users. It includes keyboard navigation (Escape to close), proper
 * ARIA attributes for accessibility, and customizable theming and sizing options.
 *
 * @example
 * <QrModal
 *   isOpen={true}
 *   url="https://example.com"
 *   title="Share This Link"
 *   description="Scan to visit our website"
 *   onClose={() => setIsOpen(false)}
 * />
 */

import React, { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import "../styles/QrModal.css";

/** @constant {string} - Primary theme color for QR code foreground */
const QR_MODAL_THEME = "#1f2f63";

/** @constant {number} - Default QR code size in pixels */
const DEFAULT_QR_SIZE = 210;

/**
 * QrModal - A modal component for displaying QR codes with rich customization options.
 *
 * Features:
 * - Keyboard navigation support (Escape key to close)
 * - Full accessibility support (role="dialog", aria-modal="true")
 * - Customizable QR code size and theme colors
 * - Optional title, description, and custom content
 * - Clickable URL link for direct navigation
 * - Click-outside-to-close overlay support
 *
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {string} [props.url=""] - URL to encode in the QR code
 * @param {Function} props.onClose - Callback function triggered when modal should close.
 *                                    Called when user clicks overlay, close button, or presses Escape
 * @param {string} [props.title] - Optional modal title displayed at the top
 * @param {string} [props.description] - Optional description text displayed below title
 * @param {number} [props.size=210] - QR code size in pixels (width and height)
 * @param {string} [props.closeText="Close"] - Text displayed on the close button
 * @param {React.ReactNode} [props.children] - Optional custom content rendered below description
 *
 * @returns {React.ReactElement|null} The rendered modal component, or null if not open
 */
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
