import { toastStore } from "../lib/toastStore";

const ensureTrailingPeriod = (message) => {
  const text = String(message ?? "").trim();
  if (!text) return text;
  return text.replace(/[.!?]+$/u, "") + ".";
};

function show(type, message) {
  return toastStore.emit({ type, message: ensureTrailingPeriod(message) });
}

const toast = {
  success: (m) => show("success", m),
  error:   (m) => show("error", m),
  warning: (m) => show("warning", m),
  info:    (m) => show("info", m),

  promise: (promise, { loading, success, error }) => {
    const id = toastStore.emit({ type: "loading", message: loading, persistent: true });
    promise.then(
      (result) => {
        const msg = typeof success === "function" ? success(result) : success;
        toastStore.update(id, { type: "success", message: ensureTrailingPeriod(msg), persistent: false });
      },
      (err) => {
        const msg = typeof error === "function" ? error(err) : error;
        toastStore.update(id, { type: "error", message: ensureTrailingPeriod(msg), persistent: false });
      }
    );
    return promise;
  },
};

export function useToast() {
  return toast;
}

// Legacy exports — no-ops, kept for import compatibility
export function ToastProvider({ children }) {
  return children;
}

export function useToasts() {
  return { toasts: [], removeToast: () => {} };
}
