import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Math.random().toString(36).slice(2);
      setToasts(prev => [...prev.slice(-4), { id, message, type }]);
      const timer = setTimeout(() => dismiss(id), 4000);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    return () => timers.current.forEach(t => clearTimeout(t));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 w-84 max-w-[calc(100vw-2.5rem)]">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-300/80 bg-white/95 text-stone-900 shadow-lg backdrop-blur-sm text-xs sm:text-sm font-sans"
            >
              {t.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-700 shrink-0" />
              ) : t.type === 'error' ? (
                <AlertCircle className="w-4 h-4 mt-0.5 text-red-700 shrink-0" />
              ) : (
                <Info className="w-4 h-4 mt-0.5 text-stone-700 shrink-0" />
              )}
              <span className="flex-1 leading-snug font-medium text-stone-850">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 p-0.5 text-stone-400 hover:text-stone-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
