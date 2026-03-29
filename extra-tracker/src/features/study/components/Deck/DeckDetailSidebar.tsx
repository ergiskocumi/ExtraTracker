import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive,
  ChevronLeft,
  Download,
  Layers,
  Lightbulb,
  ListChecks,
  MonitorPlay,
  MoreHorizontal,
  RotateCcw,
  Share2,
  Sparkles,
  Target,
} from 'lucide-react';
import type { Deck } from '../../services/studyService';
import { cn } from '../../../../lib/utils';

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
  ].filter(item => item.count > 0);

  if (total === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-theme-base">
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
            <span className={cn('h-1.5 w-1.5 rounded-full', item.color)} />
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
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className={cn('h-4 w-4', iconColor)} />}
        <h3 className="text-[13px] font-semibold tracking-tight text-theme-primary">{title}</h3>
      </div>
    )}
    {children}
  </div>
);

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
  onOpenQuizLibrary?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onResetProgress?: () => void;
  onReadPdf?: () => void;
}

export const DeckDetailSidebar: React.FC<DeckDetailSidebarProps> = ({
  deck,
  stats,
  showMoreActions,
  setShowMoreActions,
  onMagicGenerate,
  onExamSolver,
  onGenerateQuiz,
  onOpenQuizLibrary,
  onExport,
  onShare,
  onResetProgress,
  onReadPdf,
}) => (
  <aside className="custom-scrollbar w-full flex-shrink-0 space-y-4 lg:sticky lg:top-[calc(var(--app-header-height,72px)+1.5rem)] lg:max-h-[calc(100dvh-var(--app-header-height,72px)-3rem)] lg:w-80 lg:self-start lg:overflow-y-auto xl:w-[340px]">
    <div className="hidden lg:block">
      <SidebarSection title="Distribuzione" icon={Layers} iconColor="text-sky-500">
        <DistributionBar {...stats} />
      </SidebarSection>
    </div>

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
            className="group flex w-full items-center gap-3 rounded-xl border border-theme-default bg-theme-surface px-3.5 py-3 text-sm font-semibold text-theme-primary transition-all hover:border-primary-500/40 hover:bg-primary-500/[0.02] hover:shadow-md hover:shadow-primary-500/5 active:scale-[0.98]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10 transition-colors group-hover:bg-primary-500/20">
              <Sparkles className="h-4 w-4 text-primary-500" />
            </div>
            <div className="flex flex-col items-start">
              <span>Magic Generate</span>
              <span className="text-[10px] font-normal text-theme-muted transition-colors group-hover:text-primary-500/70">
                Crea flashcard istantanee
              </span>
            </div>
          </button>
        )}

        {onExamSolver && (
          <button
            onClick={onExamSolver}
            className="group flex w-full items-center gap-3 rounded-xl border border-theme-default bg-theme-surface px-3.5 py-3 text-sm font-semibold text-theme-primary transition-all hover:border-amber-500/40 hover:bg-amber-500/[0.02] hover:shadow-md hover:shadow-amber-500/5 active:scale-[0.98]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 transition-colors group-hover:bg-amber-500/20">
              <Target className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex flex-col items-start">
              <span>Exam Solver</span>
              <span className="text-[10px] font-normal text-theme-muted transition-colors group-hover:text-amber-500/70">
                Risolvi simulazioni d'esame
              </span>
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
              'group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all active:scale-[0.98]',
              stats.total >= 10
                ? 'border border-theme-default bg-theme-surface text-theme-primary hover:border-indigo-500/40 hover:bg-indigo-500/[0.02] hover:shadow-md hover:shadow-indigo-500/5'
                : 'cursor-not-allowed border border-theme-subtle bg-theme-surface/50 text-theme-muted opacity-60',
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                stats.total >= 10 ? 'bg-indigo-500/10 group-hover:bg-indigo-500/20' : 'bg-theme-subtle',
              )}
            >
              <ListChecks
                className={cn('h-4 w-4 flex-shrink-0', stats.total >= 10 ? 'text-indigo-500' : 'text-theme-muted')}
              />
            </div>
            <div className="flex flex-col items-start">
              <span>Genera Quiz</span>
              <span className="text-[10px] font-normal text-theme-muted transition-colors group-hover:text-indigo-500/70">
                Mettiti alla prova
              </span>
            </div>
          </button>
        )}
      </div>
    </SidebarSection>

    {onOpenQuizLibrary && (
      <SidebarSection title="Archivio Quiz" icon={Archive} iconColor="text-indigo-500">
        <button
          onClick={onOpenQuizLibrary}
          className="group relative w-full overflow-hidden rounded-2xl border border-theme-default bg-theme-base p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-500/25 hover:shadow-lg hover:shadow-primary-500/10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_34%)] opacity-90" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
                <ListChecks className="h-3.5 w-3.5" />
                Quiz salvati
              </div>
              <div>
                <p className="text-base font-black tracking-tight text-theme-primary">Apri la libreria quiz</p>
                <p className="mt-1 text-sm leading-relaxed text-theme-secondary">
                  Vedi i quiz come card compatte con score, tentativi, tipo e stato, senza mostrare subito domande e risposte.
                </p>
              </div>
            </div>

            <div className="flex min-w-[84px] flex-col items-end gap-2">
              <div className="rounded-2xl border border-theme-default bg-theme-surface px-3 py-2 text-right shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-theme-muted">Quiz</p>
                <p className="text-2xl font-black text-theme-primary">{deck.savedQuizzes?.length ?? 0}</p>
              </div>
              <span className="rounded-full bg-primary-500 px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors group-hover:bg-primary-600">
                Apri archivio
              </span>
            </div>
          </div>
        </button>
      </SidebarSection>
    )}

    {onReadPdf && deck.pdfUrl && (
      <button
        onClick={onReadPdf}
        className="group relative w-full overflow-hidden rounded-2xl p-4 transition-all active:scale-[0.98] sm:hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 shadow-lg shadow-blue-500/20" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/20 backdrop-blur-md">
            <MonitorPlay className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>

          <div className="relative min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-base font-bold tracking-tight !text-white">Focus & Flow</p>
              <div className="rounded-md border border-white/30 bg-white/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest !text-white">
                Cinema
              </div>
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs !text-white/80">
              Studio immersivo: PDF e Flashcard affiancati
            </p>
          </div>

          <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all group-active:scale-90">
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </div>
        </div>
      </button>
    )}

    {stats.review > 0 && (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3.5">
        <div className="flex items-start gap-2.5">
          <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-theme-secondary">
            Hai <span className="font-semibold text-amber-600 dark:text-amber-400">{stats.review}</span> carte in ripasso.
            Studiale per mantenere la memoria a lungo termine.
          </p>
        </div>
      </div>
    )}

    <div className="relative">
      <button
        onClick={() => setShowMoreActions(value => !value)}
        className="flex w-full items-center justify-between rounded-xl border border-theme-default bg-theme-surface px-4 py-3 text-sm text-theme-secondary transition-colors hover:text-theme-primary"
      >
        <span className="flex items-center gap-2">
          <MoreHorizontal className="h-4 w-4" />
          Altre azioni
        </span>
        <ChevronLeft
          className={cn('h-4 w-4 transition-transform duration-200', showMoreActions ? 'rotate-90' : '-rotate-90')}
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
            <div className="space-y-1 pt-2">
              {onExport && (
                <button
                  onClick={onExport}
                  className="flex w-full items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm text-theme-primary transition-colors hover:bg-theme-subtle"
                >
                  <Download className="h-4 w-4 text-theme-muted" />
                  Esporta mazzo
                </button>
              )}
              {onShare && (
                <button
                  onClick={onShare}
                  className="flex w-full items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm text-theme-primary transition-colors hover:bg-theme-subtle"
                >
                  <Share2 className="h-4 w-4 text-theme-muted" />
                  Copia link
                </button>
              )}
              {onResetProgress && (
                <button
                  onClick={onResetProgress}
                  className="flex w-full items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm text-orange-600 transition-colors hover:bg-orange-500/10 dark:text-orange-400"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset progresso
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {(deck.updatedAt || deck.createdAt) && (
      <div className="space-y-2 px-1 text-xs text-theme-muted">
        {deck.createdAt && <p>Creato {formatRelativeTime(deck.createdAt)}</p>}
        <p>
          {stats.total} carte · {stats.mastered} padroneggiate
        </p>
      </div>
    )}
  </aside>
);

export default DeckDetailSidebar;
