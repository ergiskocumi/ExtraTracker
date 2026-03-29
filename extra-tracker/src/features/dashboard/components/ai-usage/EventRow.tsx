import { CheckCircle2, XCircle } from 'lucide-react';
import type { AIUsageEvent } from '../../services/aiUsageDashboardService';
import { cn } from '../../../../lib/utils';
import { formatDateTime, formatEurCompact, formatInt } from '../../utils/aiUsageFormatters';

interface EventRowProps {
  event: AIUsageEvent;
}

export const EventRow = ({ event }: EventRowProps) => {
  const isError = event.status === 'error';

  return (
    <tr className="text-sm transition-colors border-b border-theme-subtle/50 hover:bg-theme-subtle/20">
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="font-medium text-theme-primary">{formatDateTime(event.createdAt)}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-col">
          <span className="font-medium text-theme-primary">{event.mode}</span>
          <span className="text-xs text-theme-secondary">{event.feature}</span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-theme-card border border-theme-default text-theme-primary">
          {event.model?.slice(0, 20) || '-'}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        <span className="text-theme-secondary">{formatInt(event.promptLengthChars)}</span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex flex-col items-end">
          <span className="font-medium text-blue-400 tabular-nums">{formatInt(event.inputTokens)}</span>
          <span className="text-[10px] text-theme-muted">€{event.inputCostUsd.toFixed(4)}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex flex-col items-end">
          <span className="font-medium text-emerald-400 tabular-nums">{formatInt(event.outputTokens)}</span>
          <span className="text-[10px] text-theme-muted">€{event.outputCostUsd.toFixed(4)}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="font-semibold text-theme-primary tabular-nums">{formatInt(event.totalTokens)}</span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex flex-col items-end">
          <span className="font-semibold text-theme-primary tabular-nums">{formatEurCompact(event.totalCostUsd)}</span>
          {event.costEstimated && <span className="text-[10px] text-amber-400">est.</span>}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
          isError
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        )}>
          {isError ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
          {event.status}
        </span>
      </td>
    </tr>
  );
};
