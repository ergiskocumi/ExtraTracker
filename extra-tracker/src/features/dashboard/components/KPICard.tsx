import { cn } from '../../../lib/utils';
import { Skeleton } from '../../../shared/components/ui/skeleton';

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  loading?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'border-theme-default bg-theme-surface',
  primary: 'border-primary-500/30 bg-primary-500/5',
  success: 'border-emerald-500/30 bg-emerald-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  danger: 'border-red-500/30 bg-red-500/5',
};

export const KPICard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  loading = false,
  variant = 'default',
}: KPICardProps) => {
  if (loading) {
    return (
      <div className="rounded-2xl border p-4 space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-2/3" />
        {subtitle && <Skeleton className="h-3 w-1/2" />}
      </div>
    );
  }

  const isPositive = trend && trend.value >= 0;

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-theme-muted">
            {title}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-theme-primary tracking-tight">
              {value}
            </p>
            {trend && (
              <span
                className={cn(
                  'text-xs font-semibold px-2 py-1 rounded-full',
                  isPositive
                    ? 'text-emerald-400 bg-emerald-500/15'
                    : 'text-red-400 bg-red-500/15'
                )}
              >
                {isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-theme-secondary">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="ml-4 text-theme-muted">{icon}</div>
        )}
      </div>
    </div>
  );
};
