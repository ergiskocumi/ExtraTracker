/**
 * Options grid component
 */

import { motion } from "framer-motion";
import { cn } from "../../../../../../lib/utils";
import { OptionButton } from "./OptionButton";

interface OptionsGridProps {
  options: string[];
  cardId: string;
  selectedOption: string | null;
  result: "correct" | "wrong" | "dontKnow" | null;
  isTrueFalse: boolean;
  isShaking: boolean;
  isSubmitting: boolean;
  normalizedCorrect: string;
  hasResult: boolean;
  onSelect: (option: string) => void;
  optionsRef: React.RefObject<(HTMLButtonElement | null)[]>;
}

export const OptionsGrid: React.FC<OptionsGridProps> = ({
  options,
  cardId,
  selectedOption,
  result,
  isTrueFalse,
  isShaking,
  isSubmitting,
  normalizedCorrect,
  hasResult,
  onSelect,
  optionsRef,
}) => {
  return (
    <motion.div
      layout
      transition={{
        layout: { type: "spring", stiffness: 200, damping: 30 },
      }}
      className={cn(
        "flex items-center justify-center",
        !hasResult ? "flex-1" : "flex-none",
      )}
    >
      <motion.div
        layout
        animate={isShaking ? { x: [-6, 6, -5, 5, -3, 3, 0] } : {}}
        transition={{
          x: { duration: 0.35, ease: "easeOut" },
          layout: { type: "spring", stiffness: 200, damping: 30 },
        }}
        className={cn(
          "grid gap-4 sm:gap-6 w-full max-w-5xl mx-auto",
          isTrueFalse
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2",
        )}
      >
        {options.map((option, index) => {
          const isCorrectOption =
            option.trim().toLowerCase() === normalizedCorrect;
          const isSelectedOption = option === selectedOption;

          return (
            <OptionButton
              key={`${cardId}-${index}`}
              option={option}
              index={index}
              cardId={cardId}
              isSelected={isSelectedOption}
              isCorrect={isCorrectOption}
              result={result}
              isTrueFalse={isTrueFalse}
              normalizedCorrect={normalizedCorrect}
              selectedOption={selectedOption}
              isSubmitting={isSubmitting}
              onSelect={onSelect}
              optionRef={(el) => {
                if (optionsRef.current) {
                  optionsRef.current[index] = el;
                }
              }}
            />
          );
        })}
      </motion.div>
    </motion.div>
  );
};
