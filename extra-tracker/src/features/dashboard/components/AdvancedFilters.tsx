import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface AdvancedFiltersProps {
  days: number;
  setDays: (days: number) => void;
  status: string;
  setStatus: (status: string) => void;
  onApply?: () => void;
  onReset?: () => void;
  className?: string;
}

export const AdvancedFilters = ({
  days,
  setDays,
  status,
  setStatus,
  onApply,
  onReset,
  className,
}: AdvancedFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleReset = () => {
    setDays(30);
    setStatus('');
    onReset?.();
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-theme-primary">Filtri</h2>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-theme-secondary hover:text-theme-primary transition-colors"
        >
          <span>{isExpanded ? 'Mostra meno' : 'Mostra di più'}</span>
          <ChevronDown className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} size={16} />
        </button>
      </div>

      <div className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-all',
        isExpanded ? 'opacity-100' : 'opacity-80'
      )}>
        <div>
          <label className="block text-xs font-medium text-theme-muted uppercase tracking-wider mb-2">
            Periodo
          </label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full rounded-lg border border-theme-default bg-theme-card px-3 py-2 text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          >
            <option value={7}>Ultimi 7 giorni</option>
            <option value={30}>Ultimi 30 giorni</option>
            <option value={90}>Ultimi 90 giorni</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-theme-muted uppercase tracking-wider mb-2">
            Stato
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-theme-default bg-theme-card px-3 py-2 text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          >
            <option value="">Tutti gli eventi</option>
            <option value="success">Solo successi</option>
            <option value="error">Solo errori</option>
          </select>
        </div>

        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={onApply}
            className="flex-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            Applica
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-theme-default bg-theme-card hover:bg-theme-subtle text-theme-primary px-4 py-2 text-sm font-medium transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
