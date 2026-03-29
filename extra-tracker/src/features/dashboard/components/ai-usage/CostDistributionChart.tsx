import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { formatEur, formatEurCompact, formatInt } from '../../utils/aiUsageFormatters';

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16',
];

interface CostDistributionChartProps {
  data: { name: string; value: number; count: number }[];
  title: string;
  loading?: boolean;
}

export const CostDistributionChart = ({ data, title, loading }: CostDistributionChartProps) => {
  if (loading) {
    return (
      <div className="p-6 border bg-theme-surface border-theme-default rounded-xl h-80 animate-pulse">
        <div className="w-1/2 h-4 mb-4 rounded bg-theme-subtle" />
        <div className="h-56 rounded bg-theme-subtle" />
      </div>
    );
  }

  const totalValue = data.reduce((acc, item) => acc + item.value, 0);
  const hasData = data.length > 0 && totalValue > 0;

  return (
    <div className="h-full p-5 border bg-theme-surface border-theme-default rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-theme-primary">{title}</h3>
          <p className="text-xs text-theme-muted">Distribuzione costi</p>
        </div>
        {hasData && (
          <span className="text-xs font-medium text-theme-secondary">
            {data.length} categorie
          </span>
        )}
      </div>

      <div className="relative h-56">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                cornerRadius={6}
                stroke="none"
              >
                {data.map((_entry, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as { name: string; value: number; count: number };
                  const percentage = ((item.value / totalValue) * 100).toFixed(1);
                  return (
                    <div className="bg-theme-surface border border-theme-default rounded-lg shadow-lg p-3 min-w-[180px]">
                      <p className="mb-1 text-sm font-semibold text-theme-primary">{item.name}</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-theme-secondary">Costo:</span>
                          <span className="font-medium text-theme-primary">{formatEur(item.value)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-theme-secondary">Richieste:</span>
                          <span className="font-medium text-theme-primary">{formatInt(item.count)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-theme-secondary">Percentuale:</span>
                          <span className="font-medium text-primary-400">{percentage}%</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-theme-muted">
            <div className="w-16 h-16 mb-3 border-4 rounded-full border-theme-subtle border-t-primary-500 animate-spin" />
            <span className="text-sm">Nessun dato disponibile</span>
          </div>
        )}

        {hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-theme-muted uppercase tracking-wider">Totale</span>
            <span className="text-lg font-bold text-theme-primary">{formatEurCompact(totalValue)}</span>
          </div>
        )}
      </div>

      {hasData && (
        <div className="mt-3 grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto">
          {data.slice(0, 6).map((item, i) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="truncate text-theme-secondary" title={item.name}>
                {item.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
