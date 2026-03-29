/**
 * Single option button with conditional styles
 */

import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "../../../../../../lib/utils";

interface OptionButtonProps {
  option: string;
  index: number;
  cardId: string;
  isSelected: boolean;
  isCorrect: boolean;
  result: "correct" | "wrong" | "dontKnow" | null;
  isTrueFalse: boolean;
  normalizedCorrect: string;
  selectedOption: string | null;
  isSubmitting: boolean;
  onSelect: (option: string) => void;
  optionRef: (el: HTMLButtonElement | null) => void;
}

const getOptionStyles = (
  option: string,
  selectedOption: string | null,
  result: "correct" | "wrong" | "dontKnow" | null,
  isTrueFalse: boolean,
  normalizedCorrect: string,
  isSelected: boolean,
) => {
  const isVero =
    option.toLowerCase().includes("vero") ||
    option.toLowerCase().includes("true");
  const isFalso =
    option.toLowerCase().includes("falso") ||
    option.toLowerCase().includes("false");

  const baseStyles =
    "border-2 rounded-3xl transition-all duration-300 text-left group relative overflow-hidden flex flex-col items-center justify-center p-6 min-h-[180px] sm:min-h-[220px] shadow-sm";

  if (!selectedOption && !result) {
    if (isTrueFalse) {
      if (isVero)
        return cn(
          baseStyles,
          "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:shadow-emerald-500/10",
        );
      if (isFalso)
        return cn(
          baseStyles,
          "border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/40 hover:shadow-rose-500/10",
        );
    }
    return cn(
      baseStyles,
      "border-theme-default bg-theme-surface hover:bg-theme-surface-hover hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/5",
    );
  }

  const isCorrectOption =
    option.trim().toLowerCase() === normalizedCorrect;

  if (result === "dontKnow" && isCorrectOption) {
    return cn(
      baseStyles,
      "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-100 scale-[1.02] ring-4 ring-amber-500/20 shadow-xl shadow-amber-500/20",
    );
  }

  if (isCorrectOption) {
    return cn(
      baseStyles,
      "border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-100 scale-[1.02] shadow-xl shadow-emerald-500/20",
    );
  }

  if (isSelected) {
    return cn(
      baseStyles,
      "border-rose-500 bg-rose-500/20 text-rose-700 dark:text-rose-100 shadow-xl shadow-rose-500/20",
    );
  }

  return cn(
    baseStyles,
    "border-theme-subtle bg-theme-surface/30 text-theme-disabled scale-[0.98] opacity-40 grayscale",
  );
};

const getLabelStyles = (
  option: string,
  selectedOption: string | null,
  result: "correct" | "wrong" | "dontKnow" | null,
  normalizedCorrect: string,
) => {
  const baseStyles =
    "absolute top-3 left-3 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200";

  if (!selectedOption && !result) {
    return cn(
      baseStyles,
      "bg-theme-elevated text-theme-secondary border border-theme-default group-hover:border-primary-500/30 group-hover:text-primary-600 dark:group-hover:text-primary-400",
    );
  }

  const isCorrectOption =
    option.trim().toLowerCase() === normalizedCorrect;
  const isSelectedOption = option === selectedOption;

  if (result === "dontKnow" && isCorrectOption) {
    return cn(
      baseStyles,
      "bg-amber-500 text-white border border-amber-600",
    );
  }

  if (isCorrectOption) {
    return cn(
      baseStyles,
      "bg-emerald-500 text-white border border-emerald-600",
    );
  }

  if (isSelectedOption) {
    return cn(baseStyles, "bg-rose-500 text-white border border-rose-600");
  }

  return cn(
    baseStyles,
    "bg-theme-surface text-theme-disabled border border-theme-subtle",
  );
};

export const OptionButton: React.FC<OptionButtonProps> = ({
  option,
  index,
  cardId,
  isSelected,
  isCorrect,
  result,
  isTrueFalse,
  normalizedCorrect,
  selectedOption,
  isSubmitting,
  onSelect,
  optionRef,
}) => {
  const isVero =
    option.toLowerCase().includes("vero") ||
    option.toLowerCase().includes("true");

  return (
    <button
      key={`${cardId}-${index}`}
      ref={optionRef}
      onClick={() => onSelect(option)}
      disabled={!!selectedOption || isSubmitting || !!result}
      className={cn(
        getOptionStyles(
          option,
          selectedOption,
          result,
          isTrueFalse,
          normalizedCorrect,
          isSelected,
        ),
        "min-h-[140px] sm:min-h-[180px]",
      )}
    >
      {!isTrueFalse && (
        <div
          className={getLabelStyles(
            option,
            selectedOption,
            result,
            normalizedCorrect,
          )}
        >
          {String.fromCharCode(65 + index)}
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        {isTrueFalse && (
          <div
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-inner",
              isVero
                ? "bg-emerald-500/20 text-emerald-500"
                : "bg-rose-500/20 text-rose-500",
              (selectedOption || result) &&
                !isCorrect &&
                !isSelected &&
                "opacity-20 grayscale",
            )}
          >
            {isVero ? (
              <Check className="w-8 h-8" strokeWidth={4} />
            ) : (
              <X className="w-8 h-8" strokeWidth={4} />
            )}
          </div>
        )}

        <span
          className={cn(
            "text-xl font-black text-center sm:text-2xl tracking-tight transition-colors duration-300",
            (selectedOption || result) &&
              !isCorrect &&
              !isSelected &&
              "text-theme-disabled",
          )}
        >
          {option}
        </span>
      </div>

      {/* Feedback Icon Overlay */}
      <AnimatePresence>
        {(selectedOption || result === "dontKnow") && isCorrect && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/40 border-2 border-white dark:border-emerald-400"
          >
            <Check className="w-5 h-5 text-white" strokeWidth={3} />
          </motion.div>
        )}
        {isSelected && !isCorrect && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: 20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center shadow-xl shadow-rose-500/40 border-2 border-white dark:border-rose-400"
          >
            <X className="w-5 h-5 text-white" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};
