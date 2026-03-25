import { useToastStore, type Toast } from '../stores/toastStore';

const ICONS: Record<Toast['type'], string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const STYLES: Record<Toast['type'], string> = {
  success: 'bg-green-800 border-green-600 text-green-100',
  error: 'bg-red-900 border-red-700 text-red-100',
  warning: 'bg-yellow-800 border-yellow-600 text-yellow-100',
  info: 'bg-gray-800 border-gray-600 text-gray-100',
};

/**
 * Renders all active toasts in the bottom-right corner.
 * Mount once at the app root.
 */
export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-80 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg pointer-events-auto
            animate-in fade-in slide-in-from-bottom-4 duration-200
            ${STYLES[t.type]}`}
          role="alert"
        >
          <span className="text-lg leading-none mt-0.5 flex-shrink-0">{ICONS[t.type]}</span>
          <p className="flex-1 text-sm leading-snug">{t.message}</p>
          <button
            onClick={() => dismiss(t.id)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
