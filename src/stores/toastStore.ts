import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  durationMs: number;
}

interface ToastStore {
  toasts: Toast[];
  show: (message: string, type?: ToastType, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

let _nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  show(message, type = 'info', durationMs = 4000) {
    const id = String(_nextId++);
    set((s) => ({ toasts: [...s.toasts, { id, type, message, durationMs }] }));

    // Auto-dismiss
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, durationMs);
  },

  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

/**
 * Convenience helpers — callable outside React components (e.g., in services).
 */
export const toast = {
  success: (message: string, durationMs?: number) =>
    useToastStore.getState().show(message, 'success', durationMs),
  error: (message: string, durationMs?: number) =>
    useToastStore.getState().show(message, 'error', durationMs ?? 6000),
  warning: (message: string, durationMs?: number) =>
    useToastStore.getState().show(message, 'warning', durationMs),
  info: (message: string, durationMs?: number) =>
    useToastStore.getState().show(message, 'info', durationMs),
};
