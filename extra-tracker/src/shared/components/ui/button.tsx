import * as React from 'react';
import { cn } from '../../../lib/utils';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'destructive'
  | 'subtle';

type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const baseClasses =
  'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed gap-2';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm shadow-primary-500/30 hover:shadow-primary-500/40 hover:-translate-y-px active:translate-y-0',
  secondary:
    'bg-theme-surface/60 text-theme-primary border border-theme-default hover:bg-theme-surface hover:border-primary-500/40',
  ghost:
    'bg-transparent text-theme-secondary hover:bg-theme-surface/60 border border-transparent',
  outline:
    'bg-transparent text-theme-primary border border-theme-default hover:border-primary-500/60 hover:bg-theme-surface/60',
  destructive:
    'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-sm shadow-rose-500/30 hover:shadow-rose-500/40',
  subtle:
    'bg-theme-surface/80 text-theme-secondary border border-theme-subtle hover:bg-theme-surface',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm sm:text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export default Button;

