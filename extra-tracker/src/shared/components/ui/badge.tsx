import * as React from 'react';
import { cn } from '../../../lib/utils';

type BadgeVariant = 'neutral' | 'primary' | 'accent' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral:
    'bg-theme-surface text-theme-secondary border border-theme-subtle',
  primary:
    'bg-primary-500/10 text-primary-600 dark:text-primary-300 border border-primary-500/30',
  accent:
    'bg-accent-500/10 text-accent-700 dark:text-accent-300 border border-accent-500/30',
  outline:
    'bg-transparent text-theme-secondary border border-theme-default',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);

Badge.displayName = 'Badge';

