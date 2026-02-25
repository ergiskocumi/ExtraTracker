/**
 * 💀 QUESTIONS SKELETON - Skeleton loading per domande in estrazione
 * 
 * Mostra skeleton animati durante l'estrazione delle domande,
 * con transizione smooth quando arrivano le domande reali.
 */

import { motion, AnimatePresence } from 'framer-motion';
import type { QuestionsSkeletonProps, StreamingSkeletonProps } from './ExamSolverModal.types';

// Re-export for convenience
export type { QuestionsSkeletonProps, StreamingSkeletonProps };

// ============================================
// COMPONENT
// ============================================

export const QuestionsSkeleton: React.FC<QuestionsSkeletonProps> = ({
    count = 5,
    isLoading,
    onStreamingComplete,
}) => {
    // Larghezze variabili per sembrare realistici
    const widths = ['70%', '85%', '60%', '90%', '75%', '80%', '65%', '88%', '72%', '82%'];

    return (
        <div className="space-y-2">
            {Array.from({ length: count }).map((_, idx) => {
                const width = widths[idx % widths.length];
                const delay = idx * 0.1; // Stagger delay

                return (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: isLoading ? [0.5, 1, 0.5] : 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{
                            opacity: {
                                duration: 1.5,
                                repeat: isLoading ? Infinity : 0,
                                ease: 'easeInOut',
                                delay,
                            },
                            y: { duration: 0.3, delay },
                        }}
                        className="p-4 rounded-xl bg-theme-surface border border-theme-default"
                    >
                        <div className="space-y-2">
                            {/* Prima riga (più lunga) */}
                            <motion.div
                                animate={{
                                    opacity: isLoading ? [0.5, 1, 0.5] : 0,
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: isLoading ? Infinity : 0,
                                    ease: 'easeInOut',
                                    delay: delay + 0.1,
                                }}
                                className="h-4 rounded bg-theme-default"
                                style={{ width }}
                            />
                            {/* Seconda riga (più corta, opzionale) */}
                            {idx % 3 !== 0 && (
                                <motion.div
                                    animate={{
                                        opacity: isLoading ? [0.5, 1, 0.5] : 0,
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: isLoading ? Infinity : 0,
                                        ease: 'easeInOut',
                                        delay: delay + 0.2,
                                    }}
                                    className="h-4 rounded bg-theme-default"
                                    style={{ width: '50%' }}
                                />
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

// ============================================
// STREAMING SKELETON (Variante Avanzata)
// ============================================

export const StreamingSkeleton: React.FC<StreamingSkeletonProps> = ({
    totalCount,
    currentCount,
    questions,
    onComplete,
}) => {
    const widths = ['70%', '85%', '60%', '90%', '75%', '80%', '65%', '88%', '72%', '82%'];
    const remainingSkeletons = Math.max(0, totalCount - currentCount);

    return (
        <div className="space-y-2">
            {/* Domande già arrivate */}
            <AnimatePresence mode="popLayout">
                {questions.map((question, idx) => (
                    <motion.div
                        key={`real-${idx}`}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{
                            duration: 0.3,
                            delay: idx * 0.05,
                        }}
                        className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
                    >
                        <div className="flex items-start gap-3">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: idx * 0.05 + 0.2, type: 'spring' }}
                                className="flex-shrink-0 mt-0.5"
                            >
                                <div className="w-5 h-5 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: idx * 0.05 + 0.3 }}
                                        className="w-2 h-2 rounded-full bg-emerald-400"
                                    />
                                </div>
                            </motion.div>
                            <div className="flex-1">
                                <p className="text-sm text-theme-primary leading-relaxed">
                                    {question}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Skeleton rimanenti */}
            {remainingSkeletons > 0 && (
                <QuestionsSkeleton
                    count={remainingSkeletons}
                    isLoading={true}
                />
            )}
        </div>
    );
};

export default QuestionsSkeleton;
