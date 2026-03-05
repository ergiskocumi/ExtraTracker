import { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from 'recharts';
import type { AIUsageBreakdownItem } from '../services/aiUsageDashboardService';
import { cn } from '../../../lib/utils';
import { Skeleton } from '../../../shared/components/ui/skeleton';

interface CostBreakdownProps {
  data: AIUsageBreakdownItem[];
  title: string;
  loading?: boolean;
  className?: string;
}

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
];

export const CostBreakdown = ({ data, title, loading = false, className }: CostBreakdownProps) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data
      .filter(item => item.totalCostUsd && item.totalCostUsd > 0)
      .sort((a, b) => (b.totalCostUsd || 0) - (a.totalCostUsd || 0))
      .slice(0, 8)
      .map(item => ({
        name: item.key || 'Unknown',
        value: item.totalCostUsd || 0,
        requests: item.requests,
      }));
  }, [data]);

  if (loading) {
    return (
      <div className={cn('rounded-2xl border border-theme-default bg-theme-surface p-5', className)}>
        <Skeleton className="h-4 w-1/3 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className={cn('rounded-2xl border border-theme-default bg-theme-surface p-5', className)}>
        <h3 className="text-base font-semibold text-theme-primary mb-3">{title}</h3>
        <div className="h-64 flex items-center justify-center text-theme-muted">
          Nessun dato di costo disponibile
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border border-theme-default bg-theme-surface p-5', className)}>
      <h3 className="text-base font-semibold text-theme-primary mb-4">{title}</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(17, 24, 39, 0.8)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(75, 85, 99, 0.5)',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
              formatter={(value: number, name: string, props: any) => {
                const requests = props?.payload?.requests || 0;
                return [
                  `$${value.toFixed(4)}`,
                  `${name} (${requests} richieste)`
                ];
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
