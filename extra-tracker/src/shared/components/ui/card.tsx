import * as React from 'react';
import { cn } from '../../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Se true, aggiunge stili per card interattiva (hover, focus, cursor) */
  clickable?: boolean;
  /** Se true, la card è un elemento button (per accessibilità) */
  asButton?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, clickable, asButton, onClick, ...props }, ref) => {
    const clickableClasses = clickable
      ? 'cursor-pointer transition-colors duration-200 hover:shadow-theme-xl hover:border-primary-500/30 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-base active:translate-y-0 active:scale-[0.98]'
      : '';

    if (asButton && onClick) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          onClick={onClick as unknown as React.MouseEventHandler<HTMLButtonElement>}
          className={cn(
            'rounded-2xl border border-theme-default bg-theme-elevated shadow-theme-lg text-left w-full',
            clickableClasses,
            className,
          )}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border border-theme-default bg-theme-elevated shadow-theme-lg',
          clickable && onClick ? clickableClasses : '',
          className,
        )}
        onClick={onClick}
        {...props}
      />
    );
  },
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

