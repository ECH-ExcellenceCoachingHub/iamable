import React from 'react';
import { cn } from '@/lib/utils';

const fieldBase =
  'w-full rounded-xl border border-border bg-surface text-foreground placeholder:text-subtle shadow-xs ' +
  'transition-[border-color,box-shadow] duration-150 outline-none ' +
  'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-surface-muted';

const errorClasses = 'border-red-500 focus:border-red-500 focus:ring-red-500/15';

interface FieldWrapperProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export const Field = ({ id, label, hint, error, className, children }: FieldWrapperProps) => (
  <div className={cn('w-full', className)}>
    {label && (
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
    )}
    {children}
    {error ? (
      <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
        {hint}
      </p>
    ) : null}
  </div>
);

function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, wrapperClassName, label, hint, error, icon, trailing, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    return (
      <Field id={inputId} label={label} hint={hint} error={error} className={wrapperClassName}>
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle [&_svg]:size-[18px]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy(inputId, error, hint)}
            className={cn(fieldBase, 'h-11 px-3.5 text-sm', icon && 'pl-10', trailing && 'pr-11', error && errorClasses, className)}
            {...props}
          />
          {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
        </div>
      </Field>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, wrapperClassName, label, hint, error, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    return (
      <Field id={inputId} label={label} hint={hint} error={error} className={wrapperClassName}>
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy(inputId, error, hint)}
          className={cn(fieldBase, 'min-h-28 resize-y px-3.5 py-3 text-sm leading-relaxed', error && errorClasses, className)}
          {...props}
        />
      </Field>
    );
  }
);
Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, label, hint, error, id, children, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    return (
      <Field id={inputId} label={label} hint={hint} error={error} className={wrapperClassName}>
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy(inputId, error, hint)}
            className={cn(fieldBase, 'h-11 appearance-none pl-3.5 pr-10 text-sm', error && errorClasses, className)}
            {...props}
          >
            {children}
          </select>
          <svg
            className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </Field>
    );
  }
);
Select.displayName = 'Select';
