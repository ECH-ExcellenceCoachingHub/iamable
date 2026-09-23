import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/feedback';

export type StatTone = 'brand' | 'emerald' | 'violet' | 'amber' | 'rose' | 'sky';

const toneClasses: Record<StatTone, string> = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: StatTone;
  hint?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export const StatCard = ({ label, value, icon, tone = 'brand', hint, loading, className }: StatCardProps) => (
  <div className={cn('rounded-2xl border border-border bg-surface p-5 shadow-xs', className)}>
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-muted">{label}</p>
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]', toneClasses[tone])}>{icon}</span>
    </div>
    {loading ? (
      <Skeleton className="mt-3 h-8 w-24" />
    ) : (
      <p className="mt-2 truncate font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</p>
    )}
    {hint && <div className="mt-1 text-xs text-subtle">{hint}</div>}
  </div>
);
