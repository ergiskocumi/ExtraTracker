import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Target,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import type { QuizAttempt, SavedQuizReviewResponse } from '../../services/studyService';
import { cn } from '../../../../lib/utils';

interface QuizReviewModeProps {
  data: SavedQuizReviewResponse;
  onClose: () => void;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const difficultyLabelMap: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const QuizReviewMode: React.FC<QuizReviewModeProps> = ({ data, onClose }) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-theme-base/80 backdrop-blur-lg"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="mx-auto flex min-h-full max-w-7xl items-start justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.985 }}
          transition={{ type: 'spring', stiffness: 240, damping: 28 }}
          className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-theme-default bg-theme-surface shadow-[0_30px_90px_rgba(0,0,0,0.24)] sm:max-h-[calc(100dvh-3rem)]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_35%),linear-gradient(180deg,rgba(99,102,241,0.08),transparent)]" />

          <div className="relative border-b border-theme-default px-5 pb-5 pt-6 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-primary-600 dark:text-primary-400">
                  <BookOpen className="h-3.5 w-3.5" />
                  Review Quiz
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-theme-primary sm:text-3xl">
                    {data.name}
                  </h1>
                  <p className="mt-1 text-sm leading-relaxed text-theme-secondary sm:text-[15px]">
                    {data.questions.length} domande · {data.quizType === 'true_false' ? 'Vero / Falso' : 'Scelta multipla'}
                    {' '}· Tutte le risposte corrette e le spiegazioni in un layout leggibile sia in dark che in light.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-theme-default bg-theme-base px-3 py-2 text-sm text-theme-primary">
                    <BookOpen className="h-4 w-4 text-primary-500" />
                    <span className="font-semibold">{data.questions.length}</span>
                    <span className="text-theme-secondary">domande</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-theme-default bg-theme-base px-3 py-2 text-sm text-theme-primary">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span className="font-semibold">{data.attempts.length}</span>
                    <span className="text-theme-secondary">tentativi</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-theme-default bg-theme-base text-theme-muted transition-all hover:border-primary-500/25 hover:text-theme-primary"
                aria-label="Chiudi review quiz"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-8">
            {data.attempts.length > 0 && (
              <section className="mb-6 rounded-[1.5rem] border border-theme-default bg-theme-base p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-theme-primary">
                    Storico tentativi
                  </h2>
                </div>

                <div className="grid gap-3">
                  {data.attempts.slice(-5).reverse().map((attempt: QuizAttempt, index: number) => (
                    <div
                      key={attempt.id || index}
                      className="flex flex-col gap-3 rounded-2xl border border-theme-default bg-theme-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex min-w-[3rem] justify-center rounded-full bg-theme-subtle px-2.5 py-1 text-xs font-bold text-theme-secondary">
                          #{data.attempts.length - index}
                        </span>
                        <span className="text-sm font-bold text-theme-primary">
                          {attempt.score}/{data.questions.length}
                        </span>
                        <span className="inline-flex items-center gap-1 text-sm text-theme-secondary">
                          <Target className="h-3.5 w-3.5 text-primary-500" />
                          {attempt.accuracy}%
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-theme-secondary">
                        {attempt.timeSeconds > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-theme-muted" />
                            {Math.floor(attempt.timeSeconds / 60)}:{String(attempt.timeSeconds % 60).padStart(2, '0')}
                          </span>
                        )}
                        {attempt.completedAt && <span>{formatDate(attempt.completedAt)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="space-y-4">
              {data.questions.map((question, index) => {
                const allOptions = question.options.length > 0
                  ? question.options
                  : [question.correctAnswer, ...question.distractors];

                return (
                  <motion.section
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.45) }}
                    className="overflow-hidden rounded-[1.75rem] border border-theme-default bg-theme-base shadow-sm"
                  >
                    <div className="border-b border-theme-default bg-[linear-gradient(135deg,rgba(59,130,246,0.08),rgba(99,102,241,0.04),transparent)] px-4 py-4 sm:px-5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500/10 text-sm font-black text-primary-600 dark:text-primary-400">
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full border border-theme-default bg-theme-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-theme-secondary">
                              {data.quizType === 'true_false' ? 'Vero / Falso' : 'Scelta multipla'}
                            </span>
                            {question.difficulty && (
                              <span
                                className={cn(
                                  'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                                  question.difficulty === 'hard'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : question.difficulty === 'medium'
                                      ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                                )}
                              >
                                {difficultyLabelMap[question.difficulty] || question.difficulty}
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-base font-semibold leading-relaxed text-theme-primary sm:text-lg">
                            {question.questionText}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 px-4 py-4 sm:px-5">
                      {allOptions.map((option, optionIndex) => {
                        const isCorrect = option === question.correctAnswer;
                        const distractorIndex = question.distractors.indexOf(option);
                        const explanation = distractorIndex >= 0 && question.distractorExplanations[distractorIndex]
                          ? question.distractorExplanations[distractorIndex]
                          : null;

                        return (
                          <div
                            key={optionIndex}
                            className={cn(
                              'rounded-2xl border px-4 py-3',
                              isCorrect
                                ? 'border-emerald-500/30 bg-emerald-500/[0.08]'
                                : 'border-theme-default bg-theme-surface',
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex-shrink-0">
                                {isCorrect ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-theme-muted" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={cn(
                                      'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]',
                                      isCorrect
                                        ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-theme-subtle text-theme-secondary',
                                    )}
                                  >
                                    {isCorrect ? 'Corretta' : 'Distrattore'}
                                  </span>
                                </div>

                                <p
                                  className={cn(
                                    'mt-2 text-sm leading-relaxed sm:text-[15px]',
                                    isCorrect ? 'font-semibold text-theme-primary' : 'text-theme-primary',
                                  )}
                                >
                                  {option}
                                </p>

                                {explanation && (
                                  <div className="mt-3 rounded-xl border border-theme-default bg-theme-base px-3 py-2">
                                    <p className="text-xs leading-relaxed text-theme-secondary sm:text-sm">
                                      <span className="font-semibold text-theme-primary">Nota:</span> {explanation}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {question.correctAnswerExplanation && (
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
                          <p className="text-sm leading-relaxed text-theme-secondary">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Spiegazione:</span>{' '}
                            {question.correctAnswerExplanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.section>
                );
              })}
            </div>
          </div>

          <div className="border-t border-theme-default bg-theme-surface px-5 py-4 sm:px-8">
            <div className="flex justify-center sm:justify-end">
              <button
                onClick={onClose}
                className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-primary-500 px-6 text-sm font-bold text-white shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-600"
              >
                Chiudi
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default QuizReviewMode;
