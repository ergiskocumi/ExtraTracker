import * as React from 'react';
import { cn } from '../../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('animate-pulse rounded-xl', className)}
      style={{ backgroundColor: 'var(--bg-surface)' }}
      {...props}
    />
  ),
);

Skeleton.displayName = 'Skeleton';

export default Skeleton;
