import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('skeleton rounded-lg', className)} aria-hidden="true" />
);

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
    <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-surface-muted text-subtle ring-1 ring-border [&_svg]:size-6">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-foreground">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) => (
  <div
    role="alert"
    className={cn(
      'flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-10 text-center dark:border-red-500/20 dark:bg-red-500/5',
      className
    )}
  >
    <div className="flex size-11 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
      <AlertTriangle className="size-5" />
    </div>
    <p className="max-w-md text-sm text-red-700 dark:text-red-300">{message}</p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw />
        Try again
      </Button>
    )}
  </div>
);

export const Alert = ({
  tone = 'danger',
  children,
  className,
}: {
  tone?: 'danger' | 'info' | 'success' | 'warning';
  children: React.ReactNode;
  className?: string;
}) => {
  const tones = {
    danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',
    info: 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200',
  };
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-xl border px-4 py-3 text-sm', tones[tone], className)}>
      {children}
    </div>
  );
};

export const Progress = ({
  value,
  className,
  barClassName,
  label,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  label?: string;
}) => {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-muted ring-1 ring-inset ring-border', className)}
    >
      <div className={cn('h-full rounded-full bg-brand-600 transition-[width] duration-500', barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
};
