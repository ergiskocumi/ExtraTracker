/**
 * DECK DETAIL CONTENT — Redesigned 2-column layout
 *
 * Architecture:
 *   PageHeader  — breadcrumb, title, primary CTA, PDF link
 *   Main + Sidebar (lg) — cards on the left, contextual panel on the right
 *   Mobile bottom bar — fixed study CTA in thumb zone
 */

import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  LayoutGrid,
  List,
  Search,
  Clock,
  Calendar,
  ChevronLeft,
  Play,
  Target,
  Layers,
  BookOpen,
  MonitorPlay,
} from 'lucide-react';
import type { Deck, Card, StudyMode } from '../../services/studyService';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import { FlashcardItem } from '../Flashcard/FlashcardItem';
const CardEditorModal = lazy(() => import('./CardEditorModal').then(m => ({ default: m.CardEditorModal })));
import { cn } from '../../../../lib/utils';
import { getErrorMessage } from '../../../../utils/errorMessage';
import { DeckDetailSidebar, formatRelativeTime, DistributionBar } from './DeckDetailSidebar';

// ─── Types ──────────────────────────────────────────────────────

interface DeckDetailContentProps {
  deck: Deck;
  onBack: () => void;
  onStudy: (mode: StudyMode) => void;
  onGenerateQuiz?: () => void;
  onOpenQuizLibrary?: () => void;
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

// ─── Main component ─────────────────────────────────────────────

export const DeckDetailContent: React.FC<DeckDetailContentProps> = ({
  deck,
  onBack,
  onStudy,
  onGenerateQuiz,
  onOpenQuizLibrary,
  onExamSolver,
  onReadPdf,
  onMagicGenerate,
  onDeckUpdate,
  onDeleteDeck: _onDeleteDeck,
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
      } catch (error: unknown) {
        emitToast.error(getErrorMessage(error) || 'Errore nel salvare');
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
    } catch (error: unknown) {
      emitToast.error(getErrorMessage(error) || 'Errore');
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
        <DeckDetailSidebar
          deck={deck}
          stats={stats}
          showMoreActions={showMoreActions}
          setShowMoreActions={setShowMoreActions}
          onMagicGenerate={onMagicGenerate}
          onExamSolver={onExamSolver}
          onGenerateQuiz={onGenerateQuiz}
          onOpenQuizLibrary={onOpenQuizLibrary}
          onExport={onExport}
          onShare={onShare}
          onResetProgress={onResetProgress}
          onReadPdf={onReadPdf}
        />
      </div>

      {/* ───────── MODALS & OVERLAYS ───────── */}

      <Suspense fallback={null}>
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
      </Suspense>

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
