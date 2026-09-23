import React from 'react';
import { cn } from '@/lib/utils';

export const Table = ({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="overflow-x-auto scrollbar-thin">
    <table className={cn('w-full text-left text-sm', className)} {...props} />
  </div>
);

export const Th = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    scope="col"
    className={cn('whitespace-nowrap border-b border-border bg-surface-muted/60 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-subtle first:pl-6 last:pr-6', className)}
    {...props}
  />
);

export const Td = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('border-b border-border px-4 py-3.5 align-middle text-muted first:pl-6 last:pr-6', className)} {...props} />
);

export const Tr = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('transition-colors hover:bg-surface-muted/50 [&:last-child>td]:border-b-0', className)} {...props} />
);
