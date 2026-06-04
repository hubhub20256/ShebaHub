export default function LoadingSpinner({ text = "טוען..." }) {
  return (
    <div className="loading-spinner-container" dir="rtl">
      <div className="loading-spinner" />
      <p className="loading-spinner-text">{text}</p>
    </div>
  );
}
