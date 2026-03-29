/**
 * Question card with icon
 */

import { motion } from "framer-motion";
import { Quote, AlertCircle } from "lucide-react";
import { cn } from "../../../../../../lib/utils";

interface QuestionCardProps {
  question: string;
  usedFallbackOptions: boolean;
  hasResult: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  usedFallbackOptions,
  hasResult,
}) => {
  return (
    <motion.div
      layout
      transition={{
        layout: { type: "spring", stiffness: 200, damping: 30 },
      }}
      className={cn(
        "flex-none relative overflow-hidden border rounded-[2rem] border-theme-default bg-theme-elevated shadow-theme-lg p-6 sm:p-10 lg:p-12",
        !hasResult ? "mb-6 sm:mb-10" : "mb-4 sm:mb-6",
      )}
    >
      {/* Decorazione Quote - Più elegante e viola */}
      <div className="absolute top-4 left-6 text-purple-500/10">
        <Quote className="w-8 h-8 sm:w-12 sm:h-12 fill-current" />
      </div>

      <motion.h2
        layout="position"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-relaxed text-center break-words whitespace-pre-wrap text-theme-primary tracking-tight max-w-3xl mx-auto"
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        {question}
      </motion.h2>

      {/* Badge AI distractor fallback - Più compatto */}
      {usedFallbackOptions && (
        <motion.div
          layout="position"
          className="flex justify-center mt-4"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 uppercase tracking-widest">
            <AlertCircle className="w-3 h-3" />
            AI Generated
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};
