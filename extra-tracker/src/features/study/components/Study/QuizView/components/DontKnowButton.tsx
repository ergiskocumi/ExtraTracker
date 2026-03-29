/**
 * Don't know button component
 */

import { HelpCircle } from "lucide-react";
import { cn } from "../../../../../../lib/utils";

interface DontKnowButtonProps {
  isSubmitting: boolean;
  onClick: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

export const DontKnowButton: React.FC<DontKnowButtonProps> = ({
  isSubmitting,
  onClick,
  buttonRef,
}) => {
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      disabled={isSubmitting}
      className={cn(
        "group flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 font-black transition-all hover:bg-amber-500/10 active:scale-95 disabled:opacity-50",
      )}
    >
      <HelpCircle className="w-5 h-5 transition-transform group-hover:rotate-12" />
      <span className="text-sm">Non lo so</span>
      <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 font-mono text-[10px] border border-amber-500/20">
        0
      </kbd>
    </button>
  );
};
