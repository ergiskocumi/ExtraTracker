import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Download,
  Share2,
  RotateCcw,
  ListChecks,
  Layers,
  Lightbulb,
  MoreHorizontal,
  Play,
  Target,
  BookOpen,
  MonitorPlay,
  ChevronLeft,
} from 'lucide-react';
import type { Deck, SavedQuizSnapshot } from '../../services/studyService';
import { cn } from '../../../../lib/utils';

// ─── Helpers ────────────────────────────────────────────────────

export const formatRelativeTime = (isoString: string | undefined): string => {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'poco fa';
  if (minutes < 60) return `${minutes}m fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}g fa`;
  const months = Math.floor(days / 30);
  return `${months} mes. fa`;
};

// ─── Sub-components ─────────────────────────────────────────────

export const DistributionBar = ({
  new: newCount,
  learning,
  review,
  mastered,
  total,
}: {
  new: number;
  learning: number;
  review: number;
  mastered: number;
  total: number;
}): React.ReactElement | null => {
  const items = [
    { count: newCount, color: 'bg-sky-500', label: 'Nuove' },
    { count: learning, color: 'bg-amber-500', label: 'In studio' },
    { count: review, color: 'bg-orange-500', label: 'Ripasso' },
    { count: mastered, color: 'bg-emerald-500', label: 'Padroneggiate' },
  ].filter(i => i.count > 0);

  if (total === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="h-2 bg-theme-base rounded-full overflow-hidden flex">
        {items.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ width: 0 }}
            animate={{ width: `${(item.count / total) * 100}%` }}
            transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={cn('h-full first:rounded-l-full last:rounded-r-full', item.color)}
            title={`${item.label}: ${item.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map(item => (
          <span key={item.label} className="flex items-center gap-1.5 text-xs text-theme-secondary">
            <span className={cn('w-1.5 h-1.5 rounded-full', item.color)} />
            {item.label} ({item.count})
          </span>
        ))}
      </div>
    </div>
  );
};

interface SidebarSectionProps {
  title?: string;
  icon?: React.ElementType;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  icon: Icon,
  iconColor = 'text-theme-muted',
  children,
  className,
}) => (
  <div className={cn('rounded-xl border border-theme-default bg-theme-surface p-4', className)}>
    {title && (
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className={cn('w-4 h-4', iconColor)} />}
        <h3 className="text-[13px] font-semibold text-theme-primary tracking-tight">{title}</h3>
      </div>
    )}
    {children}
  </div>
);

// ─── Types ──────────────────────────────────────────────────────

interface DeckDetailSidebarProps {
  deck: Deck;
  stats: {
    new: number;
    learning: number;
    review: number;
    mastered: number;
    total: number;
    due: number;
    mastery: number;
  };
  showMoreActions: boolean;
  setShowMoreActions: React.Dispatch<React.SetStateAction<boolean>>;
  onMagicGenerate?: () => void;
  onExamSolver?: () => void;
  onGenerateQuiz?: () => void;
  onRepeatSavedQuiz?: (quiz: SavedQuizSnapshot) => void;
  onReviewSavedQuiz?: (quiz: SavedQuizSnapshot) => void;
  onExport?: () => void;
  onShare?: () => void;
  onResetProgress?: () => void;
  onReadPdf?: () => void;
}

// ─── Main component ─────────────────────────────────────────────

export const DeckDetailSidebar: React.FC<DeckDetailSidebarProps> = ({
  deck,
  stats,
  showMoreActions,
  setShowMoreActions,
  onMagicGenerate,
  onExamSolver,
  onGenerateQuiz,
  onRepeatSavedQuiz,
  onReviewSavedQuiz,
  onExport,
  onShare,
  onResetProgress,
  onReadPdf,
}) => (
  <aside className="w-full lg:w-80 xl:w-[340px] flex-shrink-0 lg:sticky lg:top-[calc(var(--app-header-height,72px)+1.5rem)] lg:self-start lg:max-h-[calc(100dvh-var(--app-header-height,72px)-3rem)] lg:overflow-y-auto custom-scrollbar space-y-4">
    {/* Distribution (desktop) */}
    <div className="hidden lg:block">
      <SidebarSection title="Distribuzione" icon={Layers} iconColor="text-sky-500">
        <DistributionBar {...stats} />
      </SidebarSection>
    </div>

    {/* AI tools */}
    <SidebarSection
      title="Strumenti AI"
      icon={Sparkles}
      iconColor="text-primary-500"
      className="border-primary-500/20 bg-gradient-to-br from-primary-500/[0.05] via-transparent to-primary-500/[0.02] shadow-sm shadow-primary-500/5"
    >
      <div className="grid grid-cols-1 gap-2">
        {onMagicGenerate && (
          <button
            onClick={onMagicGenerate}
            className="group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-theme-primary bg-theme-surface border border-theme-default hover:border-primary-500/40 hover:bg-primary-500/[0.02] hover:shadow-md hover:shadow-primary-500/5 transition-all active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
              <Sparkles className="w-4 h-4 text-primary-500" />
            </div>
            <div className="flex flex-col items-start">
              <span>Magic Generate</span>
              <span className="text-[10px] text-theme-muted font-normal group-hover:text-primary-500/70 transition-colors">Crea flashcard istantanee</span>
            </div>
          </button>
        )}
        {onExamSolver && (
          <button
            onClick={onExamSolver}
            className="group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-theme-primary bg-theme-surface border border-theme-default hover:border-amber-500/40 hover:bg-amber-500/[0.02] hover:shadow-md hover:shadow-amber-500/5 transition-all active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <Target className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex flex-col items-start">
              <span>Exam Solver</span>
              <span className="text-[10px] text-theme-muted font-normal group-hover:text-amber-500/70 transition-colors">Risolvi simulazioni d'esame</span>
            </div>
          </button>
        )}
        {onGenerateQuiz && (
          <button
            onClick={onGenerateQuiz}
            disabled={stats.total < 10}
            title={
              stats.total < 10
                ? 'Crea almeno 10 flashcard per sbloccare il quiz'
                : 'Genera un quiz da questo mazzo'
            }
            className={cn(
              'group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]',
              stats.total >= 10
                ? 'text-theme-primary bg-theme-surface border border-theme-default hover:border-indigo-500/40 hover:bg-indigo-500/[0.02] hover:shadow-md hover:shadow-indigo-500/5'
                : 'text-theme-muted bg-theme-surface/50 border border-theme-subtle cursor-not-allowed opacity-60',
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              stats.total >= 10 ? "bg-indigo-500/10 group-hover:bg-indigo-500/20" : "bg-theme-subtle"
            )}>
              <ListChecks
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  stats.total >= 10 ? 'text-indigo-500' : 'text-theme-muted',
                )}
              />
            </div>
            <div className="flex flex-col items-start">
              <span>Genera Quiz</span>
              <span className="text-[10px] text-theme-muted font-normal group-hover:text-indigo-500/70 transition-colors">Mettiti alla prova</span>
            </div>
          </button>
        )}
      </div>
    </SidebarSection>

    {/* Saved quizzes */}
    {onRepeatSavedQuiz && (deck.savedQuizzes?.length ?? 0) > 0 && (
      <SidebarSection title="Quiz salvati" icon={ListChecks} iconColor="text-indigo-500">
        <div className="space-y-1.5">
          {(deck.savedQuizzes ?? []).slice(0, 5).map(quiz => (
            <div
              key={quiz.id}
              className="px-3 py-2.5 rounded-lg bg-theme-base space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-theme-primary truncate">
                    {quiz.name || `Quiz ${quiz.questionCount} domande`}
                  </p>
                  <p className="text-[11px] text-theme-muted mt-0.5">
                    {quiz.quizType === 'true_false' ? 'Vero/Falso' : 'Scelta multipla'} ·{' '}
                    {quiz.questionCount} dom.
                    {quiz.attemptCount != null && quiz.attemptCount > 0 && (
                      <> · {quiz.attemptCount} {quiz.attemptCount === 1 ? 'tentativo' : 'tentativi'}</>
                    )}
                  </p>
                </div>
                {quiz.bestScore != null && (
                  <span className="flex-shrink-0 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    Best: {quiz.bestScore}/{quiz.questionCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onRepeatSavedQuiz(quiz)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium transition-colors"
                  title={quiz.hasQuestions ? 'Rifai istantaneamente (senza AI)' : 'Rifai questo quiz'}
                >
                  <Play className="w-3 h-3" />
                  {quiz.hasQuestions ? 'Rifai' : 'Rigenera'}
                </button>
                {onReviewSavedQuiz && (
                  <button
                    onClick={() => onReviewSavedQuiz(quiz)}
                    disabled={!quiz.hasQuestions}
                    className={cn(
                      'flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                      quiz.hasQuestions
                        ? 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400'
                        : 'bg-theme-subtle text-theme-muted cursor-not-allowed opacity-50',
                    )}
                    title={quiz.hasQuestions ? 'Rivedi domande e risposte' : 'Non disponibile per quiz legacy'}
                  >
                    <BookOpen className="w-3 h-3" />
                    Rivedi
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </SidebarSection>
    )}

    {/* PDF banner (mobile, if not shown in header) */}
    {onReadPdf && deck.pdfUrl && (
      <button
        onClick={onReadPdf}
        className="sm:hidden w-full group relative flex items-center gap-4 p-4 rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
      >
        {/* Background with vibrant gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 shadow-lg shadow-blue-500/20" />

        <div className="relative w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 border border-white/30">
          <MonitorPlay className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold !text-white tracking-tight">Focus & Flow</p>
            <div className="px-1.5 py-0.5 rounded-md bg-white/20 border border-white/30 text-[10px] font-black !text-white uppercase tracking-widest">Cinema</div>
          </div>
          <p className="text-xs !text-white/80 mt-0.5 line-clamp-1">Studio immersivo: PDF e Flashcard affiancati</p>
        </div>

        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white group-active:scale-90 transition-all">
          <ChevronLeft className="w-4 h-4 rotate-180" />
        </div>
      </button>
    )}

    {/* Tip */}
    {stats.review > 0 && (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3.5">
        <div className="flex items-start gap-2.5">
          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-theme-secondary leading-relaxed">
            Hai <span className="font-semibold text-amber-600 dark:text-amber-400">{stats.review}</span>{' '}
            carte in ripasso. Studiale per mantenere la memoria a lungo termine.
          </p>
        </div>
      </div>
    )}

    {/* Quick actions */}
    <div className="relative">
      <button
        onClick={() => setShowMoreActions(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-theme-default bg-theme-surface text-sm text-theme-secondary hover:text-theme-primary transition-colors"
      >
        <span className="flex items-center gap-2">
          <MoreHorizontal className="w-4 h-4" />
          Altre azioni
        </span>
        <ChevronLeft
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            showMoreActions ? 'rotate-90' : '-rotate-90',
          )}
        />
      </button>

      <AnimatePresence>
        {showMoreActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-1">
              {onExport && (
                <button
                  onClick={onExport}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm text-theme-primary hover:bg-theme-subtle transition-colors"
                >
                  <Download className="w-4 h-4 text-theme-muted" />
                  Esporta mazzo
                </button>
              )}
              {onShare && (
                <button
                  onClick={onShare}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm text-theme-primary hover:bg-theme-subtle transition-colors"
                >
                  <Share2 className="w-4 h-4 text-theme-muted" />
                  Copia link
                </button>
              )}
              {onResetProgress && (
                <button
                  onClick={onResetProgress}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset progresso
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Deck info (collapsed) */}
    {(deck.updatedAt || deck.createdAt) && (
      <div className="px-1 space-y-2 text-xs text-theme-muted">
        {deck.createdAt && (
          <p>
            Creato {formatRelativeTime(deck.createdAt)}
          </p>
        )}
        <p>
          {stats.total} carte · {stats.mastered} padroneggiate
        </p>
      </div>
    )}
  </aside>
);

export default DeckDetailSidebar;
