/**
 * Feedback panel component
 */

import { motion } from "framer-motion";
import { Check, X, HelpCircle } from "lucide-react";
import type { QuizResult } from "../types";

interface FeedbackPanelProps {
  result: QuizResult;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ result }) => {
  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        opacity: { duration: 0.2 },
      }}
      className="w-full max-w-4xl mx-auto mb-4 sm:mb-6"
    >
      {result === "correct" && (
        <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-[2rem] bg-emerald-500/10 border-2 border-emerald-500/20 shadow-lg shadow-emerald-500/5">
          <div className="p-2 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
            <Check className="w-6 h-6" strokeWidth={4} />
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight uppercase italic">
            Ottimo lavoro!
          </span>
        </div>
      )}

      {result === "wrong" && (
        <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-[2rem] bg-rose-500/10 border-2 border-rose-500/20 shadow-lg shadow-rose-500/5">
          <div className="p-2 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/20">
            <X className="w-6 h-6" strokeWidth={4} />
          </div>
          <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight uppercase italic">
            Non proprio...
          </span>
        </div>
      )}

      {result === "dontKnow" && (
        <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/20 shadow-lg shadow-amber-500/5">
          <div className="p-2 rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/20">
            <HelpCircle className="w-6 h-6" strokeWidth={4} />
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight uppercase italic">
            Ecco la soluzione
          </span>
        </div>
      )}
    </motion.div>
  );
};
