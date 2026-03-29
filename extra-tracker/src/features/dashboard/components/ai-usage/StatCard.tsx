import { cn } from '../../../../lib/utils';

export interface StatCardProps {
  title: string;
  value: string;
  subvalue?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  trend?: number;
  loading?: boolean;
}

const colorMap = {
  blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
  green: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
  amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
  red: 'from-red-500/20 to-red-600/5 border-red-500/30 text-red-400',
  purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
};

const bgColorMap = {
  blue: 'bg-blue-500/10',
  green: 'bg-emerald-500/10',
  amber: 'bg-amber-500/10',
  red: 'bg-red-500/10',
  purple: 'bg-purple-500/10',
};

export const StatCard = ({ title, value, subvalue, icon, color, trend, loading }: StatCardProps) => {
  if (loading) {
    return (
      <div className="p-4 border bg-theme-surface border-theme-default rounded-xl animate-pulse">
        <div className="w-1/2 h-4 mb-2 rounded bg-theme-subtle" />
        <div className="w-3/4 h-8 rounded bg-theme-subtle" />
      </div>
    );
  }

  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 transition-all hover:scale-[1.02]',
      colorMap[color]
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="mb-1 text-xs font-medium tracking-wider uppercase text-theme-muted">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-theme-primary">{value}</p>
          {subvalue && <p className="mt-1 text-xs truncate text-theme-secondary">{subvalue}</p>}
        </div>
        <div className={cn('p-2 rounded-lg', bgColorMap[color])}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn(
          'mt-2 text-xs font-medium inline-flex items-center gap-1',
          trend >= 0 ? 'text-emerald-400' : 'text-red-400'
        )}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          <span className="font-normal text-theme-muted">vs periodo prec.</span>
        </div>
      )}
    </div>
  );
};
