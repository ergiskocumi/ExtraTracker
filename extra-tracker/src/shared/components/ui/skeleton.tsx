import * as React from 'react';
import { cn } from '../../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('animate-pulse rounded-md bg-white/10', className)}
      {...props}
    />
  ),
);

Skeleton.displayName = 'Skeleton';

export default Skeleton;
