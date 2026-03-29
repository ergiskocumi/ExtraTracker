/**
 * Explanation card component
 */

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import type { QuizResult } from "../types";

interface ExplanationCardProps {
  result: QuizResult;
  explanation?: string;
  selectedExplanation?: string | null;
}

export const ExplanationCard: React.FC<ExplanationCardProps> = ({
  result,
  explanation,
  selectedExplanation,
}) => {
  if (!explanation && !selectedExplanation) return null;

  // Correct result - show explanation
  if (result === "correct" && explanation) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-8 py-6 border-2 rounded-[2rem] border-emerald-500/10 bg-emerald-500/5 shadow-inner"
      >
        <p className="text-base sm:text-lg md:text-xl leading-relaxed text-theme-primary text-center font-medium italic">
          <Quote className="w-4 h-4 inline-block -mt-2 mr-2 opacity-20 rotate-180" />
          {explanation}
          <Quote className="w-4 h-4 inline-block -mt-2 ml-2 opacity-20" />
        </p>
      </motion.div>
    );
  }

  // Wrong result - show distractor explanation + general explanation
  if (result === "wrong" && (selectedExplanation || explanation)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-8 py-6 border-2 rounded-[2rem] border-rose-500/10 bg-rose-500/5 shadow-inner"
      >
        <div className="space-y-3 text-center">
          {selectedExplanation && (
            <p className="text-base sm:text-lg md:text-xl leading-relaxed text-theme-primary font-medium italic">
              {selectedExplanation}
            </p>
          )}
          {explanation && (
            <p className="text-base sm:text-lg md:text-xl leading-relaxed text-theme-secondary font-medium italic opacity-80">
              {explanation}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  // Don't know result - show explanation
  if (result === "dontKnow" && explanation) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-8 py-6 border-2 rounded-[2rem] border-amber-500/10 bg-amber-500/5 shadow-inner"
      >
        <p className="text-base sm:text-lg md:text-xl leading-relaxed text-theme-primary text-center font-medium italic">
          {explanation}
        </p>
      </motion.div>
    );
  }

  return null;
};
