const ICONS = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };

export default function Toast({ type, message, onClose }) {
  return (
    <div className={`toast toast-${type}`} role="alert">
      <span className="toast-icon">{ICONS[type]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Close">×</button>
    </div>
  );
}
