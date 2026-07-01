/**
 * CreateExamOnlyModal – Crea SOLO un nuovo esame universitario.
 * Flusso: nome + data (rotelle stile iOS) → submit.
 * Data proposta: 10 del mese tra 3 mesi (convenzione uni).
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, Target, Calendar, GraduationCap } from 'lucide-react';
import examService from '../../services/examService';
import { WheelDatePicker } from './WheelDatePicker';

// ---------------------------------------------------------------------------
// Helpers – data proposta: 10 del mese tra 3 mesi
// ---------------------------------------------------------------------------

function getDefaultDeadline(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    d.setDate(10);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

const INPUT_BASE =
    'w-full px-4 py-3.5 bg-theme-surface border border-theme-default rounded-xl text-theme-primary placeholder:text-theme-muted focus:border-primary-500/40 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateExamOnlyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const CreateExamOnlyModal: React.FC<CreateExamOnlyModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const defaultDeadline = useMemo(() => getDefaultDeadline(), []);
    const [title, setTitle] = useState('');
    const [deadline, setDeadline] = useState(defaultDeadline);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = useCallback(() => {
        setTitle('');
        setDeadline(getDefaultDeadline());
        setError(null);
    }, []);


    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !deadline) return;

        const deadlineDate = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (deadlineDate < today) {
            setError('La data di scadenza deve essere futura');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const deadlineEnd = new Date(deadline);
            deadlineEnd.setHours(23, 59, 59, 999);

            await examService.create({
                title: title.trim(),
                deadline: deadlineEnd.toISOString(),
                description: 'Esame creato per studio con Flashcards',
            });

            resetForm();
            onClose();
            onSuccess?.();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Errore nella creazione dell'esame";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

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
                        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-theme-default bg-theme-elevated shadow-xl"
                    >
                        {/* Decorative gradient */}
                        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-primary-500/15 via-primary-500/5 to-transparent rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />

                        {/* Header */}
                        <div className="relative px-6 pt-6 pb-4 border-b border-theme-subtle">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20">
                                    <GraduationCap className="w-6 h-6 text-primary-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-theme-primary">Nuovo Esame</h2>
                                    <p className="text-sm text-theme-secondary">Aggiungi un esame universitario al tuo piano di studio</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="absolute top-6 right-6 p-2 rounded-xl bg-theme-surface hover:bg-theme-card border-theme-subtle text-theme-secondary hover:text-theme-primary transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="relative p-6 space-y-5">
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm"
                                    >
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-theme-primary">
                                    <Target className="w-4 h-4 text-primary-500" />
                                    Nome esame <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="es. Analisi Matematica I"
                                    className={INPUT_BASE}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-theme-primary">
                                    <Calendar className="w-4 h-4 text-primary-500" />
                                    Data esame <span className="text-red-500">*</span>
                                </label>
                                <WheelDatePicker
                                    value={deadline}
                                    onChange={setDeadline}
                                    className="mt-1"
                                />
                                <p className="text-xs text-theme-muted">
                                    Data proposta: 10 del mese tra 3 mesi. Ruota le colonne per scegliere giorno, mese e anno.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-5 py-3.5 rounded-xl bg-theme-surface border border-theme-default text-theme-secondary hover:bg-theme-card hover:text-theme-primary font-medium transition-all"
                                >
                                    Annulla
                                </button>
                                <motion.button
                                    type="submit"
                                    disabled={!title.trim() || !deadline || isSubmitting}
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
                                            <Check className="w-5 h-5" />
                                            Crea Esame
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
