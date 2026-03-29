/**
 * Continue button component
 */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "../../../../../../lib/utils";
import type { QuizResult } from "../types";

interface ContinueButtonProps {
  canContinue: boolean;
  isExiting: boolean;
  result: QuizResult;
  onContinue: () => void;
}

export const ContinueButton: React.FC<ContinueButtonProps> = ({
  canContinue,
  isExiting,
  result,
  onContinue,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus when visible
  useEffect(() => {
    if (canContinue && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [canContinue]);

  const continueButtonText = result === "dontKnow" ? "Ho capito" : "Avanti";

  return (
    <button
      ref={buttonRef}
      onClick={canContinue ? onContinue : undefined}
      disabled={!canContinue || isExiting}
      className={cn(
        "min-w-[200px] flex items-center justify-center gap-2 px-8 py-4 rounded-[1.5rem] font-black text-lg transition-all duration-300 shadow-xl",
        canContinue
          ? "bg-primary-500 text-white shadow-primary-500/30 hover:bg-primary-400 hover:-translate-y-0.5 active:translate-y-0"
          : "bg-theme-surface border-2 border-theme-default text-theme-muted cursor-not-allowed opacity-50",
      )}
    >
      <span className="text-base text-white">
        {canContinue ? continueButtonText : "Seleziona una risposta"}
      </span>
      {canContinue && (
        <motion.div
          animate={{ x: [0, 3, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Check className="w-5 h-5 text-white" strokeWidth={3} />
        </motion.div>
      )}
    </button>
  );
};
