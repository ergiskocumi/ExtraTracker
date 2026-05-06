/**
 * ➕ ADD CARD MODAL - Premium Modal for Adding New Flashcards
 * ============================================================================
 * 
 * A professionally designed modal component for adding new flashcards.
 * Features glassmorphism, smooth animations, and iOS-style dark theme.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownEditor } from './MarkdownEditor.lazy';

interface AddCardModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Callback when the modal should be closed */
    onClose: () => void;
    /** Callback when the user confirms adding the card */
    onConfirm: (front: string, back: string) => void;
    /** Optional position index for display purposes */
    position?: number;
}

export const AddCardModal: React.FC<AddCardModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    position,
}) => {
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setFront('');
            setBack('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    // Handle ESC key press
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    const handleConfirm = useCallback(async () => {
        const trimmedFront = front.trim();
        const trimmedBack = back.trim();

        if (!trimmedFront || !trimmedBack) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onConfirm(trimmedFront, trimmedBack);
            onClose();
        } catch (error) {
            // Error handling is done in parent component
            console.error('Error in modal confirm:', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [front, back, onConfirm, onClose]);

    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        // Only close if clicking the backdrop itself, not the modal content
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    const canSubmit = front.trim().length > 0 && back.trim().length > 0 && !isSubmitting;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={handleBackdropClick}
                        style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(4px)',
                        }}
                    >
                        {/* Modal Content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-2xl rounded-3xl border border-white/[0.15] backdrop-blur-xl shadow-2xl"
                            style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-white">
                                        Aggiungi nuova flashcard
                                    </h2>
                                    {position !== undefined && (
                                        <p className="text-sm text-slate-400 mt-1">
                                            Posizione: {position + 1}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-95"
                                    aria-label="Chiudi"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Front/Question Input */}
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-violet-300">
                                        <span className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-400">
                                                Q
                                            </span>
                                            Domanda (Fronte)
                                        </span>
                                    </label>
                                    <MarkdownEditor
                                        value={front}
                                        onChange={setFront}
                                        placeholder="Inserisci la domanda..."
                                        autoFocus
                                        disabled={isSubmitting}
                                        onSave={handleConfirm}
                                        onCancel={onClose}
                                        toolbarVisibility="focus"
                                        size="md"
                                        minRows={4}
                                        className="space-y-2"
                                        textareaClassName="min-h-[100px] bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm text-white placeholder:text-slate-400 focus:ring-violet-500/50 focus:border-violet-500/60"
                                    />
                                </div>

                                {/* Back/Answer Input */}
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-amber-300">
                                        <span className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400">
                                                A
                                            </span>
                                            Risposta (Retro)
                                        </span>
                                    </label>
                                    <MarkdownEditor
                                        value={back}
                                        onChange={setBack}
                                        placeholder="Inserisci la risposta..."
                                        disabled={isSubmitting}
                                        onSave={handleConfirm}
                                        onCancel={onClose}
                                        toolbarVisibility="focus"
                                        size="md"
                                        minRows={5}
                                        className="space-y-2"
                                        textareaClassName="min-h-[120px] bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm text-white placeholder:text-slate-400 focus:ring-violet-500/50 focus:border-violet-500/60"
                                    />
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center gap-3 p-6 border-t border-white/[0.08]">
                                <button
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-sm text-sm font-medium text-slate-300 hover:bg-white/[0.10] hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!canSubmit}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-violet-500/20"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                            />
                                            <span>Salvataggio...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            <span>Aggiungi Card</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AddCardModal;
