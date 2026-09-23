import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'violet';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-muted ring-border',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/25',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25',
  danger: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/25',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/25',
};

const dots: Record<BadgeTone, string> = {
  neutral: 'bg-slate-400',
  brand: 'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  violet: 'bg-violet-500',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export const Badge = ({ tone = 'neutral', dot, className, children, ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
      tones[tone],
      className
    )}
    {...props}
  >
    {dot && <span className={cn('size-1.5 rounded-full', dots[tone])} aria-hidden="true" />}
    {children}
  </span>
);
