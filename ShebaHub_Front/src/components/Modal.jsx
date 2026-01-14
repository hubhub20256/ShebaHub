import React from 'react';

/**
 * Generic Modal Component
 * Displays content in a centered box with a backdrop overlay.
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - function to call when closing the modal (backdrop click or X button)
 * @param {string} title - Optional title for the modal header
 * @param {React.ReactNode} children - Content to display inside the modal
 */
export default function Modal({ isOpen, onClose, title, children, transparent = false }) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div 
        style={{
          ...styles.modal,
          ...(transparent ? styles.transparentModal : {})
        }}
        onClick={(e) => e.stopPropagation()} 
        role="dialog"
        aria-modal="true"
      >
        <button style={styles.closeBtn} onClick={onClose} aria-label="Close modal">
          &times;
        </button>
        
        {title && <h2 style={styles.title}>{title}</h2>}
        
        <div style={styles.content}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalPopIn {
          from { 
            opacity: 0;
            transform: scale(0.92) translateY(10px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  // ... existing overlay ...
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(2px)',
    animation: 'modalFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    direction: 'rtl',
  },
  modal: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    maxWidth: '90%',
    width: '500px', 
    position: 'relative',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    maxHeight: '90vh',
    overflowY: 'auto',
    animation: 'modalPopIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  transparentModal: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
    padding: 0,
    width: 'auto',
    maxWidth: '90%',
    border: 'none',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    overflow: 'visible', /* Allow button to float outside and prevent scrollbars */
    maxHeight: 'none',
    animation: 'modalPopIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  // ... rest of styles

  closeBtn: {
    position: 'absolute',
    top: '-12px',
    left: '-12px',
    background: 'white',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: 0,
    zIndex: 20,
    transition: 'transform 0.2s, background-color 0.2s',
  },
  title: {
    marginTop: 0,
    marginBottom: '16px',
    fontSize: '1.5rem',
    color: '#2C2C6C',
    textAlign: 'center',
  },
  content: {
    // Content container styles if needed
  }
};
