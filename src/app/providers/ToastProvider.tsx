import { useCallback, useMemo, useState } from 'react';
import { ToastContext } from './toast-context';
import type { ToastVariant } from './toast-context';

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => removeToast(id), 3600);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[120] flex flex-col gap-2 w-[min(360px,90vw)]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md animate-fade-in ${
              toast.variant === 'success'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                : toast.variant === 'error'
                  ? 'bg-red-500/15 border-red-400/40 text-red-200'
                  : 'bg-neon-cyan/10 border-neon-cyan/30 text-text-primary'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-snug">{toast.message}</p>
              <button type="button" onClick={() => removeToast(toast.id)} className="text-text-muted hover:text-text-primary transition-colors">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
