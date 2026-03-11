/**
 * DECK DETAIL CONTENT v2 - Full Width Professional Layout
 * 
 * Layout a 3 colonne:
 * - Sidebar sinistra: Statistiche e info deck (sticky)
 * - Area centrale: Griglia card + toolbar
 * - Sidebar destra: Timeline attività e suggerimenti AI
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
  Filter,
  Clock,
  TrendingUp,
  Calendar,
  MoreVertical,
  ChevronLeft,
  Play,
  Target,
  Layers,
  Brain,
  FileText,
} from 'lucide-react';
import type { Deck, Card, SavedQuizSnapshot, StudyMode } from '../../services/studyService';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import { FlashcardItem } from '../Flashcard/FlashcardItem';
import { CardEditorModal } from './CardEditorModal';
import { cn } from '../../../../lib/utils';

// ============================================
// HELPERS
// ============================================

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

// ============================================
// TYPES
// ============================================

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

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  subvalue?: string;
  icon: React.ElementType;
  color: string;
  delay?: number;
}

const StatCard = ({ label, value, subvalue, icon: Icon, color, delay = 0 }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-theme-surface border border-theme-default rounded-xl p-4 hover:border-theme-strong transition-colors"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-theme-muted uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-theme-primary">{value}</p>
        {subvalue && <p className="text-xs text-theme-secondary mt-0.5">{subvalue}</p>}
      </div>
      <div className={cn("p-2 rounded-lg", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </motion.div>
);

// ============================================
// PROGRESS BAR COMPONENT
// ============================================

const DistributionBar = ({ 
  new: newCount, 
  learning, 
  review, 
  mastered, 
  total 
}: { 
  new: number; 
  learning: number; 
  review: number; 
  mastered: number; 
  total: number;
}) => {
  const items = [
    { count: newCount, color: 'bg-blue-500', label: 'Nuove' },
    { count: learning, color: 'bg-amber-500', label: 'In studio' },
    { count: review, color: 'bg-orange-500', label: 'Ripasso' },
    { count: mastered, color: 'bg-emerald-500', label: 'Padroneggiate' },
  ].filter(i => i.count > 0);

  return (
    <div className="space-y-3">
      <div className="h-2.5 bg-theme-elevated rounded-full overflow-hidden flex border border-theme-default">
        {items.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ width: 0 }}
            animate={{ width: `${(item.count / total) * 100}%` }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className={cn("h-full", item.color)}
            title={`${item.label}: ${item.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {items.map(item => (
          <span key={item.label} className="flex items-center gap-1.5 text-theme-secondary">
            <span className={cn("w-2 h-2 rounded-full", item.color)} />
            {item.label} ({item.count})
          </span>
        ))}
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

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
  // State
  const [selectedStudyMode, setSelectedStudyMode] = useState<StudyMode>('flashcard');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem('deck-view-mode');
    // Default context-aware: lista su mobile, griglia su desktop
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    if (stored === 'grid' || stored === 'list') return stored as ViewMode;
    return isMobile ? 'list' : 'grid';
  });

  // Comunicazione one-time: DeckSettings è stato rimosso
  useEffect(() => {
    const KEY = 'deck-settings-removed-notice-shown';
    if (!localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, '1');
      // Piccolo delay per non mostrarlo mentre la pagina sta ancora caricando
      const t = window.setTimeout(() => {
        emitToast.info('Le impostazioni SRS del mazzo sono ora gestite automaticamente. Nessuna azione richiesta.', {
          title: 'Semplificazione',
          duration: 6000,
        });
      }, 800);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor State
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  // Stats calculation
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
      total, new: newCards, learning, review, mastered, 
      due: dueCount, mastery: masteryPercent
    };
  }, [deck.cards, deck.dueCount]);

  // Filter and sort cards
  const filteredCards = useMemo(() => {
    let cards = [...(deck.cards || [])];

    if (filter !== 'all') {
      cards = cards.filter(c => c.status === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      cards = cards.filter(c => 
        c.front.toLowerCase().includes(query) ||
        c.back.toLowerCase().includes(query)
      );
    }

    return cards;
  }, [deck.cards, filter, searchQuery]);

  // Handlers
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

  const handleSaveCard = useCallback(async (front: string, back: string) => {
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
  }, [editingCard, deck.id, onDeckUpdate]);

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

  const hasCards = stats.total > 0;
  const canStudy = stats.due > 0 || stats.new > 0 || stats.learning > 0 || stats.review > 0;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-4 lg:gap-6">
      
      {/* LEFT SIDEBAR - Stats & Info */}
      <aside className="lg:w-72 xl:w-80 flex-shrink-0 space-y-4">
        {/* Back Button & Title */}
        <div className="bg-theme-surface border border-theme-default rounded-xl p-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-theme-secondary hover:text-theme-primary transition-colors mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            Torna ai mazzi
          </button>
          <h1 className="text-xl font-bold text-theme-primary line-clamp-2" title={deck.title}>
            {deck.title}
          </h1>
          {deck.description && (
            <p className="text-sm text-theme-secondary mt-1 line-clamp-2">{deck.description}</p>
          )}
        </div>

        {/* Banner PDF — visibile e trovabile quando il deck ha un documento */}
        {onReadPdf && deck.pdfUrl && (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onReadPdf}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/25 hover:border-blue-500/40 transition-all text-left"
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-theme-primary">Apri PDF</p>
              <p className="text-xs text-theme-muted truncate">Leggi e sottolinea il documento</p>
            </div>
          </motion.button>
        )}

        {/* Stats essenziali — versione compatta visible su mobile, nascosta su desktop */}
        <div className="lg:hidden flex items-center gap-3 px-1 py-0.5 flex-wrap text-sm text-theme-secondary">
          <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" />{stats.total} carte</span>
          {stats.due > 0 && <span className="flex items-center gap-1 text-orange-500"><Clock className="w-3.5 h-3.5" />{stats.due} oggi</span>}
          <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" />{stats.mastery}%</span>
        </div>

        {/* Stats Grid — solo desktop */}
        <div className="hidden lg:grid grid-cols-1 gap-3">
          <StatCard
            label="Carte Totali"
            value={stats.total}
            icon={Layers}
            color="bg-blue-500"
            delay={0}
          />
          <StatCard
            label="Da Studiare"
            value={stats.due}
            subvalue="oggi"
            icon={Clock}
            color={stats.due > 0 ? "bg-orange-500" : "bg-slate-500"}
            delay={0.1}
          />
          <StatCard
            label="Padronanza"
            value={`${stats.mastery}%`}
            icon={Target}
            color={stats.mastery >= 80 ? "bg-emerald-500" : stats.mastery >= 50 ? "bg-amber-500" : "bg-slate-500"}
            delay={0.2}
          />
          <StatCard
            label="Streak"
            value="—"
            subvalue="in arrivo"
            icon={TrendingUp}
            color="bg-slate-500"
            delay={0.3}
          />
        </div>

        {/* Distribution — solo desktop */}
        <div className="hidden lg:block bg-theme-surface border border-theme-default rounded-xl p-4">
          <h3 className="text-sm font-semibold text-theme-primary mb-3">Distribuzione</h3>
          <DistributionBar {...stats} />
        </div>

        {/* Quick Actions */}
        <div className="bg-theme-surface border border-theme-default rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-theme-primary mb-2">Azioni</h3>
          {onExport && (
            <button onClick={onExport} className="w-full flex items-center gap-2 p-2.5 rounded-lg hover:bg-theme-subtle text-sm text-theme-primary transition-colors">
              <Download className="w-4 h-4" /> Esporta
            </button>
          )}
          {onShare && (
            <button onClick={onShare} className="w-full flex items-center gap-2 p-2.5 rounded-lg hover:bg-theme-subtle text-sm text-theme-primary transition-colors">
              <Share2 className="w-4 h-4" /> Copia link
            </button>
          )}
          {onResetProgress && (
            <button onClick={onResetProgress} className="w-full flex items-center gap-2 p-2.5 rounded-lg hover:bg-theme-subtle text-sm text-orange-600 dark:text-orange-400 transition-colors">
              <RotateCcw className="w-4 h-4" /> Reset progresso
            </button>
          )}
        </div>
      </aside>

      {/* CENTER - Cards Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Toolbar */}
        <div className="bg-theme-surface border border-theme-default rounded-xl p-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
              <input
                type="text"
                placeholder="Cerca carte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-theme-base border border-theme-default text-sm text-theme-primary placeholder:text-theme-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterStatus)}
                className="px-3 py-2 rounded-lg bg-theme-base border border-theme-default text-sm text-theme-primary focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tutte ({stats.total})</option>
                <option value="new">Nuove ({stats.new})</option>
                <option value="learning">In studio ({stats.learning})</option>
                <option value="review">Ripasso ({stats.review})</option>
                <option value="mastered">Padroneggiate ({stats.mastered})</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center bg-theme-base rounded-lg border border-theme-default p-0.5">
                <button
                  onClick={() => { setViewMode('list'); localStorage.setItem('deck-view-mode', 'list'); }}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'list' ? "bg-theme-surface text-theme-primary" : "text-theme-muted hover:text-theme-primary"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setViewMode('grid'); localStorage.setItem('deck-view-mode', 'grid'); }}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'grid' ? "bg-theme-surface text-theme-primary" : "text-theme-muted hover:text-theme-primary"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Study Mode + Button — nascosto su mobile (c'è la bottom bar) */}
            <div className="hidden sm:flex items-center gap-1.5">
              <select
                value={selectedStudyMode}
                onChange={(e) => setSelectedStudyMode(e.target.value as StudyMode)}
                disabled={!canStudy}
                className="min-h-[44px] px-2.5 py-2 rounded-lg bg-theme-base border border-theme-default text-sm text-theme-primary focus:ring-2 focus:ring-primary-500 disabled:opacity-40"
                aria-label="Modalità di studio"
              >
                <option value="flashcard">Flashcard</option>
                <option value="typing">Typing</option>
                <option value="mix">Mix</option>
              </select>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onStudy(selectedStudyMode)}
                disabled={!canStudy}
                className={cn(
                  "min-h-[44px] flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold transition-all whitespace-nowrap",
                  canStudy
                    ? "bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25"
                    : "bg-theme-subtle text-theme-muted cursor-not-allowed"
                )}
              >
                <Play className="w-4 h-4" />
                Studia {stats.due > 0 && <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded">{stats.due}</span>}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Cards List - No container, free layout */}
        <div className="flex-1 overflow-auto -mx-1 px-1">
          {filteredCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-theme-surface border border-theme-default rounded-xl">
              <div className="w-16 h-16 rounded-2xl bg-theme-subtle flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-theme-muted" />
              </div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">
                {searchQuery ? 'Nessuna carta trovata' : 'Nessuna carta'}
              </h3>
              <p className="text-sm text-theme-secondary max-w-sm mb-6">
                {searchQuery ? 'Prova altri termini di ricerca' : 'Crea la tua prima carta per iniziare'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleAddCard}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Crea Carta
                </button>
              )}
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 xl:grid-cols-2 gap-4" 
                : "space-y-4"
            )}>
              <AnimatePresence mode="popLayout">
                {filteredCards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
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
        </div>
      </main>

      {/* RIGHT SIDEBAR - AI & Activity */}
      <aside className="lg:w-64 xl:w-72 flex-shrink-0 space-y-4">
        {/* AI Actions */}
        <div className="bg-gradient-to-br from-primary-500/10 to-purple-500/10 border border-primary-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-theme-primary">AI Assistant</h3>
          </div>
          
          <div className="space-y-2">
            {onMagicGenerate && (
              <button
                onClick={onMagicGenerate}
                className="w-full flex items-center gap-2 p-3 rounded-lg bg-theme-surface hover:bg-theme-surface/80 border border-theme-default hover:border-primary-500/30 transition-all text-sm text-theme-primary"
              >
                <Sparkles className="w-4 h-4 text-primary-500" />
                <span>Magic Generate</span>
              </button>
            )}
            {onExamSolver && (
              <button
                onClick={onExamSolver}
                className="w-full flex items-center gap-2 p-3 rounded-lg bg-theme-surface hover:bg-theme-surface/80 border border-theme-default hover:border-amber-500/30 transition-all text-sm text-theme-primary"
              >
                <Target className="w-4 h-4 text-amber-500" />
                <span>Exam Solver</span>
              </button>
            )}
            {onGenerateQuiz && (
              <button
                onClick={onGenerateQuiz}
                disabled={stats.total < 10}
                title={stats.total < 10 ? 'Crea almeno 10 flashcard per sbloccare il quiz' : 'Genera un quiz da questo mazzo'}
                className={`w-full flex items-center gap-2 p-3 rounded-lg border transition-all text-sm ${
                  stats.total >= 10
                    ? 'bg-theme-surface hover:bg-theme-surface/80 border-theme-default hover:border-indigo-500/30 text-theme-primary'
                    : 'bg-theme-surface/50 border-theme-default text-theme-muted cursor-not-allowed'
                }`}
              >
                <ListChecks className={`w-4 h-4 ${stats.total >= 10 ? 'text-indigo-500' : 'text-theme-muted'}`} />
                <span>Genera Quiz</span>
              </button>
            )}
          </div>
        </div>

        {/* Saved Quizzes */}
        {onRepeatSavedQuiz && (deck.savedQuizzes?.length ?? 0) > 0 && (
          <div className="bg-theme-surface border border-theme-default rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-theme-primary">Quiz Salvati</h3>
            </div>
            <div className="space-y-2">
              {(deck.savedQuizzes ?? []).slice(0, 5).map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-theme-base border border-theme-default"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-theme-primary truncate">{quiz.name || `Quiz ${quiz.questionCount} domande`}</p>
                    <p className="text-[11px] text-theme-muted mt-0.5">
                      {quiz.quizType === 'true_false' ? 'Vero/Falso' : 'Scelta multipla'} · {quiz.questionCount} dom.
                    </p>
                  </div>
                  <button
                    onClick={() => onRepeatSavedQuiz(quiz)}
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium transition-colors"
                    title="Rifai questo quiz"
                  >
                    <Play className="w-3 h-3" />
                    Rifai
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Timeline - basata su dati reali del deck */}
        {(deck.updatedAt || deck.createdAt) && (
          <div className="bg-theme-surface border border-theme-default rounded-xl p-4">
            <h3 className="text-sm font-semibold text-theme-primary mb-3">Info Mazzo</h3>
            <div className="space-y-3">
              {deck.updatedAt && (
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-theme-subtle text-blue-500">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-theme-primary">Ultimo aggiornamento</p>
                    <p className="text-xs text-theme-muted">{formatRelativeTime(deck.updatedAt)}</p>
                  </div>
                </div>
              )}
              {deck.createdAt && (
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-theme-subtle text-emerald-500">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-theme-primary">Creato</p>
                    <p className="text-xs text-theme-muted">{formatRelativeTime(deck.createdAt)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-theme-subtle text-purple-500">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-theme-primary">Carte nel mazzo</p>
                  <p className="text-xs text-theme-muted">{stats.total} totali · {stats.mastered} padroneggiate</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Study Tips */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">💡 Consiglio</h3>
          <p className="text-xs text-theme-secondary">
            Studia le carte in ripasso per mantenere la memoria a lungo termine. 
            {stats.review > 0 && ` Hai ${stats.review} carte in attesa!`}
          </p>
        </div>

        {/* Floating Add Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddCard}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold shadow-lg shadow-primary-500/30 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuova Carta
        </motion.button>
      </aside>

      {/* Card Editor Modal */}
      <CardEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingCard(null);
        }}
        frontContent={editingCard?.front || ''}
        backContent={editingCard?.back || ''}
        onSave={handleSaveCard}
        onDelete={editingCard?.id !== 'temp-new' ? () => setDeletingCardId(editingCard?.id || null) : undefined}
        title={editingCard?.id === 'temp-new' ? 'Nuova Carta' : 'Modifica Carta'}
        cardNumber={currentCardIndex !== -1 ? currentCardIndex + 1 : undefined}
        totalCards={deck.cards?.length}
        onNavigate={currentCardIndex !== -1 ? (dir) => {
          const newIndex = dir === 'prev' ? currentCardIndex - 1 : currentCardIndex + 1;
          if (newIndex >= 0 && newIndex < (deck.cards?.length || 0)) {
            setEditingCard(deck.cards![newIndex]);
          }
        } : undefined}
      />

      {/* Mobile Bottom Action Bar — visibile solo su schermi piccoli (thumb zone) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pb-safe-area-inset-bottom pt-3 pb-4 bg-theme-elevated/95 backdrop-blur-xl border-t border-theme-default">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <select
            value={selectedStudyMode}
            onChange={(e) => setSelectedStudyMode(e.target.value as StudyMode)}
            disabled={!canStudy}
            className="flex-none min-w-[108px] min-h-[44px] px-3 py-2 rounded-xl bg-theme-surface border border-theme-default text-sm text-theme-primary disabled:opacity-40"
            aria-label="Modalità di studio"
          >
            <option value="flashcard">Flashcard</option>
            <option value="typing">Typing</option>
            <option value="mix">Mix</option>
          </select>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onStudy(selectedStudyMode)}
            disabled={!canStudy}
            className={cn(
              "flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl font-semibold transition-all",
              canStudy
                ? "bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25"
                : "bg-theme-subtle text-theme-muted cursor-not-allowed"
            )}
          >
            <Play className="w-4 h-4" />
            Studia {stats.due > 0 && <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded">{stats.due}</span>}
          </motion.button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {deletingCardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-6 rounded-2xl bg-theme-surface border border-theme-default shadow-theme-lg"
          >
            <h3 className="text-lg font-bold text-theme-primary mb-2">Elimina Carta</h3>
            <p className="text-theme-secondary text-sm mb-6">
              Sei sicuro? L'azione non può essere annullata.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingCardId(null)}
                className="px-4 py-2 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteCard}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
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
