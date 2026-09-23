'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Accessibility, Eye, Keyboard, Text, X, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAccessibilityStore, type AccessibilityPreferences } from '@/store/accessibility-store';
import { useHydrated } from '@/lib/hooks';

const options: { key: keyof AccessibilityPreferences; label: string; description: string; icon: React.ReactNode }[] = [
  { key: 'largeText', label: 'Larger text', description: 'Increase text size across the app', icon: <Text /> },
  { key: 'highContrast', label: 'High contrast', description: 'Stronger text and borders', icon: <Eye /> },
  { key: 'reducedMotion', label: 'Reduce motion', description: 'Turn off animations and transitions', icon: <Zap /> },
  { key: 'keyboardNavigation', label: 'Enhanced focus', description: 'Bigger focus outline for keyboard users', icon: <Keyboard /> },
];

/** The list of accessibility switches, reusable in settings and the floating panel. */
export const AccessibilityOptions = ({ onChange }: { onChange?: (prefs: AccessibilityPreferences) => void }) => {
  const hydrated = useHydrated();
  const { preferences, togglePreference } = useAccessibilityStore();

  return (
    <div className="space-y-1">
      {options.map((o) => (
        <Switch
          key={o.key}
          icon={o.icon}
          label={o.label}
          description={o.description}
          checked={hydrated && preferences[o.key]}
          onCheckedChange={() => {
            togglePreference(o.key);
            onChange?.(useAccessibilityStore.getState().preferences);
          }}
        />
      ))}
    </div>
  );
};

/** Floating quick-access button for accessibility settings on public pages. */
export const AccessibilityToolbar = () => {
  const [open, setOpen] = useState(false);
  const resetPreferences = useAccessibilityStore((s) => s.resetPreferences);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div ref={ref} className="fixed bottom-5 right-5 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            id="a11y-panel"
            role="dialog"
            aria-label="Accessibility settings"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-16 right-0 w-[min(20rem,calc(100vw-2.5rem))] origin-bottom-right rounded-2xl border border-border bg-surface p-2 shadow-2xl shadow-slate-900/15 dark:shadow-black/50"
          >
            <div className="flex items-center justify-between px-3 pb-1 pt-2">
              <p className="text-sm font-semibold text-foreground">Accessibility</p>
              <button onClick={resetPreferences} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                Reset
              </button>
            </div>
            <AccessibilityOptions />
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex size-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition-transform hover:scale-105 active:scale-95 dark:bg-brand-500"
        aria-label={open ? 'Close accessibility settings' : 'Open accessibility settings'}
        aria-expanded={open}
        aria-controls="a11y-panel"
      >
        {open ? <X className="size-5" /> : <Accessibility className="size-6" />}
      </button>
    </div>
  );
};
