// src/shared/lib/toastStore.js
// Lightweight pub/sub store for custom toast notifications.

let listeners = [];
let toasts = [];
let nextId = 0;

const DURATION = 4200;

export const toastStore = {
  subscribe(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },

  emit(toast) {
    const id = ++nextId;
    const t = { id, exiting: false, ...toast };
    toasts = [...toasts, t];
    listeners.forEach((fn) => fn([...toasts]));
    if (!t.persistent) {
      setTimeout(() => toastStore.dismiss(id), DURATION);
    }
    return id;
  },

  update(id, patch) {
    toasts = toasts.map((t) => (t.id === id ? { ...t, ...patch } : t));
    listeners.forEach((fn) => fn([...toasts]));
    if (!patch.persistent && patch.persistent !== undefined) {
      setTimeout(() => toastStore.dismiss(id), DURATION);
    }
  },

  dismiss(id) {
    // Mark as exiting for animation, then remove after animation completes
    toasts = toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t));
    listeners.forEach((fn) => fn([...toasts]));
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      listeners.forEach((fn) => fn([...toasts]));
    }, 280);
  },

  getAll() {
    return toasts;
  },
};
