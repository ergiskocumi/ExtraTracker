/**
 * CreateDeckModal – Creazione capitolo/mazzo associato a un esame.
 *
 * Modalità:
 * - default (nessun presetExamId): flusso completo 3-step (esame + capitolo + tag)
 * - chapter-only (presetExamId fornito): salta Step 1, crea solo il capitolo associato
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiX,
    FiPlus,
    FiTarget,
    FiCheck,
    FiAlertCircle,
    FiBookOpen,
    FiTag,
    FiLayers
} from 'react-icons/fi';
import examService from '../../services/examService';
import type { CreateDeckPayload } from '../../services/studyService';
import { getErrorMessage } from '../../../../utils/errorMessage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaultDeadline(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
}

const INPUT_CLASS =
    'w-full px-4 py-3.5 bg-theme-surface border border-theme-default rounded-xl text-theme-primary placeholder:text-theme-muted focus:border-primary-500/40 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all';
const INPUT_CLASS_SM =
    'w-full px-3 py-2.5 bg-theme-surface border border-theme-default rounded-lg text-theme-primary placeholder:text-theme-muted text-sm focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateDeckPayload) => Promise<void>;
    onExamCreated?: () => void;
    /** Quando fornito, il modale opera in modalità "chapter-only": salta Step 1 */
    presetExamId?: string;
}

interface QuickExamForm {
    title: string;
    deadline: string;
}

// ============================================
// COMPONENT
// ============================================

export const CreateDeckModal: React.FC<CreateDeckModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    onExamCreated,
    presetExamId,
}) => {
    const isChapterOnly = !!presetExamId;

    const [selectedExamId, setSelectedExamId] = useState(presetExamId ?? '');
    const [showQuickExamForm, setShowQuickExamForm] = useState(!presetExamId);
    const [quickExam, setQuickExam] = useState<QuickExamForm>({
        title: '',
        deadline: getDefaultDeadline(),
    });
    const [isCreatingExam, setIsCreatingExam] = useState(false);

    const [title, setTitle] = useState('');
    const [tags, setTags] = useState('');
    const [showTagsSection, setShowTagsSection] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sincronizza lo stato quando il modale viene aperto (gestisce il cambio di presetExamId)
    useEffect(() => {
        if (isOpen) {
            setSelectedExamId(presetExamId ?? '');
            setShowQuickExamForm(!presetExamId);
        }
    }, [isOpen, presetExamId]);


    const handleCreateQuickExam = async () => {
        if (!quickExam.title.trim()) return;

        // Validazione data
        const deadlineDate = new Date(quickExam.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (deadlineDate < today) {
            setError('La data di scadenza deve essere futura');
            return;
        }

        setIsCreatingExam(true);
        setError(null);

        try {
            const deadline = new Date(quickExam.deadline);
            deadline.setHours(23, 59, 59, 999); // Fine della giornata

            const newExam = await examService.create({
                title: quickExam.title.trim(),
                deadline: deadline.toISOString(),
                description: 'Esame creato per studio con Flashcards',
            });
            setSelectedExamId(newExam.id);
            setShowQuickExamForm(false);
            setQuickExam({ title: '', deadline: getDefaultDeadline() });

            // Notifica che è stato creato un nuovo esame per refresh automatico
            if (onExamCreated) {
                onExamCreated();
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Errore nella creazione dell\'esame');
        } finally {
            setIsCreatingExam(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await onSubmit({
                examId: selectedExamId || undefined,
                title: title.trim(),
                tags: showTagsSection ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            });
            
            // Reset form
            resetForm();
            onClose();
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Errore nella creazione del mazzo');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = useCallback(() => {
        setTitle('');
        setTags('');
        setShowTagsSection(false);
        setSelectedExamId(presetExamId ?? '');
        setShowQuickExamForm(!presetExamId);
        setQuickExam({ title: '', deadline: getDefaultDeadline() });
        setError(null);
    }, [presetExamId]);

    const handleClose = () => {
        resetForm();
        onClose();
    };

    /** Solo il passo corrente è attivo (primary); gli altri restano spenti. */
    const step1Active = showQuickExamForm;
    const step2Active = !!selectedExamId && !showQuickExamForm && !showTagsSection;
    const step3Active = showTagsSection;

    // ============================================
    // RENDER
    // ============================================

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={handleClose}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-theme-overlay backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={e => e.stopPropagation()}
                        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-theme-default bg-theme-elevated shadow-xl"
                    >
                        {/* Decorative gradient (theme-safe) */}
                        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-primary-500/15 via-primary-500/5 to-transparent rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />

                        {/* Header */}
                        <div className="relative px-6 pt-6 pb-4 border-b border-theme-subtle">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20">
                                    <FiLayers className="w-6 h-6 text-primary-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-theme-primary">
                                        {isChapterOnly ? 'Nuovo Capitolo' : 'Nuovo Esame'}
                                    </h2>
                                    <p className="text-sm text-theme-secondary">
                                        {isChapterOnly
                                            ? 'Aggiungi un capitolo di flashcards a questo esame'
                                            : 'Crea un nuovo esame: aggiungi nome, data e il primo mazzo di flashcards per organizzare lo studio'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="absolute top-6 right-6 p-2 rounded-xl bg-theme-surface hover:bg-theme-card border-theme-subtle text-theme-secondary hover:text-theme-primary transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="relative p-6">
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm mb-5"
                                    >
                                        <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex flex-col relative">
                                {/* Linea verticale continua – nascosta in chapter-only (solo 1 step visibile) */}
                                {!isChapterOnly && (
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-theme-subtle z-0 pointer-events-none" />
                                )}

                                {/* Riga 1: Esame – nascosta in modalità chapter-only */}
                                {!isChapterOnly && <div className="flex items-stretch gap-4">
                                    <div className="flex flex-col items-center w-8 shrink-0 py-4 relative z-10">
                                        <div className="flex-1 min-h-2 shrink-0 w-0.5 rounded-full bg-transparent" aria-hidden />
                                        <div
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                                                step1Active
                                                    ? 'bg-primary-500 text-white keep-light-text ring-2 ring-primary-500/30'
                                                    : 'bg-theme-surface border border-theme-default text-theme-muted'
                                            }`}
                                        >
                                            1
                                        </div>
                                        <div className="flex-1 min-h-2 shrink-0 w-0.5 rounded-full bg-transparent" aria-hidden />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-2 py-4">
                                        <label className="flex items-center gap-2 text-sm font-medium text-theme-primary">
                                            <FiTarget className="w-4 h-4 text-primary-500" />
                                            Crea un nuovo esame
                                        </label>
                                        <p className="text-xs text-theme-muted">
                                            Inserisci nome e data dell’esame: il mazzo verrà associato automaticamente e potrai tracciare i progressi.
                                        </p>
                                        <AnimatePresence>
                                            {showQuickExamForm && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/20 space-y-4 mt-2">
                                                        <div className="space-y-2">
                                                            <label className="text-xs text-theme-secondary font-medium">
                                                                Nome esame <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={quickExam.title}
                                                                onChange={e => setQuickExam(prev => ({ ...prev, title: e.target.value }))}
                                                                placeholder="es. Analisi Matematica I"
                                                                className={INPUT_CLASS_SM}
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs text-theme-secondary font-medium">
                                                                Data esame <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={quickExam.deadline}
                                                                onChange={e => setQuickExam(prev => ({ ...prev, deadline: e.target.value }))}
                                                                min={new Date().toISOString().split('T')[0]}
                                                                className={`${INPUT_CLASS_SM} [color-scheme:dark]`}
                                                            />
                                                            <p className="text-xs text-theme-muted">
                                                                La data in cui sostieni l’esame: serve per organizzare scadenze e ripassi.
                                                            </p>
                                                        </div>
                                                        {error && error.includes('scadenza') && (
                                                            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                                                                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 pt-1">
                                                            <button
                                                                type="button"
                                                                onClick={handleCreateQuickExam}
                                                                disabled={!quickExam.title.trim() || !quickExam.deadline || isCreatingExam}
                                                                className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white keep-light-text text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-primary-600 transition-colors"
                                                            >
                                                                {isCreatingExam ? (
                                                                    <motion.div
                                                                        animate={{ rotate: 360 }}
                                                                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                                                    />
                                                                ) : (
                                                                    <FiCheck className="w-4 h-4" />
                                                                )}
                                                                Crea esame e continua
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setQuickExam({ title: '', deadline: getDefaultDeadline() });
                                                                    setError(null);
                                                                }}
                                                                className="px-4 py-2.5 rounded-lg bg-theme-surface border border-theme-default text-theme-secondary text-sm font-medium hover:bg-theme-card transition-colors"
                                                            >
                                                                Pulisci
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>}

                                {/* Riga 2: Nuovo Capitolo – timeline centrata sul campo nome */}
                                <div className="flex items-stretch gap-4">
                                    <div className="flex flex-col items-center w-8 shrink-0 py-4 relative z-10">
                                        <div className="flex-1 min-h-2 shrink-0 w-0.5 rounded-full bg-transparent" aria-hidden />
                                        <div
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                                                step2Active
                                                    ? 'bg-primary-500 text-white keep-light-text ring-2 ring-primary-500/30'
                                                    : 'bg-theme-surface border border-theme-default text-theme-muted'
                                            }`}
                                        >
                                            {isChapterOnly ? 1 : 2}
                                        </div>
                                        <div className="flex-1 min-h-2 shrink-0 w-0.5 rounded-full bg-transparent" aria-hidden />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-2 py-4">
                                        <label className="flex items-center gap-2 text-sm font-medium text-theme-primary">
                                            <FiBookOpen className="w-4 h-4 text-theme-secondary" />
                                            Nuovo Capitolo
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <p className="text-xs text-theme-muted">
                                            Un nome chiaro per riconoscere il capitolo tra gli altri (es. argomento).
                                        </p>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder="es. Vocabolario JavaScript"
                                            className={INPUT_CLASS}
                                        />
                                    </div>
                                </div>

                                {/* Riga 3: Tags – timeline centrata sul blocco tag */}
                                <div className="flex items-stretch gap-4">
                                    <div className="flex flex-col items-center w-8 shrink-0 py-4 relative z-10">
                                        <div className="flex-1 min-h-2 shrink-0 w-0.5 rounded-full bg-transparent" aria-hidden />
                                        <div
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                                                step3Active
                                                    ? 'bg-primary-500 text-white keep-light-text ring-2 ring-primary-500/30'
                                                    : 'bg-theme-surface border border-theme-default text-theme-muted'
                                            }`}
                                        >
                                            {isChapterOnly ? 2 : 3}
                                        </div>
                                        <div className="flex-1 min-h-2 shrink-0 w-0.5 rounded-full bg-transparent" aria-hidden />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-2 py-4">
                                        <label className="flex items-center gap-2 text-sm font-medium text-theme-primary">
                                            <FiTag className="w-4 h-4 text-theme-secondary" />
                                            Tags (opzionale)
                                        </label>
                                        {!showTagsSection ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowTagsSection(true)}
                                                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-theme-default bg-theme-surface text-theme-secondary hover:border-primary-500/40 hover:bg-primary-500/5 hover:text-primary-500 transition-colors text-sm font-medium"
                                            >
                                                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-500/15 text-primary-500">
                                                    <FiPlus className="w-4 h-4" strokeWidth={2.5} />
                                                </span>
                                                Aggiungi tag
                                            </button>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowTagsSection(false)}
                                                        className="text-xs text-theme-muted hover:text-theme-secondary"
                                                    >
                                                        Nascondi
                                                    </button>
                                                </div>
                                                <p className="text-xs text-theme-muted">
                                                    Parole chiave separate da virgola per ritrovare il mazzo in ricerca e filtri.
                                                </p>
                                                <input
                                                    type="text"
                                                    value={tags}
                                                    onChange={e => setTags(e.target.value)}
                                                    placeholder="javascript, react, hooks (separati da virgola)"
                                                    className={INPUT_CLASS}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 mt-5">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-5 py-3.5 rounded-xl bg-theme-surface border border-theme-default text-theme-secondary hover:bg-theme-card hover:text-theme-primary font-medium transition-all"
                                >
                                    Annulla
                                </button>
                                <motion.button
                                    type="submit"
                                    disabled={!title.trim() || isSubmitting}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    className="flex-1 px-5 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white keep-light-text font-semibold shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                            />
                                            Creazione...
                                        </>
                                    ) : (
                                        <>
                                            <FiPlus className="w-5 h-5" />
                                            Crea Mazzo
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
