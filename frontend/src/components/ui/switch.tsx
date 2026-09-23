'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/** A labelled on/off row. The whole row is the switch's click target. */
export const Switch = ({ checked, onCheckedChange, label, description, icon, disabled, className }: SwitchProps) => {
  const id = React.useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      aria-describedby={description ? `${id}-desc` : undefined}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-surface-muted disabled:opacity-50',
        className
      )}
    >
      {icon && (
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors [&_svg]:size-5',
            checked ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' : 'bg-surface-muted text-subtle'
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span id={`${id}-label`} className="block text-sm font-medium text-foreground">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="block text-xs text-muted">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-brand-600 dark:bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </span>
    </button>
  );
};
