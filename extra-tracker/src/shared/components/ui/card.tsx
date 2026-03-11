import * as React from 'react';
import { cn } from '../../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-theme-default bg-theme-elevated shadow-theme-lg',
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = 'Card';

export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-4 py-3 sm:px-5 sm:py-4 border-b border-theme-subtle', className)}
      {...props}
    />
  ),
);

CardHeader.displayName = 'CardHeader';

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-4 py-3 sm:px-5 sm:py-4', className)}
      {...props}
    />
  ),
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-4 py-3 sm:px-5 sm:py-4 border-t border-theme-subtle', className)}
      {...props}
    />
  ),
);

CardFooter.displayName = 'CardFooter';

