import { cn } from '../../../lib/utils';

export const ResponsiveTableContainer = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={cn("overflow-x-auto w-full", className)}>
      {children}
    </div>
  );
};
