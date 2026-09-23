import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'gradient' | 'white';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium select-none ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring) ' +
  'disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600',
  secondary:
    'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
  outline:
    'border border-border bg-surface text-foreground shadow-xs hover:bg-surface-muted hover:border-slate-300 dark:hover:border-slate-600',
  ghost: 'text-muted hover:bg-surface-muted hover:text-foreground',
  destructive: 'bg-red-600 text-white shadow-sm shadow-red-600/25 hover:bg-red-700',
  gradient:
    'bg-brand-gradient text-white shadow-lg shadow-brand-600/25 hover:shadow-xl hover:shadow-brand-600/30 hover:brightness-110',
  white: 'bg-white text-slate-900 shadow-sm hover:bg-slate-100',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm [&_svg]:size-4',
  md: 'h-11 px-4 text-sm [&_svg]:size-4',
  lg: 'h-12 px-6 text-base [&_svg]:size-5',
  icon: 'size-10 [&_svg]:size-5',
  'icon-sm': 'size-8 rounded-lg [&_svg]:size-4',
};

export function buttonVariants({ variant = 'primary', size = 'md', className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  /** Render as a Next.js link styled like a button. */
  href?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, href, type = 'button', ...props }, ref) => {
    const classes = buttonVariants({ variant, size, className });

    if (href) {
      return (
        <Link href={href} className={classes} aria-label={props['aria-label']} title={props.title}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} type={type} className={classes} disabled={disabled || isLoading} aria-busy={isLoading || undefined} {...props}>
        {isLoading && <Loader2 className="animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
