/**
 * ⏳ LOADING STATE - Componente per stati di caricamento consistenti
 *
 * 🎓 PRINCIPIO: Consistency
 * Fornisce uno spinner di caricamento uniforme in tutta l'app
 * con dimensioni, testo e layout configurabili.
 */

import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LoadingStateProps {
  /** Dimensione dello spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Testo opzionale da mostrare sotto lo spinner */
  text?: string;
  /** Se true, occupa l'intero viewport (fullscreen overlay) */
  fullScreen?: boolean;
  /** Classi CSS aggiuntive */
  className?: string;
  /** Variante di stile */
  variant?: 'default' | 'inline' | 'overlay';
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'md',
  text,
  fullScreen = false,
  className,
  variant = 'default',
}) => {
  const content = (
    <>
      <Loader2
        className={cn(
          'animate-spin text-primary-500',
          sizeClasses[size],
          variant === 'inline' && 'inline-block mr-2'
        )}
        aria-hidden="true"
      />
      {text && (
        <span
          className={cn(
            'text-theme-secondary font-medium',
            textSizeClasses[size],
            variant === 'inline' ? 'inline' : 'mt-3 block'
          )}
        >
          {text}
        </span>
      )}
    </>
  );

  // Fullscreen overlay mode
  if (fullScreen) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex flex-col items-center justify-center',
          'bg-theme-base/80 backdrop-blur-sm',
          className
        )}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {content}
        <span className="sr-only">Caricamento in corso...</span>
      </div>
    );
  }

  // Inline mode (per integrazione in form/buttons)
  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-center', className)} role="status" aria-busy="true">
        {content}
        <span className="sr-only">Caricamento in corso...</span>
      </span>
    );
  }

  // Default centered mode
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {content}
      <span className="sr-only">Caricamento in corso...</span>
    </div>
  );
};

export default LoadingState;
