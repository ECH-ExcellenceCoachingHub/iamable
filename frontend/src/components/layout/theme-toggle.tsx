'use client';

import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useUIStore, type Theme } from '@/store/ui-store';
import { useHydrated } from '@/lib/hooks';
import { cn } from '@/lib/utils';

const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };
const labels: Record<Theme, string> = { light: 'Light theme', dark: 'Dark theme', system: 'System theme' };

/** Compact icon button that cycles light → dark → system. */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const hydrated = useHydrated();
  const { theme, setTheme } = useUIStore();
  const current = hydrated ? theme : 'system';
  const Icon = current === 'light' ? Sun : current === 'dark' ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={() => setTheme(next[current])}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground',
        className
      )}
      aria-label={`${labels[current]} (click to change)`}
      title={labels[current]}
    >
      <Icon className="size-[18px]" />
    </button>
  );
};

/** Three-way segmented control for settings pages. */
export const ThemeSelector = () => {
  const hydrated = useHydrated();
  const { theme, setTheme } = useUIStore();
  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun /> },
    { value: 'dark', label: 'Dark', icon: <Moon /> },
    { value: 'system', label: 'System', icon: <Monitor /> },
  ];

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1 ring-1 ring-inset ring-border">
      {options.map((o) => {
        const active = hydrated && theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(o.value)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all [&_svg]:size-4',
              active ? 'bg-surface text-foreground shadow-sm ring-1 ring-border' : 'text-muted hover:text-foreground'
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
};
