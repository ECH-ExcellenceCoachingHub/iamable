'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToastStore } from '@/store/toast-store';
import { cn } from '@/lib/utils';

const icons = {
  success: <CheckCircle2 className="size-5 text-emerald-500" />,
  error: <XCircle className="size-5 text-red-500" />,
  info: <Info className="size-5 text-brand-500" />,
};

export const Toaster = () => {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 top-4 z-[200] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
            role={t.variant === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-xl shadow-slate-900/10 dark:shadow-black/40'
            )}
          >
            <span className="mt-0.5">{icons[t.variant]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{t.title}</p>
              {t.description && <p className="mt-0.5 text-sm text-muted">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="rounded-md p-1 text-subtle transition-colors hover:bg-surface-muted hover:text-foreground"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
