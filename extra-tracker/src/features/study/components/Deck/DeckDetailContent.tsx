/**
 * DECK DETAIL CONTENT — Redesigned 2-column layout
 *
 * Architecture:
 *   PageHeader  — breadcrumb, title, primary CTA, PDF link
 *   Main + Sidebar (lg) — cards on the left, contextual panel on the right
 *   Mobile bottom bar — fixed study CTA in thumb zone
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  AlertCircle,
  Sparkles,
  Download,
  Share2,
  RotateCcw,
  LayoutGrid,
  List,
  ListChecks,
  Search,
  Clock,
  Calendar,
  ChevronLeft,
  Play,
  Target,
  Layers,
  Brain,
  FileText,
  Lightbulb,
  MoreHorizontal,
  BookOpen,
  MonitorPlay,
  Zap,
} from 'lucide-react';
import type { Deck, Card, SavedQuizSnapshot, StudyMode } from '../../services/studyService';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import { FlashcardItem } from '../Flashcard/FlashcardItem';
import { CardEditorModal } from './CardEditorModal';
import { cn } from '../../../../lib/utils';

// ─── Helpers ────────────────────────────────────────────────────

const formatRelativeTime = (isoString: string | undefined): string => {
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

// ─── Types ──────────────────────────────────────────────────────

interface DeckDetailContentProps {
  deck: Deck;
  onBack: () => void;
  onStudy: (mode: StudyMode) => void;
  onGenerateQuiz?: () => void;
  onRepeatSavedQuiz?: (quiz: SavedQuizSnapshot) => void;
  onExamSolver?: () => void;
  onReadPdf?: () => void;
  onMagicGenerate?: () => void;
  onDeckUpdate: (deck: Deck) => void;
  onDeleteDeck?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onResetProgress?: () => void;
}

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'new' | 'learning' | 'review' | 'mastered';

// ─── Sub-components ─────────────────────────────────────────────

const DistributionBar = ({
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
}) => {
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

const SidebarSection: React.FC<SidebarSectionProps> = ({
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

// ─── Main component ─────────────────────────────────────────────

export const DeckDetailContent: React.FC<DeckDetailContentProps> = ({
  deck,
  onBack,
  onStudy,
  onGenerateQuiz,
  onRepeatSavedQuiz,
  onExamSolver,
  onReadPdf,
  onMagicGenerate,
  onDeckUpdate,
  onDeleteDeck,
  onExport,
  onShare,
  onResetProgress,
}) => {
  // ── State ──
  const [selectedStudyMode, setSelectedStudyMode] = useState<StudyMode>('flashcard');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem('deck-view-mode');
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    if (stored === 'grid' || stored === 'list') return stored as ViewMode;
    return isMobile ? 'list' : 'grid';
  });

  useEffect(() => {
    const KEY = 'deck-settings-removed-notice-shown';
    if (!localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, '1');
      const t = window.setTimeout(() => {
        emitToast.info(
          'Le impostazioni SRS del mazzo sono ora gestite automaticamente. Nessuna azione richiesta.',
          { title: 'Semplificazione', duration: 6000 },
        );
      }, 800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // ── Derived data ──
  const stats = useMemo(() => {
    const cards = deck.cards || [];
    const total = cards.length;
    const newCards = cards.filter(c => c.status === 'new').length;
    const learning = cards.filter(c => c.status === 'learning').length;
    const review = cards.filter(c => c.status === 'review').length;
    const mastered = cards.filter(c => c.status === 'mastered').length;
    const dueCount = deck.dueCount || 0;
    const masteryPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;

    return {
      total,
      new: newCards,
      learning,
      review,
      mastered,
      due: dueCount,
      mastery: masteryPercent,
    };
  }, [deck.cards, deck.dueCount]);

  const filteredCards = useMemo(() => {
    let cards = [...(deck.cards || [])];
    if (filter !== 'all') cards = cards.filter(c => c.status === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cards = cards.filter(c => c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q));
    }
    return cards;
  }, [deck.cards, filter, searchQuery]);

  const canStudy = stats.due > 0 || stats.new > 0 || stats.learning > 0 || stats.review > 0;

  // ── Handlers ──
  const handleAddCard = useCallback(() => {
    setEditingCard({
      id: 'temp-new',
      front: '',
      back: '',
      easinessFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(),
      status: 'new',
    });
    setIsEditorOpen(true);
  }, []);

  const handleSaveCard = useCallback(
    async (front: string, back: string) => {
      if (!editingCard) return;
      try {
        if (editingCard.id === 'temp-new') {
          const updatedDeck = await studyService.addCard(deck.id, { front, back });
          onDeckUpdate(updatedDeck);
          emitToast.success('Carta aggiunta!');
        } else {
          const updatedDeck = await studyService.updateCard(deck.id, editingCard.id, { front, back });
          onDeckUpdate(updatedDeck);
          emitToast.success('Carta aggiornata!');
        }
        setIsEditorOpen(false);
        setEditingCard(null);
      } catch (error: any) {
        emitToast.error(error.message || 'Errore nel salvare');
      }
    },
    [editingCard, deck.id, onDeckUpdate],
  );

  const handleDeleteCard = useCallback(async () => {
    if (!deletingCardId) return;
    try {
      const updatedDeck = await studyService.deleteCard(deck.id, deletingCardId);
      onDeckUpdate(updatedDeck);
      emitToast.success('Carta eliminata!');
      setDeletingCardId(null);
    } catch (error: any) {
      emitToast.error(error.message || 'Errore');
    }
  }, [deletingCardId, deck.id, onDeckUpdate]);

  const currentCardIndex = useMemo(() => {
    if (!editingCard || editingCard.id === 'temp-new') return -1;
    return deck.cards?.findIndex(c => c.id === editingCard.id) ?? -1;
  }, [editingCard, deck.cards]);

  // ── Render ──
  return (
    <div className="pb-24 sm:pb-0">
      {/* ───────── PAGE HEADER ───────── */}
      <header className="mb-6">
        {/* Breadcrumb row */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-theme-surface border border-theme-default text-xs font-semibold text-theme-secondary hover:text-primary-500 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all active:scale-95 shadow-sm"
          >
            <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Torna all'Esame</span>
          </button>
          <div className="h-4 w-px bg-theme-subtle mx-1" />
          <span className="text-xs font-medium text-theme-muted">Dettaglio Capitolo</span>
        </div>

        {/* Title + actions row */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1
              className="text-2xl sm:text-3xl font-extrabold text-theme-primary tracking-tight leading-tight line-clamp-2"
              title={deck.title}
            >
              {deck.title}
            </h1>
            {deck.description && (
              <p className="text-sm text-theme-secondary mt-1.5 line-clamp-2 max-w-2xl">{deck.description}</p>
            )}
          </div>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {onReadPdf && deck.pdfUrl && (
              <button
                onClick={onReadPdf}
                className="group relative inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold text-white overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* Background Gradient & Effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:from-blue-500 group-hover:to-indigo-500 transition-colors" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] transition-opacity" />
                
                <div className="relative flex items-center gap-2 !text-white">
                  <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm">
                    <MonitorPlay className="w-3.5 h-3.5 !text-white" strokeWidth={2.5} />
                  </div>
                  <span className="tracking-tight !text-white">Focus & Flow</span>
                </div>
                
                {/* Subtle Glow */}
                <div className="absolute -inset-px rounded-xl border border-white/20 pointer-events-none" />
              </button>
            )}

            <select
              value={selectedStudyMode}
              onChange={e => setSelectedStudyMode(e.target.value as StudyMode)}
              disabled={!canStudy}
              className="min-h-[40px] px-3 py-2 rounded-lg bg-theme-surface border border-theme-default text-sm text-theme-primary disabled:opacity-40"
              aria-label="Modalità di studio"
            >
              <option value="flashcard">Flashcard</option>
              <option value="typing">Typing</option>
              <option value="mix">Mix</option>
            </select>

            <button
              onClick={() => onStudy(selectedStudyMode)}
              disabled={!canStudy}
              className={cn(
                'min-h-[40px] inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-colors',
                canStudy
                  ? 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 !text-white shadow-md shadow-primary-500/20'
                  : 'bg-theme-subtle text-theme-muted cursor-not-allowed',
              )}
            >
              <Play className="w-4 h-4 !text-white" />
              <span className="!text-white">Studia</span>
              {stats.due > 0 && (
                <span className="ml-0.5 text-xs bg-white/20 !text-white px-1.5 py-0.5 rounded">{stats.due}</span>
              )}
            </button>
          </div>
        </div>

        {/* Compact stats bar */}
        <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/5 border border-sky-500/10 text-xs sm:text-sm transition-colors hover:bg-sky-500/10">
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500" />
            <span className="font-bold text-theme-primary tabular-nums">{stats.total}</span>
            <span className="text-theme-secondary font-medium">carte</span>
          </div>

          {stats.due > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/5 border border-orange-500/10 text-xs sm:text-sm transition-colors hover:bg-orange-500/10">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
              <span className="font-bold text-orange-600 dark:text-orange-400 tabular-nums">{stats.due}</span>
              <span className="text-theme-secondary font-medium">da studiare</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs sm:text-sm transition-colors hover:bg-emerald-500/10">
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
            <span className="font-bold text-theme-primary tabular-nums">{stats.mastery}%</span>
            <span className="text-theme-secondary font-medium">padronanza</span>
          </div>

          {deck.updatedAt && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-theme-subtle/30 border border-theme-default text-[11px] text-theme-muted">
              <Calendar className="w-3 h-3" />
              <span>Aggiornato {formatRelativeTime(deck.updatedAt)}</span>
            </div>
          )}
        </div>
      </header>

      {/* ───────── MAIN 2-COLUMN LAYOUT ───────── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT — Card browser (takes most space) */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-theme-surface border border-theme-default">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Cerca carte..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-theme-base border border-theme-default text-sm text-theme-primary placeholder:text-theme-muted focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 outline-none transition-shadow"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Filter */}
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as FilterStatus)}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-theme-base border border-theme-default text-sm text-theme-primary"
              >
                <option value="all">Tutte ({stats.total})</option>
                <option value="new">Nuove ({stats.new})</option>
                <option value="learning">In studio ({stats.learning})</option>
                <option value="review">Ripasso ({stats.review})</option>
                <option value="mastered">Padroneggiate ({stats.mastered})</option>
              </select>

              {/* View toggle */}
              <div className="flex items-center bg-theme-base rounded-lg border border-theme-default p-0.5">
                <button
                  onClick={() => {
                    setViewMode('list');
                    localStorage.setItem('deck-view-mode', 'list');
                  }}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'list'
                      ? 'bg-theme-surface text-theme-primary shadow-sm'
                      : 'text-theme-muted hover:text-theme-primary',
                  )}
                  aria-label="Vista lista"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setViewMode('grid');
                    localStorage.setItem('deck-view-mode', 'grid');
                  }}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'grid'
                      ? 'bg-theme-surface text-theme-primary shadow-sm'
                      : 'text-theme-muted hover:text-theme-primary',
                  )}
                  aria-label="Vista griglia"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              {/* Add card (inline, desktop) */}
              <button
                onClick={handleAddCard}
                className="hidden sm:inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg text-sm font-medium bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 border border-primary-500/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Aggiungi
              </button>
            </div>
          </div>

          {/* Card count + distribution (inline, mobile only) */}
          <div className="lg:hidden">
            <DistributionBar {...stats} />
          </div>

          {/* Cards */}
          {filteredCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl bg-theme-surface border border-dashed border-theme-default">
              <div className="w-14 h-14 rounded-2xl bg-theme-subtle flex items-center justify-center mb-4">
                {searchQuery ? (
                  <Search className="w-7 h-7 text-theme-muted" />
                ) : (
                  <BookOpen className="w-7 h-7 text-theme-muted" />
                )}
              </div>
              <h3 className="text-base font-semibold text-theme-primary mb-1.5">
                {searchQuery ? 'Nessun risultato' : 'Nessuna carta'}
              </h3>
              <p className="text-sm text-theme-secondary max-w-xs mb-5">
                {searchQuery
                  ? 'Prova con termini diversi o rimuovi il filtro'
                  : 'Aggiungi la tua prima flashcard per iniziare a studiare'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleAddCard}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white text-sm font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Crea prima carta
                </button>
              )}
            </div>
          ) : (
            <div
              className={cn(
                viewMode === 'grid' ? 'grid grid-cols-1 xl:grid-cols-2 gap-3' : 'space-y-3',
              )}
            >
              <AnimatePresence mode="popLayout">
                {filteredCards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: Math.min(index * 0.025, 0.25) }}
                  >
                    <FlashcardItem
                      card={card}
                      onUpdate={async (id, front, back) => {
                        const updatedDeck = await studyService.updateCard(deck.id, id, { front, back });
                        onDeckUpdate(updatedDeck);
                      }}
                      onClick={() => {
                        setEditingCard(card);
                        setIsEditorOpen(true);
                      }}
                      onDelete={setDeletingCardId}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Mobile add card FAB */}
          <button
            onClick={handleAddCard}
            className="sm:hidden fixed right-4 z-20 w-14 h-14 rounded-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white shadow-lg shadow-primary-500/30 flex items-center justify-center transition-colors"
            style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
            aria-label="Aggiungi carta"
          >
            <Plus className="w-6 h-6" />
          </button>
        </main>

        {/* RIGHT — Sidebar (desktop: sticky, mobile: below cards) */}
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
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-theme-base"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-theme-primary truncate">
                        {quiz.name || `Quiz ${quiz.questionCount} domande`}
                      </p>
                      <p className="text-[11px] text-theme-muted mt-0.5">
                        {quiz.quizType === 'true_false' ? 'Vero/Falso' : 'Scelta multipla'} ·{' '}
                        {quiz.questionCount} dom.
                      </p>
                    </div>
                    <button
                      onClick={() => onRepeatSavedQuiz(quiz)}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium transition-colors"
                      title="Rifai questo quiz"
                    >
                      <Play className="w-3 h-3" />
                      Rifai
                    </button>
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
      </div>

      {/* ───────── MODALS & OVERLAYS ───────── */}

      <CardEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingCard(null);
        }}
        frontContent={editingCard?.front || ''}
        backContent={editingCard?.back || ''}
        onSave={handleSaveCard}
        onDelete={
          editingCard?.id !== 'temp-new' ? () => setDeletingCardId(editingCard?.id || null) : undefined
        }
        title={editingCard?.id === 'temp-new' ? 'Nuova Carta' : 'Modifica Carta'}
        cardNumber={currentCardIndex !== -1 ? currentCardIndex + 1 : undefined}
        totalCards={deck.cards?.length}
        onNavigate={
          currentCardIndex !== -1
            ? dir => {
                const newIndex = dir === 'prev' ? currentCardIndex - 1 : currentCardIndex + 1;
                const cards = deck.cards ?? [];
                if (newIndex >= 0 && newIndex < cards.length) {
                  setEditingCard(cards[newIndex]);
                }
              }
            : undefined
        }
      />

      {/* Mobile bottom study bar */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pt-3 bg-theme-elevated/95 backdrop-blur-xl border-t border-theme-default"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <select
            value={selectedStudyMode}
            onChange={e => setSelectedStudyMode(e.target.value as StudyMode)}
            disabled={!canStudy}
            className="flex-none min-w-[108px] min-h-[44px] px-3 py-2 rounded-xl bg-theme-surface border border-theme-default text-sm text-theme-primary disabled:opacity-40"
            aria-label="Modalità di studio"
          >
            <option value="flashcard">Flashcard</option>
            <option value="typing">Typing</option>
            <option value="mix">Mix</option>
          </select>
          <button
            onClick={() => onStudy(selectedStudyMode)}
            disabled={!canStudy}
            className={cn(
              'flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
              canStudy
                ? 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 !text-white shadow-lg shadow-primary-500/25'
                : 'bg-theme-subtle text-theme-muted cursor-not-allowed',
            )}
          >
            <Play className="w-4 h-4 !text-white" />
            <span className="!text-white">Studia</span>
            {stats.due > 0 && (
              <span className="ml-0.5 text-xs bg-white/20 !text-white px-1.5 py-0.5 rounded">{stats.due}</span>
            )}
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {deletingCardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-full max-w-sm p-6 rounded-2xl bg-theme-surface border border-theme-default shadow-theme-lg"
          >
            <h3 className="text-lg font-bold text-theme-primary mb-2">Elimina Carta</h3>
            <p className="text-theme-secondary text-sm mb-6">
              Sei sicuro? L'azione non può essere annullata.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingCardId(null)}
                className="px-4 py-2 rounded-lg text-sm text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteCard}
                className="px-4 py-2 rounded-lg text-sm bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
              >
                Elimina
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DeckDetailContent;
