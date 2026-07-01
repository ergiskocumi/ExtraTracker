import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
  Clock3,
  Layers3,
  ListChecks,
  Play,
  Search,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import type { SavedQuizSnapshot } from '../../services/studyService';
import { cn } from '../../../../lib/utils';

interface SavedQuizLibraryModalProps {
  isOpen: boolean;
  deckTitle: string;
  quizzes: SavedQuizSnapshot[];
  onClose: () => void;
  onRepeatQuiz: (quiz: SavedQuizSnapshot) => void;
  onReviewQuiz: (quiz: SavedQuizSnapshot) => void;
}

type QuizFilter = 'all' | 'multiple_choice' | 'true_false';
type QuizSort = 'recent' | 'best' | 'attempts';

const formatRelativeTime = (isoString: string | undefined): string => {
  if (!isoString) return 'Data non disponibile';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Appena creato';
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ore fa`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} giorni fa`;
  const months = Math.floor(days / 30);
  return `${months} mesi fa`;
};

const sourceLabelMap: Record<SavedQuizSnapshot['source'], string> = {
  chapter: 'Capitolo',
  repeat: 'Repeat',
  errors: 'Errori',
  saved: 'Archivio',
};

const sortQuizzes = (quizzes: SavedQuizSnapshot[], sortBy: QuizSort): SavedQuizSnapshot[] => {
  const items = [...quizzes];
  if (sortBy === 'best') return items.sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0));
  if (sortBy === 'attempts') return items.sort((a, b) => (b.attemptCount || 0) - (a.attemptCount || 0));
  return items.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
};

export const SavedQuizLibraryModal: React.FC<SavedQuizLibraryModalProps> = ({
  isOpen,
  deckTitle,
  quizzes,
  onClose,
  onRepeatQuiz,
  onReviewQuiz,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<QuizFilter>('all');
  const [sortBy, setSortBy] = useState<QuizSort>('recent');

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const summary = useMemo(() => {
    const total = quizzes.length;
    const reviewable = quizzes.filter(quiz => quiz.hasQuestions).length;
    const totalAttempts = quizzes.reduce((acc, quiz) => acc + (quiz.attemptCount || 0), 0);
    return { total, reviewable, totalAttempts };
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    const base = quizzes.filter((quiz) => {
      const matchesFilter = filter === 'all' ? true : quiz.quizType === filter;
      const matchesQuery = !normalizedQuery
        ? true
        : (quiz.name || '').toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });

    return sortQuizzes(base, sortBy);
  }, [quizzes, filter, normalizedQuery, sortBy]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-popover bg-theme-base/80 backdrop-blur-lg"
        >
          <div className="mx-auto flex min-h-full max-w-7xl items-start justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28 }}
              className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-theme-default bg-theme-surface shadow-[0_30px_90px_rgba(0,0,0,0.22)] sm:max-h-[calc(100dvh-3rem)]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_36%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_34%),linear-gradient(180deg,rgba(99,102,241,0.08),transparent)]" />

              <div className="relative border-b border-theme-default px-5 pb-5 pt-6 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-primary-600 dark:text-primary-400">
                      <Sparkles className="h-3.5 w-3.5" />
                      Quiz Archive
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-theme-primary sm:text-3xl">
                        Libreria quiz di {deckTitle}
                      </h2>
                      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-theme-secondary sm:text-[15px]">
                        Archivio studiabile e pulito: qui mostri solo tipo, score, tentativi, origine e stato.
                        Le domande restano nascoste finche non scegli di rivederle davvero.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-theme-default bg-theme-base px-3 py-2 text-sm text-theme-primary">
                        <Layers3 className="h-4 w-4 text-primary-500" />
                        <span className="font-semibold">{summary.total}</span>
                        <span className="text-theme-secondary">quiz totali</span>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-theme-default bg-theme-base px-3 py-2 text-sm text-theme-primary">
                        <Brain className="h-4 w-4 text-emerald-500" />
                        <span className="font-semibold">{summary.reviewable}</span>
                        <span className="text-theme-secondary">rivedibili</span>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-theme-default bg-theme-base px-3 py-2 text-sm text-theme-primary">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <span className="font-semibold">{summary.totalAttempts}</span>
                        <span className="text-theme-secondary">tentativi</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-theme-default bg-theme-base text-theme-muted transition-all hover:border-primary-500/25 hover:text-theme-primary"
                    aria-label="Chiudi libreria quiz"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="relative border-b border-theme-default px-5 py-4 sm:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cerca per nome del quiz..."
                      className="min-h-[48px] w-full rounded-2xl border border-theme-default bg-theme-base pl-10 pr-4 text-sm text-theme-primary outline-none transition-all placeholder:text-theme-muted focus:border-primary-500/35 focus:ring-4 focus:ring-primary-500/10"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: 'all', label: 'Tutti' },
                      { id: 'multiple_choice', label: 'Scelta multipla' },
                      { id: 'true_false', label: 'Vero / Falso' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setFilter(item.id as QuizFilter)}
                        className={cn(
                          'min-h-[44px] rounded-2xl border px-4 text-sm font-semibold transition-all',
                          filter === item.id
                            ? 'border-primary-500 bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                            : 'border-theme-default bg-theme-base text-theme-secondary hover:border-primary-500/25 hover:text-theme-primary',
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as QuizSort)}
                      className="min-h-[44px] rounded-2xl border border-theme-default bg-theme-base px-3 text-sm font-medium text-theme-primary outline-none transition-all focus:border-primary-500/35 focus:ring-4 focus:ring-primary-500/10"
                    >
                      <option value="recent">Piu recenti</option>
                      <option value="best">Best score</option>
                      <option value="attempts">Piu tentati</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="relative flex-1 overflow-y-auto px-5 py-5 sm:px-8">
                {filteredQuizzes.length === 0 ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-theme-default bg-theme-base/60 px-6 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/20">
                      <ListChecks className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-black text-theme-primary">Nessun quiz da mostrare</h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-theme-secondary">
                      Cambia filtro oppure genera un nuovo quiz. Qui mantieni un archivio leggibile,
                      coerente col tema e senza esporre subito il contenuto delle domande.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {filteredQuizzes.map((quiz, index) => {
                      const accuracy = quiz.bestScore != null && quiz.questionCount > 0
                        ? Math.round((quiz.bestScore / quiz.questionCount) * 100)
                        : null;

                      return (
                        <motion.article
                          key={quiz.id}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(index * 0.03, 0.18) }}
                          className="group relative overflow-hidden rounded-[1.75rem] border border-theme-default bg-theme-base p-5 shadow-[0_12px_40px_rgba(0,0,0,0.10)] transition-all hover:-translate-y-1 hover:border-primary-500/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.16)]"
                        >
                          <div
                            className={cn(
                              'absolute inset-x-0 top-0 h-1.5',
                              quiz.quizType === 'true_false'
                                ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400'
                                : 'bg-gradient-to-r from-primary-500 via-indigo-500 to-sky-500',
                            )}
                          />

                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em]',
                                    quiz.quizType === 'true_false'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-primary-500/10 text-primary-600 dark:text-primary-400',
                                  )}
                                >
                                  {quiz.quizType === 'true_false' ? 'Vero / Falso' : 'Scelta multipla'}
                                </span>
                                <span className="inline-flex rounded-full border border-theme-default bg-theme-surface px-2.5 py-1 text-[11px] font-semibold text-theme-secondary">
                                  {sourceLabelMap[quiz.source]}
                                </span>
                                <span
                                  className={cn(
                                    'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                                    quiz.hasQuestions
                                      ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                                  )}
                                >
                                  {quiz.hasQuestions ? 'Persistito' : 'Legacy'}
                                </span>
                              </div>

                              <h3 className="mt-3 text-lg font-black tracking-tight text-theme-primary">
                                {quiz.name || `Quiz ${quiz.questionCount} domande`}
                              </h3>
                              <p className="mt-1 text-sm text-theme-secondary">
                                Creato {formatRelativeTime(quiz.createdAt)}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-theme-default bg-theme-surface px-3 py-2 text-right shadow-inner shadow-black/5">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-theme-muted">Domande</p>
                              <p className="text-2xl font-black text-theme-primary">{quiz.questionCount}</p>
                            </div>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-theme-default bg-theme-surface p-3">
                              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-theme-muted">
                                <Clock3 className="h-3.5 w-3.5" />
                                Tentativi
                              </div>
                              <p className="mt-2 text-lg font-black text-theme-primary">{quiz.attemptCount || 0}</p>
                            </div>

                            <div className="rounded-2xl border border-theme-default bg-theme-surface p-3">
                              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-theme-muted">
                                <Target className="h-3.5 w-3.5" />
                                Ultimo score
                              </div>
                              <p className="mt-2 text-lg font-black text-theme-primary">
                                {quiz.lastScore != null ? `${quiz.lastScore}/${quiz.questionCount}` : 'N/D'}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-theme-default bg-theme-surface p-3">
                              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-theme-muted">
                                <Trophy className="h-3.5 w-3.5" />
                                Best
                              </div>
                              <p className="mt-2 text-lg font-black text-theme-primary">
                                {quiz.bestScore != null ? `${quiz.bestScore}/${quiz.questionCount}` : 'N/D'}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-theme-default bg-theme-surface p-3">
                              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-theme-muted">
                                <Brain className="h-3.5 w-3.5" />
                                Precisione
                              </div>
                              <p className="mt-2 text-lg font-black text-theme-primary">
                                {accuracy != null ? `${accuracy}%` : 'N/D'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                            <button
                              onClick={() => onRepeatQuiz(quiz)}
                              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-primary-500 px-4 text-sm font-bold text-white shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-600"
                            >
                              <Play className="h-4 w-4" />
                              {quiz.hasQuestions ? 'Rifai adesso' : 'Rigenera'}
                            </button>
                            <button
                              onClick={() => onReviewQuiz(quiz)}
                              disabled={!quiz.hasQuestions}
                              className={cn(
                                'inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold transition-all',
                                quiz.hasQuestions
                                  ? 'border-theme-default bg-theme-surface text-theme-primary hover:border-primary-500/25 hover:bg-theme-subtle'
                                  : 'cursor-not-allowed border-theme-default bg-theme-surface text-theme-muted opacity-60',
                              )}
                            >
                              <BookOpen className="h-4 w-4" />
                              Rivedi
                            </button>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SavedQuizLibraryModal;
