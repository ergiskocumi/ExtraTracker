import * as React from 'react';
import { cn } from '../../../lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-xl border border-theme-default bg-theme-surface/60 px-3 py-2 text-sm text-theme-primary shadow-sm outline-none',
        'placeholder:text-theme-muted focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-theme-base',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-theme-default bg-theme-surface/60 px-3 py-2 text-sm text-theme-primary shadow-sm outline-none',
        'placeholder:text-theme-muted focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-theme-base',
        'disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] resize-y',
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';

