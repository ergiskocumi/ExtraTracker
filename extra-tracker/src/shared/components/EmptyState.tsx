/**
 * 📭 EMPTY STATE - Componente per stati vuoti consistenti
 *
 * 🎓 PRINCIPIO: User Experience
 * Fornisce un feedback visivo chiaro quando non ci sono dati da mostrare,
 * con azioni contestuali per aiutare l'utente a proseguire.
 *
 * 🎨 DESIGN:
 * - Icona grande e centrata per attirare l'attenzione
 * - Titolo chiaro che spiega la situazione
 * - Descrizione opzionale con maggiori dettagli
 * - Azione opzionale per risolvere lo stato vuoto
 */

import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './ui/button';

export interface EmptyStateProps {
  /** Icona Lucide da mostrare */
  icon: LucideIcon;
  /** Titolo principale */
  title: string;
  /** Descrizione opzionale */
  description?: string;
  /** Azione opzionale (bottone) */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  /** Classi CSS aggiuntive */
  className?: string;
  /** Dimensione del componente */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: {
    wrapper: 'p-6',
    icon: 'w-10 h-10 p-2',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    wrapper: 'p-8',
    icon: 'w-14 h-14 p-3',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    wrapper: 'p-12',
    icon: 'w-20 h-20 p-4',
    title: 'text-xl',
    description: 'text-base',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = 'md',
}) => {
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.wrapper,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Icona con sfondo glassmorphism */}
      <div
        className={cn(
          'rounded-2xl bg-theme-surface/80 border border-theme-default',
          'flex items-center justify-center mb-4',
          'text-theme-muted',
          sizes.icon
        )}
        aria-hidden="true"
      >
        <Icon className="w-full h-full" strokeWidth={1.5} />
      </div>

      {/* Titolo */}
      <h3
        className={cn(
          'font-semibold text-theme-primary mb-1',
          sizes.title
        )}
      >
        {title}
      </h3>

      {/* Descrizione */}
      {description && (
        <p
          className={cn(
            'text-theme-secondary max-w-sm mb-4',
            sizes.description
          )}
        >
          {description}
        </p>
      )}

      {/* Azione */}
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'primary'}
          size={size === 'sm' ? 'sm' : 'md'}
          className="mt-2"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
