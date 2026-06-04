export default function EmptyState({ message = "לא נמצאו תוצאות" }) {
  return (
    <div className="empty-state-container" dir="rtl">
      <p className="empty-state-text">{message}</p>
    </div>
  );
}
