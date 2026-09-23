import React from 'react';
import { cn } from '@/lib/utils';

/** Brand mark: two speech bubbles (blue + green) meeting in the middle, echoing the logo artwork. */
export const LogoMark = ({ className }: { className?: string }) => {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 40 40" className={cn('size-9', className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1d58f1" />
          <stop offset="0.55" stopColor="#0284c7" />
          <stop offset="1" stopColor="#06ae4b" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id}-bg)`} />
      <path
        d="M9.5 13.5a4 4 0 0 1 4-4h6.5v15h-4.2l-4.1 3.6c-.5.4-1.2 0-1.2-.6v-3.1a3 3 0 0 1-1-2.2z"
        fill="#fff"
        fillOpacity="0.95"
      />
      <path
        d="M30.5 13.5a4 4 0 0 0-4-4H20v15h4.2l4.1 3.6c.5.4 1.2 0 1.2-.6v-3.1a3 3 0 0 0 1-2.2z"
        fill="#fff"
        fillOpacity="0.72"
      />
      <circle cx="15" cy="17" r="1.6" fill="#1d58f1" />
      <circle cx="25" cy="17" r="1.6" fill="#06ae4b" />
    </svg>
  );
};

export const Logo = ({ className, textClassName }: { className?: string; textClassName?: string }) => (
  <span className={cn('inline-flex items-center gap-2.5', className)}>
    <LogoMark />
    <span className={cn('font-display text-lg font-bold tracking-tight text-foreground', textClassName)}>
      Am<span className="text-gradient"> Able</span>
    </span>
  </span>
);
