import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../../lib/utils';

export const DistributionBar = ({
  new: newCount,
  learning,
  review,
  mastered,
  total,
}: {
  new: number;
  learning: number;
  review: number;
  mastered: number;
  total: number;
}): React.ReactElement | null => {
  const items = [
    { count: newCount, color: 'bg-sky-500', label: 'Nuove' },
    { count: learning, color: 'bg-amber-500', label: 'In studio' },
    { count: review, color: 'bg-orange-500', label: 'Ripasso' },
    { count: mastered, color: 'bg-emerald-500', label: 'Padroneggiate' },
  ].filter(item => item.count > 0);

  if (total === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-theme-base">
        {items.map((item, idx) => (
          <motion.div
            key={item.label}
            style={{ transformOrigin: 'left' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: item.count / total }}
            transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={cn('h-full w-full first:rounded-l-full last:rounded-r-full', item.color)}
            title={`${item.label}: ${item.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map(item => (
          <span key={item.label} className="flex items-center gap-1.5 text-xs text-theme-secondary">
            <span className={cn('h-1.5 w-1.5 rounded-full', item.color)} />
            {item.label} ({item.count})
          </span>
        ))}
      </div>
    </div>
  );
};
