/**
 * 🎴 CREATE DECK MODAL - Modale Premium per creazione mazzi
 * 
 * Features:
 * - Selezione esame esistente con dropdown elegante
 * - Creazione esame inline se non esistono
 * - Form validato con feedback visivo
 * - Animazioni fluide con framer-motion
 * - Design glassmorphism
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiX,
    FiPlus,
    FiTarget,
    FiChevronDown,
    FiCheck,
    FiAlertCircle,
    FiBookOpen,
    FiTag,
    FiLayers
} from 'react-icons/fi';
import type { Exam } from '../../types/exam';
import examService from '../../services/examService';
import type { CreateDeckPayload } from '../../services/studyService';

// ============================================
// TYPES
// ============================================

interface CreateDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateDeckPayload) => Promise<void>;
    onExamCreated?: () => void; // Callback quando viene creato un nuovo esame
}

interface QuickExamForm {
    title: string;
    deadline: string; // Data di scadenza in formato YYYY-MM-DD
}

// ============================================
// COMPONENT
// ============================================

export const CreateDeckModal: React.FC<CreateDeckModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    onExamCreated,
}) => {
    // Exam state
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoadingExams, setIsLoadingExams] = useState(true);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [isExamDropdownOpen, setIsExamDropdownOpen] = useState(false);

    // Quick exam creation
    const [showQuickExamForm, setShowQuickExamForm] = useState(false);
    const [quickExam, setQuickExam] = useState<QuickExamForm>({ 
        title: '',
        deadline: (() => {
            // Default: 1 mese da oggi
            const date = new Date();
            date.setMonth(date.getMonth() + 1);
            return date.toISOString().split('T')[0];
        })()
    });
    const [isCreatingExam, setIsCreatingExam] = useState(false);

    // Deck form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load exams on mount
    useEffect(() => {
        if (isOpen) {
            loadExams();
        }
    }, [isOpen]);

    const loadExams = async () => {
        try {
            setIsLoadingExams(true);
            const allExams = await examService.getAll();
            const activeExams = allExams.filter(e => e.status === 'active');
            setExams(activeExams);
            
            if (activeExams.length === 1) {
                setSelectedExamId(activeExams[0].id);
            }
        } catch (err) {
            console.error('Failed to load exams:', err);
        } finally {
            setIsLoadingExams(false);
        }
    };

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

            setExams(prev => [...prev, newExam]);
            setSelectedExamId(newExam.id);
            setShowQuickExamForm(false);
            setQuickExam({ 
                title: '',
                deadline: (() => {
                    const date = new Date();
                    date.setMonth(date.getMonth() + 1);
                    return date.toISOString().split('T')[0];
                })()
            });

            // Notifica che è stato creato un nuovo esame per refresh automatico
            if (onExamCreated) {
                onExamCreated();
            }
        } catch (err: any) {
            setError(err.message || 'Errore nella creazione dell\'esame');
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
                description: description.trim() || undefined,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            });
            
            // Reset form
            resetForm();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Errore nella creazione del mazzo');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setTags('');
        setSelectedExamId('');
        setShowQuickExamForm(false);
        setQuickExam({ 
            title: '',
            deadline: (() => {
                const date = new Date();
                date.setMonth(date.getMonth() + 1);
                return date.toISOString().split('T')[0];
            })()
        });
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const selectedExam = exams.find(g => g.id === selectedExamId);

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
                                    <h2 className="text-xl font-bold text-theme-primary">Nuovo Mazzo</h2>
                                    <p className="text-sm text-theme-secondary">Crea un set di flashcards per studiare in modo efficace</p>
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
                        <form onSubmit={handleSubmit} className="relative p-6 space-y-5">
                            {/* Error Alert */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm"
                                    >
                                        <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Exam Selection */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-theme-primary">
                                    <FiTarget className="w-4 h-4 text-theme-secondary" />
                                    Esame associato
                                </label>
                                <p className="text-xs text-theme-muted">
                                    Associa il mazzo a un esame per organizzare le carte e tracciare i progressi.
                                </p>

                                {isLoadingExams ? (
                                    <div className="h-14 rounded-xl bg-theme-surface border border-theme-subtle animate-pulse" />
                                ) : (
                                    <div className="relative">
                                        {/* Custom Dropdown */}
                                        <button
                                            type="button"
                                            onClick={() => setIsExamDropdownOpen(!isExamDropdownOpen)}
                                            className={`
                                                w-full px-4 py-3.5 rounded-xl text-left transition-all flex items-center justify-between border
                                                ${selectedExam
                                                    ? 'bg-primary-500/10 border-primary-500/30 text-theme-primary'
                                                    : 'bg-theme-surface border-theme-default text-theme-muted'
                                                }
                                                hover:border-primary-500/40 focus:outline-none focus:ring-2 focus:ring-primary-500/20
                                            `}
                                        >
                                            <span className="truncate">
                                                {selectedExam ? selectedExam.title : 'Seleziona un esame...'}
                                            </span>
                                            <FiChevronDown className={`w-5 h-5 text-theme-secondary transition-transform ${isExamDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Dropdown Menu */}
                                        <AnimatePresence>
                                            {isExamDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute z-10 w-full mt-2 py-2 rounded-xl border border-theme-default bg-theme-elevated shadow-xl overflow-hidden"
                                                >
                                                    {exams.length > 0 ? (
                                                        <div className="max-h-48 overflow-y-auto">
                                                            {exams.map(exam => (
                                                                <button
                                                                    key={exam.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedExamId(exam.id);
                                                                        setIsExamDropdownOpen(false);
                                                                    }}
                                                                    className={`
                                                                        w-full px-4 py-3 text-left flex items-center gap-3 transition-colors
                                                                        ${selectedExamId === exam.id
                                                                            ? 'bg-primary-500/15 text-theme-primary'
                                                                            : 'text-theme-secondary hover:bg-theme-surface'
                                                                        }
                                                                    `}
                                                                >
                                                                    <FiTarget className={`w-4 h-4 ${selectedExamId === exam.id ? 'text-primary-500' : 'text-theme-muted'}`} />
                                                                    <span className="flex-1 truncate">{exam.title}</span>
                                                                    {selectedExamId === exam.id && (
                                                                        <FiCheck className="w-4 h-4 text-primary-500" />
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="px-4 py-6 text-center text-theme-muted text-sm">
                                                            <FiTarget className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                            Nessun esame trovato
                                                        </div>
                                                    )}

                                                    {/* Create Exam Button */}
                                                    <div className="border-t border-theme-subtle mt-2 pt-2 px-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowQuickExamForm(true);
                                                                setIsExamDropdownOpen(false);
                                                            }}
                                                            className="w-full px-4 py-3 rounded-lg flex items-center gap-3 text-primary-500 hover:bg-primary-500/10 transition-colors text-sm font-medium"
                                                        >
                                                            <FiPlus className="w-4 h-4" />
                                                            Crea nuovo Esame
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Quick Exam Creation Form */}
                                <AnimatePresence>
                                    {showQuickExamForm && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-3 p-4 rounded-xl bg-primary-500/5 border border-primary-500/20 space-y-4">
                                                <p className="text-xs font-medium text-primary-500 uppercase tracking-wider">
                                                    Nuovo Esame
                                                </p>
                                                
                                                {/* Nome Esame */}
                                                <div className="space-y-2">
                                                    <label className="text-xs text-theme-secondary font-medium">
                                                        Nome Esame
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={quickExam.title}
                                                        onChange={e => setQuickExam({ ...quickExam, title: e.target.value })}
                                                        placeholder="es. Analisi Matematica I"
                                                        className="w-full px-3 py-2.5 bg-theme-surface border border-theme-default rounded-lg text-theme-primary placeholder:text-theme-muted text-sm focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                                                        autoFocus
                                                    />
                                                </div>

                                                {/* Data di Scadenza */}
                                                <div className="space-y-2">
                                                    <label className="text-xs text-theme-secondary font-medium">
                                                        Data Esame <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={quickExam.deadline}
                                                        onChange={e => setQuickExam({ ...quickExam, deadline: e.target.value })}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        className="w-full px-3 py-2.5 bg-theme-surface border border-theme-default rounded-lg text-theme-primary text-sm focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all [color-scheme:dark]"
                                                    />
                                                    <p className="text-xs text-theme-muted">
                                                        Seleziona la data del tuo esame
                                                    </p>
                                                </div>

                                                {/* Error Message */}
                                                {error && error.includes('scadenza') && (
                                                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                                                        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 pt-2">
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
                                                        Crea Esame
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowQuickExamForm(false);
                                                            setError(null);
                                                            setQuickExam({ 
                                                                title: '',
                                                                deadline: (() => {
                                                                    const date = new Date();
                                                                    date.setMonth(date.getMonth() + 1);
                                                                    return date.toISOString().split('T')[0];
                                                                })()
                                                            });
                                                        }}
                                                        className="px-4 py-2.5 rounded-lg bg-theme-surface border border-theme-default text-theme-secondary text-sm font-medium hover:bg-theme-card transition-colors"
                                                    >
                                                        Annulla
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Deck Title */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-theme-primary">
                                    <FiBookOpen className="w-4 h-4 text-theme-secondary" />
                                    Nome del Mazzo
                                    <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-theme-muted">
                                    Un titolo breve e riconoscibile per trovare subito il mazzo (es. argomento o materia).
                                </p>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="es. Vocabolario JavaScript"
                                    className="w-full px-4 py-3.5 bg-theme-surface border border-theme-default rounded-xl text-theme-primary placeholder:text-theme-muted focus:border-primary-500/40 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-theme-primary">
                                    Descrizione (opzionale)
                                </label>
                                <p className="text-xs text-theme-muted">
                                    Puoi aggiungere una breve descrizione per ricordare l’obiettivo del mazzo.
                                </p>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Aggiungi una descrizione..."
                                    rows={2}
                                    className="w-full px-4 py-3 bg-theme-surface border border-theme-default rounded-xl text-theme-primary placeholder:text-theme-muted focus:border-primary-500/40 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                                />
                            </div>

                            {/* Tags */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-theme-primary">
                                    <FiTag className="w-4 h-4 text-theme-secondary" />
                                    Tags (opzionale)
                                </label>
                                <p className="text-xs text-theme-muted">
                                    Inserisci parole chiave separate da virgola per filtrare e cercare i mazzi più velocemente.
                                </p>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                    placeholder="javascript, react, hooks (separati da virgola)"
                                    className="w-full px-4 py-3 bg-theme-surface border border-theme-default rounded-xl text-theme-primary placeholder:text-theme-muted focus:border-primary-500/40 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
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
