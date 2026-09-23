import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = ({ className, hover = false, ...props }: CardProps) => (
  <div
    className={cn(
      'rounded-2xl border border-border bg-surface shadow-xs',
      hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 dark:hover:shadow-black/30',
      className
    )}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1 p-5 pb-0 sm:p-6 sm:pb-0', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('flex items-center gap-2 text-base font-semibold text-foreground', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-muted', className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5 sm:p-6', className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center gap-2 border-t border-border px-5 py-4 sm:px-6', className)} {...props} />
);
