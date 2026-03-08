import Toast from "./Toast";
import { useToasts } from "./useToast";

export default function ToastContainer() {
  const { toasts, removeToast } = useToasts();
  if (!toasts.length) return null;
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
