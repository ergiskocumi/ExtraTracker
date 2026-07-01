import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import type { AddCardPayload } from '../../services/studyService';

interface AddCardModalProps {
    isOpen: boolean;
    deckId: string | null;
    deckTitle: string;
    onClose: () => void;
    onSubmit: (deckId: string, data: AddCardPayload) => Promise<void>;
}

export const AddCardModal: React.FC<AddCardModalProps> = ({ 
    isOpen, 
    deckId, 
    deckTitle, 
    onClose, 
    onSubmit 
}) => {
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!front.trim() || !back.trim() || !deckId) return;

        setIsSubmitting(true);
        try {
            await onSubmit(deckId, { front: front.trim(), back: back.trim() });
            setFront('');
            setBack('');
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && deckId && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-overlay backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-lg rounded-3xl bg-theme-elevated border border-theme-default shadow-2xl overflow-hidden"
                    >
                        <div className="px-6 py-5 border-b border-theme-default flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-theme-primary">Nuova Carta</h2>
                                <p className="text-sm text-theme-muted">{deckTitle}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl hover:bg-theme-surface-hover transition-colors"
                            >
                                <X className="w-5 h-5 text-theme-muted" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                    Fronte (Domanda)
                                </label>
                                <textarea
                                    value={front}
                                    onChange={e => setFront(e.target.value)}
                                    placeholder="Cosa vuoi memorizzare?"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-theme-surface border border-theme-default rounded-xl text-theme-primary placeholder:text-theme-muted focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                    Retro (Risposta)
                                </label>
                                <textarea
                                    value={back}
                                    onChange={e => setBack(e.target.value)}
                                    placeholder="La risposta..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-theme-surface border border-theme-default rounded-xl text-theme-primary placeholder:text-theme-muted focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-5 py-3.5 rounded-xl bg-theme-surface text-theme-secondary hover:bg-theme-surface-hover transition-all font-medium"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    disabled={!front.trim() || !back.trim() || isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-violet-500 text-white font-semibold shadow-lg shadow-violet-500/25 disabled:opacity-40 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                    {isSubmitting ? 'Aggiungendo...' : 'Aggiungi'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
